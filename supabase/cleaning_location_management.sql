alter table public.cleaning_locations add column task_key text,add column deleted_at timestamptz,add column version integer not null default 1;
update public.cleaning_locations set task_key='local_'||id::text;
insert into public.cleaning_locations(label,task_key) values
 ('LAV. CORREDOR','lav_corredor'),('ESC. FUNDOS','esc_fundos'),('Corredor da frente','corredor_frente'),('Corredor dos fundos','corredor_fundos'),('Retirada do lixo','lixo'),('Sala do coronel','sala_coronel');
alter table public.cleaning_locations alter column task_key set not null;
create unique index cleaning_locations_task_unique on public.cleaning_locations(task_key);
create function private.stamp_cleaning_location()returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='INSERT' then new.task_key:='local_'||new.id::text;new.version:=1;new.deleted_at:=null;
 else new.id:=old.id;new.task_key:=old.task_key;new.version:=old.version+1;end if;
 new.label:=btrim(new.label);return new;
end;$$;
revoke all on function private.stamp_cleaning_location()from public,anon,authenticated;
create trigger stamp_cleaning_location before insert or update on public.cleaning_locations for each row execute function private.stamp_cleaning_location();
drop trigger audit_cleaning_locations on public.cleaning_locations;
create trigger audit_cleaning_locations after insert or update on public.cleaning_locations for each row execute function private.capture_audit_event();
alter table public.cleaning_roster drop constraint cleaning_roster_assignments_check;
alter table public.cleaning_roster add constraint cleaning_roster_assignments_check check(jsonb_typeof(assignments)='array' and jsonb_array_length(assignments) between 1 and 40);
create function private.change_cleaning_location(p_id uuid,p_version integer,p_label text,p_delete boolean)returns jsonb language plpgsql security definer set search_path='' as $$declare item public.cleaning_locations%rowtype;begin
 if not private.cleaning_access(true)then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_version is null or p_delete is null then raise exception 'Informe a versão e operação.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(73427,1);
 select * into item from public.cleaning_locations where id=p_id and deleted_at is null for update;
 if not found or item.version<>p_version then raise exception 'O local foi alterado. Atualize a escala.' using errcode='40001';end if;
 if p_delete and (select count(*)from public.cleaning_locations where deleted_at is null)<=1 then raise exception 'Mantenha pelo menos um local ativo.' using errcode='22023';end if;
 if not p_delete and (p_label is null or length(btrim(p_label))not between 2 and 100)then raise exception 'Informe um nome de 2 a 100 caracteres.' using errcode='22023';end if;
 update public.cleaning_locations set label=case when p_delete then label else btrim(p_label)end,deleted_at=case when p_delete then clock_timestamp()else null end where id=p_id returning * into item;
 return to_jsonb(item);
end;$$;
revoke all on function private.change_cleaning_location(uuid,integer,text,boolean)from public,anon,authenticated;
grant execute on function private.change_cleaning_location(uuid,integer,text,boolean)to authenticated;
create function public.change_cleaning_location(p_id uuid,p_version integer,p_label text,p_delete boolean)returns jsonb language sql security invoker set search_path='' as $$select private.change_cleaning_location(p_id,p_version,p_label,p_delete);$$;
revoke all on function public.change_cleaning_location(uuid,integer,text,boolean)from public,anon,authenticated;
grant execute on function public.change_cleaning_location(uuid,integer,text,boolean)to authenticated;
create or replace function private.validate_cleaning_roster() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb;canonical jsonb:='[]';person public.staff%rowtype;k text;seen text[]:='{}';sid uuid;person_name text;location_label text;location_deleted timestamptz;
begin
 if not private.cleaning_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if tg_op='UPDATE' and new.service_date<>old.service_date then raise exception 'A data da escala não pode ser alterada. Use Copiar escala.' using errcode='22023';end if;
 if jsonb_typeof(new.assignments)<>'array' or jsonb_array_length(new.assignments) not between 1 and 40 then raise exception 'Informe de uma a 40 atividades na escala.' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(new.assignments) loop
  k:=item->>'task';
  if k is null or k=any(seen) then raise exception 'Atividade inválida ou repetida.' using errcode='22023';end if;
  location_label:=null;
  select label,deleted_at into location_label,location_deleted from public.cleaning_locations where task_key=k or 'local_'||id::text=k;
  if not found then raise exception 'Setor/local inválido.' using errcode='22023';end if;
  if location_deleted is not null then
   if tg_op<>'UPDATE' or not exists(select 1 from jsonb_array_elements(old.assignments)a where a->>'task'=k and a->>'staff_id' is not distinct from item->>'staff_id' and a->>'nome' is not distinct from item->>'nome')then raise exception 'Este local foi excluído. Utilize um local ativo.' using errcode='22023';end if;
   select a->>'label' into location_label from jsonb_array_elements(old.assignments)a where a->>'task'=k;
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
 new.assignments:=canonical;new.notes:=trim(new.notes);new.version:=case when tg_op='UPDATE' then old.version+1 else 1 end;
 new.updated_at:=now();new.updated_by:=(select auth.uid());return new;
end;$$;
revoke all on function private.validate_cleaning_roster() from public,anon,authenticated;

