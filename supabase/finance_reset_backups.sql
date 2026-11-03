-- Estrutura de backup restrito; não apaga nem contém dados institucionais no código.
create table if not exists private.finance_reset_backups(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default clock_timestamp(),reason text not null,payload jsonb not null
);
alter table private.finance_reset_backups enable row level security;
revoke all on private.finance_reset_backups from public,anon,authenticated;
create policy finance_reset_backups_deny on private.finance_reset_backups for all to authenticated using(false)with check(false);
