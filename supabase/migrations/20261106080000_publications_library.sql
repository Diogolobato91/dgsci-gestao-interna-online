begin;
create table public.publications(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in('booklet','technical_instruction')),title text not null check(length(btrim(title)) between 3 and 180),description text not null default '' check(length(description)<=1000),file_path text not null unique,cover_path text not null,active boolean not null default true,sort_order integer not null default 100,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),created_by uuid references auth.users(id)
);
alter table public.publications enable row level security;
create policy publications_public_read on public.publications for select to anon,authenticated using(active or exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
create policy publications_subdirector_insert on public.publications for insert to authenticated with check(exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
create policy publications_subdirector_update on public.publications for update to authenticated using(exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors))) with check(exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
create policy publications_subdirector_delete on public.publications for delete to authenticated using(exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('publications','publications',true,52428800,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id)do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy publications_files_public_read on storage.objects for select to anon,authenticated using(bucket_id='publications');
create policy publications_files_subdirector_insert on storage.objects for insert to authenticated with check(bucket_id='publications' and exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
create policy publications_files_subdirector_update on storage.objects for update to authenticated using(bucket_id='publications' and exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
create policy publications_files_subdirector_delete on storage.objects for delete to authenticated using(bucket_id='publications' and exists(select 1 from public.app_members m where m.user_id=auth.uid() and m.enabled and 'Subdiretoria'=any(m.sectors)));
commit;
