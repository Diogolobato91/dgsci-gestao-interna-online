-- Operational contact list: personal contact and functional columns are excluded.
create table public.sat_commands (
 id uuid primary key default gen_random_uuid(), source_key text unique not null,
 source_row integer not null, ordem integer not null, sat text not null,
 commander_rank text not null default '', commander_name text not null default '',
 deputy_rank text not null default '', deputy_name text not null default ''
);
create table public.ordinance_years (
 year integer primary key check (year between 1900 and 2200),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.ordinances (
 id uuid primary key default gen_random_uuid(), year integer not null references public.ordinance_years(year),
 numero text not null default '', bg text not null default '', assunto text not null default '', conclusao text not null default '',
 file_label text not null default '', file_url text not null default '' check (file_url = '' or file_url ~* '^https?://'),
 source_key text unique, source_row integer, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create index ordinances_year_idx on public.ordinances(year, source_row);
alter table public.sat_commands enable row level security;
alter table public.ordinance_years enable row level security;
alter table public.ordinances enable row level security;
revoke all on public.sat_commands,public.ordinance_years,public.ordinances from anon,authenticated;
grant select on public.sat_commands to authenticated;
grant select,insert on public.ordinance_years to authenticated;
grant select,insert,update on public.ordinances to authenticated;
create policy sat_commands_member_read on public.sat_commands for select to authenticated using (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled)
);
-- Subdiretoria owns this control. The existing six-sector administrator retains full access.
create policy ordinance_years_access on public.ordinance_years for all to authenticated using (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ('Subdiretoria'=any(m.sectors) or (m.role='administrator' and m.sectors @> array['Diretoria','Subdiretoria','ADM','Vistoria','Análise','Multas'])))
) with check (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ('Subdiretoria'=any(m.sectors) or (m.role='administrator' and m.sectors @> array['Diretoria','Subdiretoria','ADM','Vistoria','Análise','Multas'])))
);
create policy ordinances_access on public.ordinances for all to authenticated using (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ('Subdiretoria'=any(m.sectors) or (m.role='administrator' and m.sectors @> array['Diretoria','Subdiretoria','ADM','Vistoria','Análise','Multas'])))
) with check (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ('Subdiretoria'=any(m.sectors) or (m.role='administrator' and m.sectors @> array['Diretoria','Subdiretoria','ADM','Vistoria','Análise','Multas'])))
);
create function private.stamp_ordinance() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at=now(); new.updated_by=auth.uid();
 if tg_op='UPDATE' then new.version=old.version+1; end if;
 return new;
end; $$;
revoke all on function private.stamp_ordinance() from public,anon,authenticated;
create trigger stamp_ordinance before insert or update on public.ordinances for each row execute function private.stamp_ordinance();
