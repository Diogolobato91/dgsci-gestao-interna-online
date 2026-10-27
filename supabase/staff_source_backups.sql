-- Cópias anteriores à substituição institucional do efetivo, sem acesso pelo portal.
create table if not exists private.staff_source_backups(
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default clock_timestamp(),
 source_digest text not null,
 reason text not null,
 payload jsonb not null
);
alter table private.staff_source_backups enable row level security;
revoke all on private.staff_source_backups from public,anon,authenticated;
drop policy if exists staff_source_backups_deny on private.staff_source_backups;
create policy staff_source_backups_deny on private.staff_source_backups for all to authenticated using(false) with check(false);
