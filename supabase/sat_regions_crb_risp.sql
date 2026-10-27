-- Classificação regional editável com as mesmas permissões das SATs.
alter table public.sat_regions add column if not exists crb text not null default '' check(length(crb)<=40);
alter table public.sat_regions add column if not exists risp text not null default '' check(length(risp)<=40);
create table if not exists private.sat_region_source_backups(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default clock_timestamp(),source_digest text not null,payload jsonb not null
);
alter table private.sat_region_source_backups enable row level security;
revoke all on private.sat_region_source_backups from public,anon,authenticated;
drop policy if exists sat_region_backup_deny on private.sat_region_source_backups;
create policy sat_region_backup_deny on private.sat_region_source_backups for all to authenticated using(false) with check(false);
