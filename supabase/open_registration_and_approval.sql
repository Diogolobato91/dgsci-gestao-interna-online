-- DGSCI: Cadastro com aprovação do superadministrador e proteção de dados pessoais.
-- Compatível com dados existentes e sem exclusões ou resets.
begin;

-- 1. Tabela de solicitações de cadastro e dados cadastrais
create table if not exists public.user_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  posto_graduacao text not null,
  matricula text not null,
  cpf text not null,
  data_nascimento date not null,
  status text not null check (status in ('pending_approval', 'approved', 'rejected', 'blocked')) default 'pending_approval',
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create unique index if not exists user_registrations_email_uidx on public.user_registrations (lower(email));
create unique index if not exists user_registrations_cpf_uidx on public.user_registrations (regexp_replace(cpf, '\D', '', 'g'));
create unique index if not exists user_registrations_matricula_uidx on public.user_registrations (btrim(matricula));
create index if not exists user_registrations_status_idx on public.user_registrations (status);
create index if not exists user_registrations_user_id_idx on public.user_registrations (user_id);

-- 2. Expandir auditoria para registrar aprovação e rejeição
alter table private.user_access_audit drop constraint if exists user_access_audit_action_check;
alter table private.user_access_audit add constraint user_access_audit_action_check
  check (action in ('create','update','block','unblock','register','approve','reject'));

alter table private.user_access_audit add column if not exists actor_email text,
  add column if not exists notes text;

-- 3. Função auxiliar para validar algoritmo de CPF no PostgreSQL
create or replace function private.is_valid_cpf(raw text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  digits text := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
  sum1 integer := 0; sum2 integer := 0;
  rest1 integer; rest2 integer;
  i integer;
begin
  if length(digits) <> 11 then return false; end if;
  if digits ~ '^([0-9])\1{10}$' then return false; end if;

  for i in 1..9 loop
    sum1 := sum1 + (substring(digits from i for 1)::integer * (11 - i));
  end loop;
  rest1 := (sum1 * 10) % 11;
  if rest1 = 10 or rest1 = 11 then rest1 := 0; end if;
  if rest1 <> substring(digits from 10 for 1)::integer then return false; end if;

  for i in 1..10 loop
    sum2 := sum2 + (substring(digits from i for 1)::integer * (12 - i));
  end loop;
  rest2 := (sum2 * 10) % 11;
  if rest2 = 10 or rest2 = 11 then rest2 := 0; end if;
  if rest2 <> substring(digits from 11 for 1)::integer then return false; end if;

  return true;
end;
$$;
revoke all on function private.is_valid_cpf(text) from public, anon, authenticated;

-- 4. Função de verificação de superadministrador reutilizável
create or replace function private.is_superadmin(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.app_members m
    where m.user_id = p_user_id and m.enabled and m.role = 'administrator'
      and m.sectors @> array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
  );
$$;
revoke all on function private.is_superadmin(uuid) from public, anon, authenticated;

-- 5. Tratamento de cadastro no auth.users
create or replace function private.handle_new_user_registration() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  raw_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  clean_nome text := btrim(coalesce(raw_meta->>'nome', raw_meta->>'display_name', ''));
  clean_posto text := btrim(coalesce(raw_meta->>'posto_graduacao', ''));
  clean_matricula text := btrim(coalesce(raw_meta->>'matricula', ''));
  clean_cpf text := regexp_replace(coalesce(raw_meta->>'cpf', ''), '\D', '', 'g');
  clean_nasc date;
  allowed_ranks text[] := array['CEL','TCEL','MAJ','CAP','1º TEN','2º TEN','SUB TEN RR','SUB TEN','1º SGT','2º SGT','3º SGT','CB','SD','VC'];
begin
  -- Se foram fornecidos metadados de solicitação de cadastro
  if clean_nome <> '' or clean_cpf <> '' or clean_matricula <> '' then
    if length(clean_nome) < 2 or length(clean_nome) > 160 then
      raise exception 'Informe um nome entre 2 e 160 caracteres' using errcode = '22023';
    end if;

    if not clean_posto = any(allowed_ranks) then
      raise exception 'Selecione um posto ou graduação válido' using errcode = '22023';
    end if;

    if length(clean_matricula) < 2 or length(clean_matricula) > 50 then
      raise exception 'Informe uma matrícula funcional válida' using errcode = '22023';
    end if;

    if not private.is_valid_cpf(clean_cpf) then
      raise exception 'Informe um CPF válido' using errcode = '22023';
    end if;

    begin
      clean_nasc := (raw_meta->>'data_nascimento')::date;
      if clean_nasc is null or clean_nasc > current_date or clean_nasc < '1900-01-01'::date then
        raise exception 'Data de nascimento inválida';
      end if;
    exception when others then
      raise exception 'Data de nascimento inválida' using errcode = '22023';
    end;

    -- Validação de duplicidade sem expor dados de terceiros
    if exists (select 1 from public.user_registrations r where lower(r.email) = lower(new.email)) or
       exists (select 1 from auth.users u where lower(u.email) = lower(new.email) and u.id <> new.id) or
       exists (select 1 from public.user_registrations r where regexp_replace(r.cpf, '\D', '', 'g') = clean_cpf) or
       exists (select 1 from public.user_registrations r where btrim(r.matricula) = clean_matricula) then
      raise exception 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' using errcode = '23505';
    end if;

    -- Auto-confirmação da conta no Supabase Auth para eliminar dependência de e-mail de confirmação
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  else
    -- Fallback compatível: cadastro via allowlist prévia
    if not exists (select 1 from private.login_allowlist a where a.email = lower(new.email) and a.enabled) then
      raise exception 'Cadastro não autorizado para este portal' using errcode = '42501';
    end if;
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;

  return new;
end;
$$;
revoke all on function private.handle_new_user_registration() from public, anon, authenticated;

-- Neutralizar função legada de auto-enrollment caso haja chamadas residuais
create or replace function private.enroll_verified_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  return new;
end;
$$;
revoke all on function private.enroll_verified_user() from public, anon, authenticated;

-- Substituir trigger anterior de validação na tabela auth.users
drop trigger if exists dgsci_check_enrollment on auth.users;
create trigger dgsci_check_enrollment before insert on auth.users
  for each row execute function private.handle_new_user_registration();

-- 6. Trigger pós-criação no auth.users
create or replace function private.enroll_new_user_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  raw_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  clean_nome text := btrim(coalesce(raw_meta->>'nome', raw_meta->>'display_name', ''));
  clean_posto text := btrim(coalesce(raw_meta->>'posto_graduacao', ''));
  clean_matricula text := btrim(coalesce(raw_meta->>'matricula', ''));
  clean_cpf text := regexp_replace(coalesce(raw_meta->>'cpf', ''), '\D', '', 'g');
  clean_nasc date;
  allowed private.login_allowlist%rowtype;
begin
  perform pg_advisory_xact_lock(73425, 19102026);

  if clean_nome <> '' and clean_cpf <> '' then
    clean_nasc := (raw_meta->>'data_nascimento')::date;

    insert into public.user_registrations(
      user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status
    ) values (
      new.id, lower(new.email), clean_nome, clean_posto, clean_matricula, clean_cpf, clean_nasc, 'pending_approval'
    ) on conflict (lower(email)) do update set
      user_id = new.id,
      nome = excluded.nome,
      posto_graduacao = excluded.posto_graduacao,
      matricula = excluded.matricula,
      cpf = excluded.cpf,
      data_nascimento = excluded.data_nascimento,
      status = 'pending_approval',
      updated_at = now();

    -- Inicia no app_members desabilitado e sem setores
    insert into public.app_members(user_id, display_name, role, sectors, enabled)
    values (new.id, clean_nome, 'reader', '{}', false)
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      enabled = false;

    insert into private.user_access_audit(actor_id, target_email, action, after_values, notes)
    values (new.id, lower(new.email), 'register', jsonb_build_object('nome', clean_nome, 'status', 'pending_approval'), 'Solicitação de cadastro recebida');

  elsif exists (select 1 from private.login_allowlist where email = lower(new.email) and enabled) then
    select * into allowed from private.login_allowlist where email = lower(new.email) and enabled;
    insert into public.app_members(user_id, display_name, role, sectors, enabled)
    values (new.id, allowed.display_name, allowed.role, allowed.sectors, true)
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      role = excluded.role,
      sectors = excluded.sectors,
      enabled = true;

    insert into public.user_registrations(
      user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status, approved_at
    ) values (
      new.id, lower(new.email), allowed.display_name, 'VC', 'S/M', '00000000000', '1980-01-01'::date, 'approved', now()
    ) on conflict (lower(email)) do nothing;
  end if;

  return new;
end;
$$;
revoke all on function private.enroll_new_user_after() from public, anon, authenticated;

drop trigger if exists dgsci_enroll_verified on auth.users;
create trigger dgsci_enroll_verified after insert on auth.users
  for each row execute function private.enroll_new_user_after();

-- 7. Migração segura de contas existentes já habilitadas para user_registrations
insert into public.user_registrations(user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status, approved_at, version)
select
  u.id,
  lower(u.email),
  m.display_name,
  coalesce(s.posto_graduacao, 'VC'),
  coalesce(s.mf, 'S/M'),
  coalesce(s.cpf, '00000000000'),
  coalesce(s.data_nascimento, '1980-01-01'::date),
  case when m.enabled then 'approved' else 'blocked' end,
  now(),
  1
from public.app_members m
join auth.users u on u.id = m.user_id
left join public.staff s on lower(btrim(s.nome)) = lower(btrim(m.display_name))
where not exists (select 1 from public.user_registrations r where lower(r.email) = lower(u.email))
on conflict (lower(email)) do nothing;

-- 8. RLS em public.user_registrations: Restrita ao próprio usuário e ao superadministrador
alter table public.user_registrations enable row level security;
revoke all on public.user_registrations from public, anon, authenticated;
grant select on public.user_registrations to authenticated;

drop policy if exists reg_read_self on public.user_registrations;
create policy reg_read_self on public.user_registrations for select to authenticated
  using (user_id = (select auth.uid()) or private.is_superadmin(auth.uid()));

-- 9. Consulta de situação do próprio usuário logado (sem expor CPF/nascimento)
create or replace function public.get_my_registration_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reg record;
begin
  if actor is null then return null; end if;
  select r.nome, r.posto_graduacao, r.matricula, r.status, r.rejection_reason, r.created_at
  into reg from public.user_registrations r where r.user_id = actor;
  if not found then return null; end if;
  return jsonb_build_object(
    'nome', reg.nome,
    'posto_graduacao', reg.posto_graduacao,
    'matricula', reg.matricula,
    'status', reg.status,
    'rejection_reason', reg.rejection_reason,
    'created_at', reg.created_at
  );
end;
$$;
revoke all on function public.get_my_registration_status() from public, anon;
grant execute on function public.get_my_registration_status() to authenticated;

-- 10. Listagem completa para o Superadministrador
create or replace function private.list_managed_users() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user_manager();
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by
      case t.status when 'pending_approval' then 0 when 'approved' then 1 when 'blocked' then 2 else 3 end,
      t.created_at desc,
      lower(t.display_name)
    ) from (
      select
        coalesce(r.email, lower(u.email), a.email) as email,
        coalesce(r.nome, m.display_name, a.display_name) as display_name,
        coalesce(m.role, a.role, 'reader') as role,
        coalesce(m.sectors, a.sectors, '{}'::text[]) as sectors,
        coalesce(m.enabled, false) as enabled,
        coalesce(r.version, a.version, 1) as version,
        coalesce(r.updated_at, a.updated_at, now()) as updated_at,
        coalesce(r.created_at, u.created_at, now()) as created_at,
        u.id as user_id,
        u.last_sign_in_at,
        r.posto_graduacao,
        r.matricula,
        r.cpf,
        r.data_nascimento,
        r.rejection_reason,
        r.approved_at,
        r.rejected_at,
        case
          when r.status is not null then r.status
          when not coalesce(m.enabled, a.enabled, false) then 'blocked'
          when u.id is null then 'pending_registration'
          else 'approved'
        end as status
      from public.user_registrations r
      full outer join auth.users u on u.id = r.user_id and u.deleted_at is null
      left join public.app_members m on m.user_id = u.id
      left join private.login_allowlist a on a.email = coalesce(r.email, lower(u.email))
    ) t
  ), '[]'::jsonb);
end;
$$;

-- 11. Aprovação de cadastro pelo superadministrador (com setores obrigatórios)
create or replace function private.approve_user_registration(
  p_user_id uuid,
  p_sectors text[],
  p_superadmin boolean,
  p_expected_version integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  actor_email text;
  target_reg public.user_registrations%rowtype;
  all_sectors constant text[] := array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
  selected_sectors text[];
  selected_role text;
begin
  actor := private.require_user_manager();
  select email into actor_email from auth.users where id = actor;
  perform pg_advisory_xact_lock(73425, 19102026);
  actor := private.require_user_manager();

  if p_user_id is null then
    raise exception 'Usuário não especificado' using errcode = '22023';
  end if;

  select * into target_reg from public.user_registrations where user_id = p_user_id for update;
  if not found then
    raise exception 'Solicitação de cadastro não encontrada' using errcode = '22023';
  end if;

  if p_expected_version is not null and target_reg.version <> p_expected_version then
    raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode = '40001';
  end if;

  if p_sectors is null or cardinality(p_sectors) = 0 or array_position(p_sectors, null) is not null or not p_sectors <@ all_sectors then
    raise exception 'Selecione ao menos um setor válido para aprovar o usuário' using errcode = '22023';
  end if;

  selected_sectors := case when p_superadmin then all_sectors else
    array(select distinct sector from unnest(p_sectors) sector order by sector) end;
  selected_role := case when p_superadmin then 'administrator' else 'editor' end;

  update public.user_registrations set
    status = 'approved',
    approved_at = now(),
    approved_by = actor,
    rejection_reason = null,
    version = version + 1,
    updated_at = now()
  where id = target_reg.id;

  insert into public.app_members(user_id, display_name, role, sectors, enabled)
  values (p_user_id, target_reg.nome, selected_role, selected_sectors, true)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    sectors = excluded.sectors,
    enabled = true;

  insert into private.user_access_audit(actor_id, actor_email, target_email, action, before_values, after_values, notes)
  values (
    actor, actor_email, target_reg.email, 'approve',
    jsonb_build_object('status', target_reg.status),
    jsonb_build_object('status', 'approved', 'role', selected_role, 'sectors', selected_sectors, 'enabled', true),
    'Cadastro aprovado com atribuição de setores'
  );
end;
$$;
revoke all on function private.approve_user_registration(uuid, text[], boolean, integer) from public, anon, authenticated;

-- 12. Rejeição de cadastro pelo superadministrador (com justificativa obrigatória)
create or replace function private.reject_user_registration(
  p_user_id uuid,
  p_reason text,
  p_expected_version integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  actor_email text;
  target_reg public.user_registrations%rowtype;
  clean_reason text := btrim(coalesce(p_reason, ''));
begin
  actor := private.require_user_manager();
  select email into actor_email from auth.users where id = actor;
  perform pg_advisory_xact_lock(73425, 19102026);
  actor := private.require_user_manager();

  if p_user_id is null then
    raise exception 'Usuário não especificado' using errcode = '22023';
  end if;

  if length(clean_reason) < 3 then
    raise exception 'Informe a justificativa da rejeição' using errcode = '22023';
  end if;

  select * into target_reg from public.user_registrations where user_id = p_user_id for update;
  if not found then
    raise exception 'Solicitação de cadastro não encontrada' using errcode = '22023';
  end if;

  if p_expected_version is not null and target_reg.version <> p_expected_version then
    raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode = '40001';
  end if;

  update public.user_registrations set
    status = 'rejected',
    rejection_reason = clean_reason,
    rejected_at = now(),
    rejected_by = actor,
    version = version + 1,
    updated_at = now()
  where id = target_reg.id;

  update public.app_members set enabled = false where user_id = p_user_id;

  insert into private.user_access_audit(actor_id, actor_email, target_email, action, before_values, after_values, notes)
  values (
    actor, actor_email, target_reg.email, 'reject',
    jsonb_build_object('status', target_reg.status),
    jsonb_build_object('status', 'rejected', 'reason', clean_reason),
    clean_reason
  );
end;
$$;
revoke all on function private.reject_user_registration(uuid, text, integer) from public, anon, authenticated;

-- 13. Bloqueio / Desbloqueio preservando regras de superadministrador
create or replace function private.toggle_user_block(
  p_user_id uuid,
  p_enabled boolean,
  p_expected_version integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  actor_email text;
  target_reg public.user_registrations%rowtype;
  all_sectors constant text[] := array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
  is_target_superadmin boolean;
begin
  actor := private.require_user_manager();
  select email into actor_email from auth.users where id = actor;
  perform pg_advisory_xact_lock(73425, 19102026);
  actor := private.require_user_manager();

  if p_user_id is null then raise exception 'Usuário não especificado' using errcode = '22023'; end if;
  if actor = p_user_id and not p_enabled then
    raise exception 'Você não pode bloquear o próprio acesso de superadministrador' using errcode = '22023';
  end if;

  select * into target_reg from public.user_registrations where user_id = p_user_id for update;

  if p_expected_version is not null and target_reg.version is not null and target_reg.version <> p_expected_version then
    raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode = '40001';
  end if;

  select exists(
    select 1 from public.app_members m
    where m.user_id = p_user_id and m.enabled and m.role = 'administrator' and m.sectors @> all_sectors
  ) into is_target_superadmin;

  if not p_enabled and is_target_superadmin and not exists(
    select 1 from public.app_members m
    where m.user_id <> p_user_id and m.enabled and m.role = 'administrator' and m.sectors @> all_sectors
  ) then
    raise exception 'Mantenha ao menos um superadministrador com acesso' using errcode = '22023';
  end if;

  update public.user_registrations set
    status = case when p_enabled then 'approved' else 'blocked' end,
    version = version + 1,
    updated_at = now()
  where user_id = p_user_id;

  update public.app_members set enabled = p_enabled where user_id = p_user_id;

  insert into private.user_access_audit(actor_id, actor_email, target_email, action, before_values, after_values, notes)
  values (
    actor, actor_email, coalesce(target_reg.email, (select email from auth.users where id = p_user_id)),
    case when p_enabled then 'unblock' else 'block' end,
    jsonb_build_object('enabled', not p_enabled),
    jsonb_build_object('enabled', p_enabled),
    case when p_enabled then 'Acesso desbloqueado pelo administrador' else 'Acesso bloqueado pelo administrador' end
  );
end;
$$;
revoke all on function private.toggle_user_block(uuid, boolean, integer) from public, anon, authenticated;

-- 14. Histórico de auditoria para o Superadministrador
create or replace function private.list_user_audit(p_target_email text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user_manager();
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (
      select
        a.id,
        a.actor_id,
        coalesce(a.actor_email, u.email, 'Sistema') as actor_email,
        a.target_email,
        a.action,
        a.before_values,
        a.after_values,
        a.notes,
        a.created_at
      from private.user_access_audit a
      left join auth.users u on u.id = a.actor_id
      where (p_target_email is null or lower(a.target_email) = lower(p_target_email))
      order by a.created_at desc
      limit 200
    ) t
  ), '[]'::jsonb);
end;
$$;
revoke all on function private.list_user_audit(text) from public, anon, authenticated;

-- 15. Wrappers públicos invoker
create or replace function public.admin_approve_user(
  p_user_id uuid,
  p_sectors text[],
  p_superadmin boolean,
  p_expected_version integer default null
) returns void language sql security invoker set search_path = '' as $$
  select private.approve_user_registration(p_user_id, p_sectors, p_superadmin, p_expected_version);
$$;

create or replace function public.admin_reject_user(
  p_user_id uuid,
  p_reason text,
  p_expected_version integer default null
) returns void language sql security invoker set search_path = '' as $$
  select private.reject_user_registration(p_user_id, p_reason, p_expected_version);
$$;

create or replace function public.admin_toggle_user(
  p_user_id uuid,
  p_enabled boolean,
  p_expected_version integer default null
) returns void language sql security invoker set search_path = '' as $$
  select private.toggle_user_block(p_user_id, p_enabled, p_expected_version);
$$;

create or replace function public.admin_list_audit(p_target_email text default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.list_user_audit(p_target_email);
$$;

grant execute on function public.admin_approve_user(uuid, text[], boolean, integer) to authenticated;
grant execute on function public.admin_reject_user(uuid, text, integer) to authenticated;
grant execute on function public.admin_toggle_user(uuid, boolean, integer) to authenticated;
grant execute on function public.admin_list_audit(text) to authenticated;

commit;
