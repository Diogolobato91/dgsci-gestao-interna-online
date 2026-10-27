-- Aceita o novo setor sem alterar o critério dos superadministradores já existentes.
do $$declare r record;definition text;patched integer:=0;begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in('approve_user_registration','save_managed_user') loop
  definition:=pg_get_functiondef(r.oid);
  if position('not p_sectors <@ all_sectors' in definition)>0 then
   execute replace(definition,'not p_sectors <@ all_sectors','not p_sectors <@ (all_sectors || array[''Credenciamento''])');patched:=patched+1;
  elsif position('Credenciamento' in definition)>0 then patched:=patched+1;
  end if;
 end loop;
 if patched<>2 then raise exception 'Não foi possível atualizar a validação de setores';end if;
end$$;
create table public.accreditations(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in('company','professional')),
 modality text not null check(length(btrim(modality)) between 1 and 200),
 name text not null check(length(btrim(name)) between 2 and 250),
 contact text not null default '' check(length(contact)<=300),
 region text not null default '' check(length(region)<=200),
 protocol text not null default '' check(length(protocol)<=160),
 valid_until date not null check(valid_until>='1900-01-01'),
 version integer not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid,
 updated_by_name text not null default 'Importação institucional'
);
create unique index accreditations_identity on public.accreditations(kind,lower(btrim(modality)),lower(btrim(name)),lower(btrim(protocol)));
create index accreditations_kind_validity on public.accreditations(kind,valid_until);
alter table public.accreditations enable row level security;
revoke all on public.accreditations from public,anon,authenticated;
grant select,insert,update on public.accreditations to authenticated;
create function private.can_manage_accreditations() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.app_members where user_id=(select auth.uid()) and enabled and 'Credenciamento'=any(sectors)) or private.is_superadmin((select auth.uid()));
$$;
revoke all on function private.can_manage_accreditations() from public,anon,authenticated;
grant execute on function private.can_manage_accreditations() to authenticated;
create policy accreditation_read on public.accreditations for select to authenticated using(exists(select 1 from public.app_members where user_id=(select auth.uid()) and enabled and cardinality(sectors)>0));
create policy accreditation_insert on public.accreditations for insert to authenticated with check((select private.can_manage_accreditations()));
create policy accreditation_update on public.accreditations for update to authenticated using((select private.can_manage_accreditations())) with check((select private.can_manage_accreditations()));
create function private.stamp_accreditation() returns trigger language plpgsql security definer set search_path='' as $$begin
 new.modality:=btrim(new.modality);new.name:=btrim(new.name);new.contact:=btrim(new.contact);new.region:=btrim(new.region);new.protocol:=btrim(new.protocol);
 if tg_op='UPDATE' then new.id:=old.id;new.kind:=old.kind;new.created_at:=old.created_at;new.version:=old.version+1;else new.version:=1;new.created_at:=clock_timestamp();end if;
 new.updated_at:=clock_timestamp();new.updated_by:=(select auth.uid());
 new.updated_by_name:=coalesce((select display_name from public.app_members where user_id=new.updated_by),'Importação institucional');return new;
end;$$;
revoke all on function private.stamp_accreditation() from public,anon,authenticated;
create trigger stamp_accreditation before insert or update on public.accreditations for each row execute function private.stamp_accreditation();
create trigger capture_audit_event after insert or update or delete on public.accreditations for each row execute function private.capture_audit_event();
-- Identifica o credenciamento pelo nome também no histórico geral.
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.capture_audit_event()'::regprocedure);
 execute replace(definition,'row_data->>''title'',row_data->>''nome''','row_data->>''title'',row_data->>''name'',row_data->>''nome''');
end$$;
