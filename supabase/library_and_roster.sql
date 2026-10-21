begin;
-- Modelos: apenas Diretoria/Subdiretoria. Comunicados mantêm Secretaria.
drop policy if exists support_documents_insert on public.support_documents;
drop policy if exists support_documents_update on public.support_documents;
drop policy if exists support_documents_read on public.support_documents;
create policy support_documents_read on public.support_documents for select to authenticated using (type in ('model','notice') and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled));
create policy support_documents_insert on public.support_documents for insert to authenticated with check (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ((type='model' and m.sectors && array['Diretoria','Subdiretoria']) or (type='notice' and m.sectors && array['Secretaria','Diretoria','Subdiretoria']))));
create policy support_documents_update on public.support_documents for update to authenticated using (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ((type='model' and m.sectors && array['Diretoria','Subdiretoria']) or (type='notice' and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])))) with check (
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and
 ((type='model' and m.sectors && array['Diretoria','Subdiretoria']) or (type='notice' and m.sectors && array['Secretaria','Diretoria','Subdiretoria']))));
-- Evita que uma alteração troque um modelo por comunicado para contornar a regra.
create or replace function private.lock_support_type() returns trigger language plpgsql set search_path='' as $$begin
 if new.type is distinct from old.type then raise exception 'O tipo do documento não pode ser alterado' using errcode='22023'; end if;return new;end;$$;
revoke all on function private.lock_support_type() from public,anon,authenticated;
drop trigger if exists lock_support_type on public.support_documents;
create trigger lock_support_type before update on public.support_documents for each row execute function private.lock_support_type();
drop policy if exists support_files_insert on storage.objects;
drop policy if exists support_files_cleanup on storage.objects;
create policy support_files_insert on storage.objects for insert to authenticated with check(bucket_id='dgsci-support' and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and (m.sectors && array['Diretoria','Subdiretoria'] or ((storage.foldername(name))[1]='notice' and m.sectors @> array['Secretaria']))));
create policy support_files_cleanup on storage.objects for delete to authenticated using(bucket_id='dgsci-support' and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and (m.sectors && array['Diretoria','Subdiretoria'] or ((storage.foldername(name))[1]='notice' and m.sectors @> array['Secretaria'] and not exists(select 1 from public.support_documents d where d.type='model' and d.attachments @> jsonb_build_array(jsonb_build_object('path',storage.objects.name)))))));
-- Substituição solicitada dos quatro modelos demonstrativos antigos.
delete from public.support_documents where type='model' and is_demo and id in ('auto-infracao','parecer-analise','encaminhamento','relatorio-vistoria');

create table if not exists public.duty_roster(
 id uuid primary key default gen_random_uuid(),
 service_date date not null,
 staff_id uuid not null references public.staff(id),
 duty_role text not null check(length(btrim(duty_role)) between 1 and 100),
 shift text not null check(shift in ('Manhã','Tarde','Integral','Plantão','Sobreaviso')),
 notes text not null default '' check(length(notes)<=2000),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 unique(service_date,staff_id,shift)
);
create index if not exists duty_roster_date_idx on public.duty_roster(service_date);
alter table public.duty_roster enable row level security;
revoke all on public.duty_roster from public,anon,authenticated;
grant select,insert,update,delete on public.duty_roster to authenticated;
create policy roster_read on public.duty_roster for select to authenticated using(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy roster_insert on public.duty_roster for insert to authenticated with check(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy roster_update on public.duty_roster for update to authenticated using(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])) with check(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy roster_delete on public.duty_roster for delete to authenticated using(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create or replace function private.stamp_roster() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=clock_timestamp();new.updated_by=auth.uid();if tg_op='UPDATE' then new.version=old.version+1;end if;return new;end;$$;
revoke all on function private.stamp_roster() from public,anon,authenticated;
create trigger stamp_duty_roster before insert or update on public.duty_roster for each row execute function private.stamp_roster();
commit;
