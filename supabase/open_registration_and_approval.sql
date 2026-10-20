-- DGSCI: Cadastro com aprovação do superadministrador, proteção de dados e sincronização consistente.
-- Compatível com dados existentes, sem exclusões, resets ou dados fictícios.
begin;

-- 1. Tabela de solicitações e dados cadastrais de usuários
create table if not exists public.user_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  posto_graduacao text,
  matricula text,
  cpf text,
  data_nascimento date,
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
create unique index if not exists user_registrations_cpf_uidx on public.user_registrations (regexp_replace(cpf, '\D', '', 'g')) where cpf is not null;
create unique index if not exists user_registrations_matricula_uidx on public.user_registrations (btrim(matricula)) where matricula is not null;
create index if not exists user_registrations_status_idx on public.user_registrations (status);
create index if not exists user_registrations_user_id_idx on public.user_registrations (user_id);

-- 2. Tabela de auditoria: expandir ações para aprovação e rejeição
alter table private.user_access_audit drop constraint if exists user_access_audit_action_check;
alter table private.user_access_audit add constraint user_access_audit_action_check
  check (action in ('create','update','block','unblock','register','approve','reject'));

alter table private.user_access_audit add column if not exists actor_email text,
  add column if not exists notes text;

-- 3. Função auxiliar imutável para validar algoritmo de CPF (módulo 11)
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

-- 4. Função de verificação unificada de superadministrador (compatível com require_user_manager)
create or replace function private.is_superadmin(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.app_members m
    join auth.users u on u.id = m.user_id
    join private.login_allowlist a on a.email = lower(u.email)
    where m.user_id = p_user_id and p_user_id is not null
      and m.enabled and a.enabled
      and m.role = 'administrator' and a.role = 'administrator'
      and m.sectors @> array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
      and a.sectors @> array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
  );
$$;
revoke all on function private.is_superadmin(uuid) from public, anon;
grant execute on function private.is_superadmin(uuid) to authenticated;

-- 5. Tratamento de cadastro no auth.users (sem manipulação direta de email_confirmed_at e sem auto-habilitação por allowlist)
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
  -- Serialização de cadastros concorrentes para proteção contra race conditions
  perform pg_advisory_xact_lock(73425, 19102026);

  -- Validação obrigatória de todos os campos da solicitação pública
  if clean_nome = '' or clean_posto = '' or clean_matricula = '' or clean_cpf = '' or raw_meta->>'data_nascimento' is null then
    raise exception 'Informe todos os dados obrigatórios para solicitação de cadastro' using errcode = '22023';
  end if;

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

  -- Validação de duplicidade sem expor dados de outros usuários
  if exists (select 1 from public.user_registrations r where lower(r.email) = lower(new.email)) or
     exists (select 1 from auth.users u where lower(u.email) = lower(new.email) and u.id <> new.id) or
     exists (select 1 from public.user_registrations r where r.cpf is not null and regexp_replace(r.cpf, '\D', '', 'g') = clean_cpf) or
     exists (select 1 from public.user_registrations r where r.matricula is not null and btrim(r.matricula) = clean_matricula) then
    raise exception 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' using errcode = '23505';
  end if;

  -- Metadados maliciosos (role, sectors, status, is_superadmin) são ignorados por design
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
  clean_nasc date := (raw_meta->>'data_nascimento')::date;
begin
  perform pg_advisory_xact_lock(73425, 19102026);

  begin
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
      rejection_reason = null,
      approved_at = null,
      approved_by = null,
      rejected_at = null,
      rejected_by = null,
      updated_at = now();
  exception when unique_violation then
    raise exception 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' using errcode = '23505';
  end;

  -- Toda nova conta pública nasce DESABILITADA, papel leitor e sem setores
  insert into public.app_members(user_id, display_name, role, sectors, enabled)
  values (new.id, clean_nome, 'reader', '{}', false)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    role = 'reader',
    sectors = '{}',
    enabled = false;

  -- Se o e-mail constava previamente na login_allowlist, desabilita a allowlist
  -- para impedir que a nova conta assuma permissões antigas antes da aprovação formal
  update private.login_allowlist set
    enabled = false,
    updated_at = now()
  where email = lower(new.email);

  insert into private.user_access_audit(actor_id, target_email, action, after_values, notes)
  values (
    new.id, lower(new.email), 'register',
    jsonb_build_object('nome', clean_nome, 'status', 'pending_approval'),
    'Solicitação de cadastro recebida (aguardando aprovação do superadmin)'
  );

  return new;
end;
$$;
revoke all on function private.enroll_new_user_after() from public, anon, authenticated;

drop trigger if exists dgsci_enroll_verified on auth.users;
create trigger dgsci_enroll_verified after insert on auth.users
  for each row execute function private.enroll_new_user_after();

-- 7. Migração segura de contas existentes já habilitadas (sem inventar CPF, matrícula, nascimento ou graduação)
insert into public.user_registrations(user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status, approved_at, version)
select
  u.id,
  lower(u.email),
  m.display_name,
  null, -- Dados não inventados; permanecem nulos para complementação
  null,
  null,
  null,
  case when m.enabled then 'approved' else 'blocked' end,
  now(),
  1
from public.app_members m
join auth.users u on u.id = m.user_id
where not exists (select 1 from public.user_registrations r where lower(r.email) = lower(u.email))
on conflict (lower(email)) do nothing;

-- 8. RLS em public.user_registrations: Restrita ao próprio usuário e ao superadministrador
alter table public.user_registrations enable row level security;
revoke all on public.user_registrations from public, anon;
grant select on public.user_registrations to authenticated;

drop policy if exists reg_read_self on public.user_registrations;
create policy reg_read_self on public.user_registrations for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_superadmin((select auth.uid()))
  );

-- 9. Consulta da situação do próprio usuário logado (sem expor CPF/nascimento)
create or replace function private.get_my_registration_status() returns jsonb
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
revoke all on function private.get_my_registration_status() from public, anon, authenticated;

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
        coalesce(m.enabled, a.enabled, false) as enabled,
        coalesce(r.version, a.version, 1) as version,
        coalesce(r.updated_at, a.updated_at, now()) as updated_at,
        coalesce(r.created_at, u.created_at, now()) as created_at,
        coalesce(u.id, r.user_id) as user_id,
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
      from (
        select distinct lower(email) as email from (
          select email from public.user_registrations
          union all
          select email from auth.users where deleted_at is null
          union all
          select email from private.login_allowlist
        ) all_emails
      ) e
      left join public.user_registrations r on lower(r.email) = e.email
      left join auth.users u on lower(u.email) = e.email and u.deleted_at is null
      left join public.app_members m on m.user_id = coalesce(u.id, r.user_id)
      left join private.login_allowlist a on a.email = e.email
    ) t
  ), '[]'::jsonb);
end;
$$;
revoke all on function private.list_managed_users() from public, anon, authenticated;

-- 11. Aprovação de cadastro pelo superadministrador (mantendo app_members e login_allowlist sincronizados)
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

  -- Proteção contra autorrebaixamento
  if actor = p_user_id and not p_superadmin then
    raise exception 'Você não pode remover o próprio acesso de superadministrador' using errcode = '22023';
  end if;

  -- Proteção contra remoção do último superadministrador ativo
  if not p_superadmin and private.is_superadmin(p_user_id) and not exists(
    select 1 from public.app_members m
    join auth.users u on u.id = m.user_id
    join private.login_allowlist a on a.email = lower(u.email)
    where m.user_id <> p_user_id and m.enabled and a.enabled
      and m.role = 'administrator' and a.role = 'administrator'
      and m.sectors @> all_sectors and a.sectors @> all_sectors
  ) then
    raise exception 'Mantenha ao menos um superadministrador com acesso' using errcode = '22023';
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

  -- 1. Atualiza user_registrations
  update public.user_registrations set
    status = 'approved',
    approved_at = now(),
    approved_by = actor,
    rejection_reason = null,
    version = version + 1,
    updated_at = now()
  where id = target_reg.id;

  -- 2. Atualiza app_members
  insert into public.app_members(user_id, display_name, role, sectors, enabled)
  values (p_user_id, target_reg.nome, selected_role, selected_sectors, true)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    sectors = excluded.sectors,
    enabled = true;

  -- 3. Sincroniza login_allowlist para consistência com require_user_manager
  insert into private.login_allowlist(email, display_name, role, sectors, enabled)
  values (target_reg.email, target_reg.nome, selected_role, selected_sectors, true)
  on conflict (email) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    sectors = excluded.sectors,
    enabled = true,
    version = private.login_allowlist.version + 1,
    updated_at = now();

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

-- 12. Rejeição de cadastro pelo superadministrador (com justificativa obrigatória e proteção contra autorrejeição)
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

  -- Proteção contra autorrejeição e rejeição de superadministrador
  if actor = p_user_id then
    raise exception 'Você não pode rejeitar o próprio cadastro de superadministrador' using errcode = '22023';
  end if;

  if private.is_superadmin(p_user_id) then
    raise exception 'Não é permitido rejeitar uma conta de superadministrador' using errcode = '22023';
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

  -- 1. Atualiza user_registrations
  update public.user_registrations set
    status = 'rejected',
    rejection_reason = clean_reason,
    rejected_at = now(),
    rejected_by = actor,
    version = version + 1,
    updated_at = now()
  where id = target_reg.id;

  -- 2. Atualiza app_members
  update public.app_members set enabled = false where user_id = p_user_id;

  -- 3. Atualiza login_allowlist se existente
  update private.login_allowlist set enabled = false where email = target_reg.email;

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

-- 13. Bloqueio / Desbloqueio (sincronizando app_members e login_allowlist com proteções)
create or replace function private.toggle_user_block(
  p_user_id uuid,
  p_enabled boolean,
  p_expected_version integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  actor_email text;
  target_reg public.user_registrations%rowtype;
  target_email text;
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

  is_target_superadmin := private.is_superadmin(p_user_id);

  if not p_enabled and is_target_superadmin and not exists(
    select 1 from public.app_members m
    join auth.users u on u.id = m.user_id
    join private.login_allowlist a on a.email = lower(u.email)
    where m.user_id <> p_user_id and m.enabled and a.enabled
      and m.role = 'administrator' and a.role = 'administrator'
      and m.sectors @> all_sectors and a.sectors @> all_sectors
  ) then
    raise exception 'Mantenha ao menos um superadministrador com acesso' using errcode = '22023';
  end if;

  select coalesce(target_reg.email, (select lower(email) from auth.users where id = p_user_id)) into target_email;

  -- 1. Atualiza user_registrations
  update public.user_registrations set
    status = case when p_enabled then 'approved' else 'blocked' end,
    version = version + 1,
    updated_at = now()
  where user_id = p_user_id;

  -- 2. Atualiza app_members
  update public.app_members set enabled = p_enabled where user_id = p_user_id;

  -- 3. Atualiza login_allowlist se existente
  if target_email is not null then
    update private.login_allowlist set enabled = p_enabled where email = target_email;
  end if;

  insert into private.user_access_audit(actor_id, actor_email, target_email, action, before_values, after_values, notes)
  values (
    actor, actor_email, coalesce(target_email, 'desconhecido'),
    case when p_enabled then 'unblock' else 'block' end,
    jsonb_build_object('enabled', not p_enabled),
    jsonb_build_object('enabled', p_enabled),
    case when p_enabled then 'Acesso desbloqueado pelo administrador' else 'Acesso bloqueado pelo administrador' end
  );
end;
$$;
revoke all on function private.toggle_user_block(uuid, boolean, integer) from public, anon, authenticated;

-- 14. Edição de dados e setores do usuário gerenciado (mantendo app_members, login_allowlist e user_registrations consistentes)
create or replace function private.save_managed_user(
  p_email text,
  p_display_name text,
  p_sectors text[],
  p_enabled boolean,
  p_superadmin boolean,
  p_expected_version integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  actor_email text;
  target text := lower(btrim(p_email));
  clean_name text := btrim(p_display_name);
  all_sectors constant text[] := array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
  selected_sectors text[];
  selected_role text;
  previous private.login_allowlist%rowtype;
  present boolean;
  target_id uuid;
  action_name text;
  target_reg public.user_registrations%rowtype;
  target_is_superadmin boolean;
begin
  actor := private.require_user_manager();
  select email into actor_email from auth.users where id = actor;
  perform pg_advisory_xact_lock(73425, 19102026);
  actor := private.require_user_manager();

  if target is null or length(target) > 254 or target !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido' using errcode = '22023';
  end if;

  if clean_name is null or length(clean_name) < 2 or length(clean_name) > 160 then
    raise exception 'Informe um nome entre 2 e 160 caracteres' using errcode = '22023';
  end if;

  if p_enabled is null or p_superadmin is null or p_sectors is null
    or cardinality(p_sectors) = 0 or array_position(p_sectors, null) is not null or not p_sectors <@ all_sectors then
    raise exception 'Selecione setores válidos' using errcode = '22023';
  end if;

  selected_sectors := case when p_superadmin then all_sectors else
    array(select distinct sector from unnest(p_sectors) sector order by sector) end;
  selected_role := case when p_superadmin then 'administrator' else 'editor' end;

  select * into previous from private.login_allowlist where email = target for update;
  present := found;

  select * into target_reg from public.user_registrations where lower(email) = target for update;

  select id into target_id from auth.users where lower(email) = target and deleted_at is null;

  if present and p_expected_version is null and target_reg.id is null then
    raise exception 'Este e-mail já está cadastrado' using errcode = '23505';
  end if;

  -- Validação de versão concorrente
  if p_expected_version is not null then
    if target_reg.version is not null and target_reg.version <> p_expected_version then
      raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode = '40001';
    elsif target_reg.version is null and present and previous.version <> p_expected_version then
      raise exception 'Cadastro alterado por outra pessoa. Atualize a lista' using errcode = '40001';
    end if;
  end if;

  -- Proteção contra autobloqueio e autorrebaixamento
  if (lower(actor_email) = target or actor = target_id) and (not p_enabled or not p_superadmin) then
    raise exception 'Você não pode bloquear ou remover o próprio acesso de superadministrador' using errcode = '22023';
  end if;

  -- Verifica se o alvo é superadmin atualmente
  target_is_superadmin := (target_id is not null and private.is_superadmin(target_id)) or
    (present and previous.enabled and previous.role = 'administrator' and previous.sectors @> all_sectors);

  -- Proteção de último superadmin
  if target_is_superadmin and (not p_enabled or not p_superadmin) and not exists(
    select 1 from public.app_members m
    join auth.users u on u.id = m.user_id
    join private.login_allowlist a on a.email = lower(u.email)
    where (target_id is null or m.user_id <> target_id)
      and a.email <> target
      and m.enabled and a.enabled
      and m.role = 'administrator' and a.role = 'administrator'
      and m.sectors @> all_sectors and a.sectors @> all_sectors
  ) then
    raise exception 'Mantenha ao menos um superadministrador com acesso' using errcode = '22023';
  end if;

  -- 1. Sincroniza login_allowlist
  if not present then
    insert into private.login_allowlist(email, display_name, role, sectors, enabled)
    values (target, clean_name, selected_role, selected_sectors, p_enabled);
    action_name := 'create';
  else
    update private.login_allowlist set
      display_name = clean_name,
      role = selected_role,
      sectors = selected_sectors,
      enabled = p_enabled,
      version = version + 1,
      updated_at = now()
    where email = target;
    action_name := case
      when previous.enabled and not p_enabled then 'block'
      when not previous.enabled and p_enabled then 'unblock'
      else 'update'
    end;
  end if;

  -- 2. Sincroniza app_members se o usuário auth existir
  if target_id is not null then
    insert into public.app_members(user_id, display_name, role, sectors, enabled)
    values (target_id, clean_name, selected_role, selected_sectors, p_enabled)
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      role = excluded.role,
      sectors = excluded.sectors,
      enabled = excluded.enabled;
  end if;

  -- 3. Sincroniza user_registrations se existir
  if target_reg.id is not null then
    update public.user_registrations set
      nome = clean_name,
      status = case when p_enabled then 'approved' else 'blocked' end,
      version = version + 1,
      updated_at = now()
    where id = target_reg.id;
  end if;

  insert into private.user_access_audit(actor_id, actor_email, target_email, action, before_values, after_values, notes)
  values (
    actor, actor_email, target, action_name,
    case when present then jsonb_build_object('name', previous.display_name, 'role', previous.role, 'sectors', previous.sectors, 'enabled', previous.enabled) end,
    jsonb_build_object('name', clean_name, 'role', selected_role, 'sectors', selected_sectors, 'enabled', p_enabled),
    'Alteração cadastral pelo superadministrador'
  );
end;
$$;
revoke all on function private.save_managed_user(text, text, text[], boolean, boolean, integer) from public, anon, authenticated;

-- 15. Histórico de auditoria para o Superadministrador
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

-- 16. Concessão explícita de execução das funções privadas para authenticated (necessária para wrappers invoker e RLS)
grant usage on schema private to authenticated;
grant execute on function private.is_superadmin(uuid) to authenticated;
grant execute on function private.get_my_registration_status() to authenticated;
grant execute on function private.list_managed_users() to authenticated;
grant execute on function private.approve_user_registration(uuid, text[], boolean, integer) to authenticated;
grant execute on function private.reject_user_registration(uuid, text, integer) to authenticated;
grant execute on function private.toggle_user_block(uuid, boolean, integer) to authenticated;
grant execute on function private.save_managed_user(text, text, text[], boolean, boolean, integer) to authenticated;
grant execute on function private.list_user_audit(text) to authenticated;

-- 17. Wrappers públicos SECURITY INVOKER (com revogação estrita de public/anon)
create or replace function public.get_my_registration_status() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.get_my_registration_status();
$$;

create or replace function public.admin_list_users() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.list_managed_users();
$$;

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

create or replace function public.admin_save_user(
  p_email text,
  p_display_name text,
  p_sectors text[],
  p_enabled boolean,
  p_superadmin boolean,
  p_expected_version integer default null
) returns void language sql security invoker set search_path = '' as $$
  select private.save_managed_user(p_email, p_display_name, p_sectors, p_enabled, p_superadmin, p_expected_version);
$$;

create or replace function public.admin_list_audit(p_target_email text default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.list_user_audit(p_target_email);
$$;

-- Revogação estrita de acesso anônimo e público
revoke all on function public.get_my_registration_status() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_approve_user(uuid, text[], boolean, integer) from public, anon;
revoke all on function public.admin_reject_user(uuid, text, integer) from public, anon;
revoke all on function public.admin_toggle_user(uuid, boolean, integer) from public, anon;
revoke all on function public.admin_save_user(text, text, text[], boolean, boolean, integer) from public, anon;
revoke all on function public.admin_list_audit(text) from public, anon;

-- Concessão apenas ao perfil authenticated
grant execute on function public.get_my_registration_status() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_approve_user(uuid, text[], boolean, integer) to authenticated;
grant execute on function public.admin_reject_user(uuid, text, integer) to authenticated;
grant execute on function public.admin_toggle_user(uuid, boolean, integer) to authenticated;
grant execute on function public.admin_save_user(text, text, text[], boolean, boolean, integer) to authenticated;
grant execute on function public.admin_list_audit(text) to authenticated;

commit;
