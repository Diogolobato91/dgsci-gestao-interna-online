-- DGSCI: user provisioning through the existing verified-email enrollment flow.
begin;
alter table private.login_allowlist add column version integer not null default 1,
 add column updated_at timestamptz not null default now();
create table private.user_access_audit(
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 target_email text not null, action text not null check(action in ('create','update','block','unblock')),
 before_values jsonb, after_values jsonb not null, created_at timestamptz not null default now()
);
alter table private.user_access_audit enable row level security;
revoke all on private.user_access_audit from public,anon,authenticated;

create function private.require_user_manager() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(
  select 1 from public.app_members m join auth.users u on u.id=m.user_id
  join private.login_allowlist a on a.email=lower(u.email)
  where m.user_id=actor and m.enabled and a.enabled and m.role='administrator' and a.role='administrator'
   and m.sectors @> array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
   and a.sectors @> array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
 ) then raise exception 'Acesso exclusivo do superadministrador' using errcode='42501'; end if;
 return actor;
end;
$$;
revoke all on function private.require_user_manager() from public,anon,authenticated;

create function private.list_managed_users() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_user_manager();
 return coalesce((select jsonb_agg(to_jsonb(t) order by lower(t.display_name),t.email) from (
  select a.email,a.display_name,a.role,a.sectors,a.enabled,a.version,a.updated_at,
   u.id as user_id,u.email_confirmed_at,u.last_sign_in_at,
   case when not a.enabled then 'blocked' when u.id is null then 'pending_registration'
    when u.email_confirmed_at is null then 'pending_confirmation' else 'active' end as status
  from private.login_allowlist a left join auth.users u on lower(u.email)=a.email and u.deleted_at is null
 ) t),'[]'::jsonb);
end;
$$;
revoke all on function private.list_managed_users() from public,anon,authenticated;

create function private.save_managed_user(
 p_email text,p_display_name text,p_sectors text[],p_enabled boolean,p_superadmin boolean,
 p_expected_version integer default null
) returns void language plpgsql security definer set search_path='' as $$
declare
 actor uuid; target text:=lower(btrim(p_email)); clean_name text:=btrim(p_display_name);
 all_sectors constant text[]:=array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
 selected_sectors text[]; selected_role text; previous private.login_allowlist%rowtype;
 present boolean; target_id uuid; action_name text; actor_email text;
begin
 actor:=private.require_user_manager();
 perform pg_advisory_xact_lock(73425,19102026);
 actor:=private.require_user_manager();
 if target is null or length(target)>254 or target !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
  raise exception 'Informe um e-mail válido' using errcode='22023'; end if;
 if clean_name is null or length(clean_name)<2 or length(clean_name)>160 then
  raise exception 'Informe um nome entre 2 e 160 caracteres' using errcode='22023'; end if;
 if p_enabled is null or p_superadmin is null or p_sectors is null
  or cardinality(p_sectors)=0 or array_position(p_sectors,null) is not null or not p_sectors <@ all_sectors then
  raise exception 'Selecione setores válidos' using errcode='22023'; end if;
 selected_sectors:=case when p_superadmin then all_sectors else
  array(select distinct sector from unnest(p_sectors) sector order by sector) end;
 selected_role:=case when p_superadmin then 'administrator' else 'editor' end;
 select * into previous from private.login_allowlist where email=target for update;
 present:=found;
 if present and p_expected_version is null then
  raise exception 'Este e-mail já está cadastrado' using errcode='23505'; end if;
 if (present and previous.version is distinct from p_expected_version) or (not present and p_expected_version is not null) then
  raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode='40001'; end if;
 select email into actor_email from auth.users where id=actor;
 if lower(actor_email)=target and (not p_enabled or not p_superadmin) then
  raise exception 'Você não pode bloquear ou remover o próprio acesso de superadministrador' using errcode='22023'; end if;
 select id into target_id from auth.users where lower(email)=target and deleted_at is null;
 if present and previous.enabled and previous.role='administrator' and previous.sectors @> all_sectors
  and (not p_enabled or not p_superadmin) and not exists(
   select 1 from private.login_allowlist a join auth.users u on lower(u.email)=a.email
   join public.app_members m on m.user_id=u.id
   where a.email<>target and a.enabled and a.role='administrator' and a.sectors @> all_sectors
    and m.enabled and m.role='administrator' and m.sectors @> all_sectors
  ) then raise exception 'Mantenha ao menos um superadministrador com acesso' using errcode='22023'; end if;
 if not present then
  insert into private.login_allowlist(email,display_name,role,sectors,enabled)
  values(target,clean_name,selected_role,selected_sectors,p_enabled);
  action_name:='create';
 else
  update private.login_allowlist set display_name=clean_name,role=selected_role,sectors=selected_sectors,
   enabled=p_enabled,version=version+1,updated_at=now() where email=target;
  action_name:=case when previous.enabled and not p_enabled then 'block'
   when not previous.enabled and p_enabled then 'unblock' else 'update' end;
 end if;
 -- Membership is provisioned only for an already confirmed Auth account.
 -- Pending signups retain the normal email confirmation requirement.
 if target_id is not null then
  insert into public.app_members(user_id,display_name,role,sectors,enabled)
  select id,clean_name,selected_role,selected_sectors,p_enabled and email_confirmed_at is not null
   from auth.users where id=target_id
  on conflict(user_id) do update set display_name=excluded.display_name,role=excluded.role,
   sectors=excluded.sectors,enabled=excluded.enabled;
 end if;
 insert into private.user_access_audit(actor_id,target_email,action,before_values,after_values)
 values(actor,target,action_name,case when present then jsonb_build_object('name',previous.display_name,'role',previous.role,'sectors',previous.sectors,'enabled',previous.enabled) end,
  jsonb_build_object('name',clean_name,'role',selected_role,'sectors',selected_sectors,'enabled',p_enabled));
end;
$$;
revoke all on function private.save_managed_user(text,text,text[],boolean,boolean,integer) from public,anon,authenticated;

-- Enrollment and administrator changes share one transaction lock to prevent stale re-enablement.
create or replace function private.enroll_verified_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed private.login_allowlist%rowtype;
begin
 perform pg_advisory_xact_lock(73425,19102026);
 select * into allowed from private.login_allowlist where email=lower(new.email) and enabled;
 if not found or new.email_confirmed_at is null then
  update public.app_members set enabled=false where user_id=new.id;
  return new;
 end if;
 insert into public.app_members(user_id,display_name,role,sectors,enabled)
 values(new.id,allowed.display_name,allowed.role,allowed.sectors,true)
 on conflict(user_id) do update set display_name=excluded.display_name,
  role=excluded.role,sectors=excluded.sectors,enabled=true;
 return new;
end;
$$;
revoke all on function private.enroll_verified_user() from public,anon,authenticated;

-- Public endpoints are invoker wrappers; privileged operations stay private and check auth.uid().
grant usage on schema private to authenticated;
grant execute on function private.list_managed_users() to authenticated;
grant execute on function private.save_managed_user(text,text,text[],boolean,boolean,integer) to authenticated;
create function public.admin_list_users() returns jsonb
 language sql stable security invoker set search_path='' as $$ select private.list_managed_users(); $$;
create function public.admin_save_user(
 p_email text,p_display_name text,p_sectors text[],p_enabled boolean,p_superadmin boolean,
 p_expected_version integer default null
) returns void language sql security invoker set search_path='' as $$
 select private.save_managed_user(p_email,p_display_name,p_sectors,p_enabled,p_superadmin,p_expected_version);
$$;
revoke all on function public.admin_list_users() from public,anon,authenticated;
revoke all on function public.admin_save_user(text,text,text[],boolean,boolean,integer) from public,anon,authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_save_user(text,text,text[],boolean,boolean,integer) to authenticated;
commit;
