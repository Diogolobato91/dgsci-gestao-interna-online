begin;
update private.login_allowlist set sectors=array(select case value when 'ADM' then 'Secretaria' when 'Vistoria' then 'Vistoriador' else value end from unnest(sectors) value);
update public.app_members set sectors=array(select case value when 'ADM' then 'Secretaria' when 'Vistoria' then 'Vistoriador' else value end from unnest(sectors) value);
do $$declare p record; statement text; begin
 for p in select * from pg_policies where schemaname='public' and (coalesce(qual,'') like '%''ADM''%' or coalesce(qual,'') like '%''Vistoria''%' or coalesce(with_check,'') like '%''ADM''%' or coalesce(with_check,'') like '%''Vistoria''%') loop
 statement=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 if p.qual is not null then statement=statement||' using ('||replace(replace(p.qual,'''ADM''','''Secretaria'''),'''Vistoria''','''Vistoriador''')||')';end if;
 if p.with_check is not null then statement=statement||' with check ('||replace(replace(p.with_check,'''ADM''','''Secretaria'''),'''Vistoria''','''Vistoriador''')||')';end if;
 execute statement;
 end loop;
end$$;
alter table public.sat_commands add column version integer not null default 1, add column updated_at timestamptz not null default now(), add column updated_by uuid references auth.users(id);
create trigger stamp_sat_command before update on public.sat_commands for each row execute function private.stamp_ordinance();
create table public.sat_regions (
 id text primary key default gen_random_uuid()::text,gbm text not null check(length(trim(gbm))>0),sat text not null check(length(trim(sat))>0),municipios text not null default '',is_demo boolean not null default false,
 version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
create trigger stamp_sat_region before insert or update on public.sat_regions for each row execute function private.stamp_ordinance();
create table public.support_documents (
 id text primary key default gen_random_uuid()::text, type text not null check(type in ('model','guide','notice')),
 title text not null check(length(trim(title))>0), description text not null default '',area text not null default 'Geral', date date not null default current_date,
 format text not null default 'LEITURA', tags text[] not null default '{}',version text, file text,featured boolean not null default false,
 checklist text[],related text[] not null default '{}', sections jsonb not null default '[]' check(jsonb_typeof(sections)='array'),
 attachments jsonb not null default '[]' check(jsonb_typeof(attachments)='array'),is_demo boolean not null default false,
 revision integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
create function private.stamp_document() returns trigger language plpgsql security invoker set search_path='' as $$begin
 new.updated_at=now();new.updated_by=auth.uid();if tg_op='UPDATE' then new.revision=old.revision+1;end if;return new;end$$;
revoke all on function private.stamp_document() from public,anon,authenticated;
create trigger stamp_support_document before insert or update on public.support_documents for each row execute function private.stamp_document();
alter table public.sat_regions enable row level security;
alter table public.support_documents enable row level security;
revoke all on public.sat_regions,public.support_documents from anon,authenticated;
grant select,insert,update on public.sat_regions,public.support_documents to authenticated;
grant update on public.sat_commands to authenticated;
create policy sat_regions_read on public.sat_regions for select to authenticated using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled));
create policy support_documents_read on public.support_documents for select to authenticated using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled));
create policy sat_commands_update on public.sat_commands for update to authenticated using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria'])) with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria']));
create policy sat_regions_update on public.sat_regions for update to authenticated using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria'])) with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria']));
create policy sat_regions_insert on public.sat_regions for insert to authenticated with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Diretoria','Subdiretoria']));
create policy support_documents_update on public.support_documents for update to authenticated using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])) with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy support_documents_insert on public.support_documents for insert to authenticated with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dgsci-support','dgsci-support',false,20971520,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp','text/plain']) on conflict(id) do nothing;
create policy support_files_read on storage.objects for select to authenticated using (bucket_id='dgsci-support' and (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled)));
create policy support_files_insert on storage.objects for insert to authenticated with check (bucket_id='dgsci-support' and (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])));
create policy support_files_cleanup on storage.objects for delete to authenticated using (bucket_id='dgsci-support' and (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])));
commit;