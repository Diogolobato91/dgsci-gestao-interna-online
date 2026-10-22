-- Escala de conservação e limpeza dos voluntários civis.
create or replace function private.cleaning_access(manage boolean default false) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled
 and cardinality(m.sectors)>0 and (not manage or m.sectors && array['Secretaria','Diretoria','Subdiretoria']::text[]));
$$;
revoke all on function private.cleaning_access(boolean) from public,anon,authenticated;
grant execute on function private.cleaning_access(boolean) to authenticated;
create table public.cleaning_roster (
 service_date date primary key check(service_date between '1900-01-01' and '2199-12-31'),
 assignments jsonb not null check(jsonb_typeof(assignments)='array' and jsonb_array_length(assignments)=6),
 notes text not null default '' check(length(notes)<=2000),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.cleaning_roster enable row level security;
revoke all on public.cleaning_roster from public,anon,authenticated;
grant select,insert,update on public.cleaning_roster to authenticated;
create policy cleaning_read on public.cleaning_roster for select to authenticated using ((select private.cleaning_access(false)));
create policy cleaning_insert on public.cleaning_roster for insert to authenticated with check ((select private.cleaning_access(true)));
create policy cleaning_update on public.cleaning_roster for update to authenticated using ((select private.cleaning_access(true))) with check ((select private.cleaning_access(true)));
create or replace function private.validate_cleaning_roster() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb;canonical jsonb:='[]';person public.staff%rowtype;k text;seen text[]:='{}';sid uuid;person_name text;
begin
 if not private.cleaning_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if tg_op='UPDATE' and new.service_date<>old.service_date then raise exception 'A data da escala não pode ser alterada. Use Copiar escala.' using errcode='22023';end if;
 if jsonb_typeof(new.assignments)<>'array' or jsonb_array_length(new.assignments)<>6 then raise exception 'Informe as seis atividades da escala.' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(new.assignments) loop
  k:=item->>'task';
  if k is null or not k=any(array['lav_corredor','esc_fundos','corredor_frente','corredor_fundos','lixo','sala_coronel']) or k=any(seen) then raise exception 'Atividade inválida ou repetida.' using errcode='22023';end if;
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
  canonical:=canonical||jsonb_build_array(jsonb_build_object('task',k,'staff_id',sid,'nome',person_name));
 end loop;
 new.assignments:=canonical;new.notes:=trim(new.notes);new.version:=case when tg_op='UPDATE' then old.version+1 else 1 end;
 new.updated_at:=now();new.updated_by:=(select auth.uid());return new;
end;$$;
revoke all on function private.validate_cleaning_roster() from public,anon,authenticated;
create trigger validate_cleaning_roster before insert or update on public.cleaning_roster for each row execute function private.validate_cleaning_roster();
create or replace function private.cleaning_volunteers() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not private.cleaning_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'nome',nome) order by nome) from public.staff where upper(trim(posto_graduacao))='VC'),'[]');
end;$$;
revoke all on function private.cleaning_volunteers() from public,anon,authenticated;
grant execute on function private.cleaning_volunteers() to authenticated;
create or replace function public.get_cleaning_volunteers() returns jsonb language sql stable security invoker set search_path='' as $$select private.cleaning_volunteers();$$;
revoke all on function public.get_cleaning_volunteers() from public,anon,authenticated;
grant execute on function public.get_cleaning_volunteers() to authenticated;
