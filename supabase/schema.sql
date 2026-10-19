-- DGSCI: dados oficiais importados e acesso por usuário/setor.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.login_allowlist (
  email text primary key check (email = lower(email)),
  display_name text not null,
  role text not null check (role in ('administrator','editor','reader')),
  sectors text[] not null,
  enabled boolean not null default true
);
alter table private.login_allowlist enable row level security;

create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('administrator','editor','reader')),
  sectors text[] not null,
  enabled boolean not null default true
);
alter table public.app_members enable row level security;
create policy members_read_self on public.app_members for select to authenticated
  using (user_id = (select auth.uid()) and enabled);

-- Trigger functions cannot be invoked as ordinary SQL/API functions.
-- Only an administrator-managed allowlist can establish membership.
create function private.check_enrollment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.login_allowlist a where a.email = lower(new.email) and a.enabled) then
    raise exception 'Cadastro não autorizado para este portal';
  end if;
  return new;
end;
$$;
create function private.enroll_verified_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed private.login_allowlist%rowtype;
begin
  select * into allowed from private.login_allowlist where email = lower(new.email) and enabled;
  if not found or new.email_confirmed_at is null then
    update public.app_members set enabled = false where user_id = new.id;
    return new;
  end if;
  insert into public.app_members(user_id, display_name, role, sectors, enabled)
    values (new.id, allowed.display_name, allowed.role, allowed.sectors, true)
    on conflict (user_id) do update set display_name = excluded.display_name,
      role = excluded.role, sectors = excluded.sectors, enabled = true;
  return new;
end;
$$;
revoke all on function private.check_enrollment() from public, anon, authenticated;
revoke all on function private.enroll_verified_user() from public, anon, authenticated;
create trigger dgsci_check_enrollment before insert on auth.users
  for each row execute function private.check_enrollment();
create trigger dgsci_enroll_verified after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.enroll_verified_user();

create table public.import_batches (
  kind text primary key check (kind in ('efetivo','diarias')),
  source_label text not null,
  imported_at timestamptz not null,
  source_digest text not null
);
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_order integer not null,
  posto_graduacao text not null,
  nome text not null,
  mf text,
  cpf text,
  data_nascimento date,
  categoria text not null check (categoria in ('Militar','Voluntário civil')),
  source_page integer,
  updated_at timestamptz not null default now()
);
create table public.authorizations (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  category text not null check (category in ('sat','dgsci')),
  source_row integer not null,
  protocolo text,
  unidade text,
  referencia text,
  destino text,
  qtd_efetivo integer,
  periodo text,
  valor_despesa numeric(14,2),
  valor_arrecadado numeric(14,2),
  status text,
  data_autorizacao text,
  observacao text,
  source_values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.authorization_balances (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_row integer not null,
  saldo_df numeric(14,2),
  informado_em text,
  despesa_sat numeric(14,2),
  despesa_dgsci numeric(14,2),
  saldo_atual numeric(14,2),
  updated_at timestamptz not null default now()
);
create index staff_nome_idx on public.staff (nome);
create index staff_mf_idx on public.staff (mf);
create index authorizations_category_idx on public.authorizations (category, source_row);
create index authorizations_protocol_idx on public.authorizations (protocolo);

alter table public.import_batches enable row level security;
alter table public.staff enable row level security;
alter table public.authorizations enable row level security;
alter table public.authorization_balances enable row level security;

create policy import_member_read on public.import_batches for select to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled));
create policy staff_sector_read on public.staff for select to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria','ADM']));
create policy staff_admin_update on public.staff for update to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.role = 'administrator' and m.sectors && array['Diretoria','Subdiretoria','ADM']))
  with check (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.role = 'administrator' and m.sectors && array['Diretoria','Subdiretoria','ADM']));
create policy authorizations_sector_read on public.authorizations for select to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria','ADM']));
create policy authorizations_admin_update on public.authorizations for update to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.role = 'administrator' and m.sectors && array['Diretoria','Subdiretoria','ADM']))
  with check (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.role = 'administrator' and m.sectors && array['Diretoria','Subdiretoria','ADM']));
create policy balances_sector_read on public.authorization_balances for select to authenticated
  using (exists(select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria','ADM']));

create function public.get_staff_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'fonte', b.source_label, 'importadoEm', b.imported_at, 'modo', 'supabase',
    'registros', coalesce((select jsonb_agg(to_jsonb(t) order by t."ordemFonte") from (
      select id, source_order as "ordemFonte", posto_graduacao as "postoGraduacao", nome, mf, cpf,
        to_char(data_nascimento,'DD/MM/YYYY') as "dataNascimento", categoria, source_page as "paginaFonte"
      from public.staff
    ) t), '[]'::jsonb)
  ) from public.import_batches b where b.kind = 'efetivo';
$$;
create function public.get_diarias_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'fonte', b.source_label, 'importadoEm', b.imported_at, 'modo', 'supabase',
    'sat', coalesce((select jsonb_agg(to_jsonb(t) order by t."linhaFonte") from (
      select id, source_row as "linhaFonte", protocolo, unidade, referencia, destino, qtd_efetivo as "qtdEfetivo",
        periodo, valor_despesa as "valorDespesa", valor_arrecadado as "valorArrecadado", status,
        data_autorizacao as "dataAutorizacao", observacao from public.authorizations where category='sat'
    ) t),'[]'::jsonb),
    'dgsci', coalesce((select jsonb_agg(to_jsonb(t) order by t."linhaFonte") from (
      select id, source_row as "linhaFonte", protocolo, unidade, referencia, destino, qtd_efetivo as "qtdEfetivo",
        periodo, valor_despesa as "valorDespesa", valor_arrecadado as "valorArrecadado", status,
        data_autorizacao as "dataAutorizacao", observacao from public.authorizations where category='dgsci'
    ) t),'[]'::jsonb),
    'saldos', coalesce((select jsonb_agg(to_jsonb(t) order by t."linhaFonte") from (
      select id, source_row as "linhaFonte", saldo_df as "saldoDF", informado_em as "informadoEm",
        despesa_sat as "despesaSAT", despesa_dgsci as "despesaDGSCI", saldo_atual as "saldoAtual"
      from public.authorization_balances
    ) t),'[]'::jsonb), 'pendentes','[]'::jsonb
  ) from public.import_batches b where b.kind = 'diarias';
$$;
revoke all on table public.app_members, public.import_batches, public.staff, public.authorizations, public.authorization_balances from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.app_members, public.import_batches, public.staff, public.authorizations, public.authorization_balances to authenticated;
grant update on public.staff, public.authorizations to authenticated;
revoke all on function public.get_staff_snapshot() from public, anon, authenticated;
revoke all on function public.get_diarias_snapshot() from public, anon, authenticated;
grant execute on function public.get_staff_snapshot(), public.get_diarias_snapshot() to authenticated;

-- Event trigger is not an API endpoint.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
