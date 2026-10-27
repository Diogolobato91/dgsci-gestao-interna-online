-- A fonte pode conter o mesmo protocolo com contatos/regiões/validades divergentes.
-- Impede apenas duplicatas idênticas nos seis campos; divergências são preservadas.
drop index if exists public.accreditations_identity;
create unique index accreditations_identity on public.accreditations(kind,md5(lower(btrim(modality))||chr(31)||lower(btrim(name))||chr(31)||lower(btrim(contact))||chr(31)||lower(btrim(region))||chr(31)||lower(btrim(protocol))),valid_until);
create table public.accreditation_imports(
 kind text primary key check(kind in('company','professional')),
 source_author text not null,source_date date not null,
 source_rows integer not null,imported_rows integer not null,duplicates integer not null,
 source_digest text not null,imported_at timestamptz not null default clock_timestamp()
);
alter table public.accreditation_imports enable row level security;
revoke all on public.accreditation_imports from public,anon,authenticated;
grant select on public.accreditation_imports to authenticated;
create policy accreditation_imports_read on public.accreditation_imports for select to authenticated using(exists(select 1 from public.app_members where user_id=(select auth.uid()) and enabled and cardinality(sectors)>0));
