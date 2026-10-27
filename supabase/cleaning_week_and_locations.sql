-- Locais reutilizáveis; escala semanal usa INSERT em lote atômico, sem substituir datas.
create table public.cleaning_locations (
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(btrim(label)) between 2 and 100),
 created_at timestamptz not null default now()
);
create unique index cleaning_locations_label_unique on public.cleaning_locations(lower(btrim(label)));
alter table public.cleaning_locations enable row level security;
revoke all on public.cleaning_locations from public,anon,authenticated;
grant select,insert on public.cleaning_locations to authenticated;
create policy cleaning_locations_read on public.cleaning_locations for select to authenticated using ((select private.cleaning_access(false)));
create policy cleaning_locations_insert on public.cleaning_locations for insert to authenticated with check ((select private.cleaning_access(true)));
create trigger audit_cleaning_locations after insert on public.cleaning_locations for each row execute function private.capture_audit_event();
alter table public.cleaning_roster drop constraint cleaning_roster_assignments_check;
alter table public.cleaning_roster add constraint cleaning_roster_assignments_check check(jsonb_typeof(assignments)='array' and jsonb_array_length(assignments) between 6 and 40);
create or replace function private.validate_cleaning_roster() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb;canonical jsonb:='[]';person public.staff%rowtype;k text;seen text[]:='{}';sid uuid;person_name text;location_label text;
begin
 if not private.cleaning_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if tg_op='UPDATE' and new.service_date<>old.service_date then raise exception 'A data da escala não pode ser alterada. Use Copiar escala.' using errcode='22023';end if;
 if jsonb_typeof(new.assignments)<>'array' or jsonb_array_length(new.assignments) not between 6 and 40 then raise exception 'Informe as atividades da escala (até 40 locais).' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(new.assignments) loop
  k:=item->>'task';
  if k is null or k=any(seen) then raise exception 'Atividade inválida ou repetida.' using errcode='22023';end if;
  location_label:=null;
  if not k=any(array['lav_corredor','esc_fundos','corredor_frente','corredor_fundos','lixo','sala_coronel']) then
   select label into location_label from public.cleaning_locations where 'local_'||id::text=k;
   if not found then raise exception 'Setor/local inválido.' using errcode='22023';end if;
  end if;
  seen:=array_append(seen,k);
  sid:=nullif(item->>'staff_id','')::uuid;
  person_name:=trim(coalesce(item->>'nome',''));
  if sid is not null then
   select * into person from public.staff where id=sid;
   if not found or upper(trim(person.posto_graduacao))<>'VC' then raise exception 'Selecione um voluntário civil do efetivo.' using errcode='22023';end if;
   if exists(select 1 from public.staff_absences a where a.staff_id=sid and a.cancelled_at is null and new.service_date between a.starts_on and a.ends_on) then raise exception 'O VC selecionado está indisponível nessa data.' using errcode='22023';end if;
   person_name:=person.nome;
  end if;
  if length(person_name)>180 then raise exception 'Nome muito longo.' using errcode='22023';end if;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('task',k,'staff_id',sid,'nome',person_name,'label',location_label));
 end loop;
 if not array['lav_corredor','esc_fundos','corredor_frente','corredor_fundos','lixo','sala_coronel']::text[] <@ seen then raise exception 'As seis atividades originais devem ser mantidas.' using errcode='22023';end if;
 new.assignments:=canonical;new.notes:=trim(new.notes);new.version:=case when tg_op='UPDATE' then old.version+1 else 1 end;
 new.updated_at:=now();new.updated_by:=(select auth.uid());return new;
end;$$;
revoke all on function private.validate_cleaning_roster() from public,anon,authenticated;

-- Incluir cadastro dos locais no histórico restrito das escalas.
do $$declare definition text;begin
 select pg_get_functiondef('private.list_audit_events(text,text,uuid,text,timestamptz,timestamptz,integer)'::regprocedure) into definition;
 definition:=replace(definition,$match$'duty_roster']$match$,$replacement$'duty_roster','cleaning_locations']$replacement$);
 execute definition;
end;$$;
