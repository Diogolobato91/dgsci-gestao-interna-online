begin;
-- Protocolo financeiro: edição restrita à Subdiretoria e superadmin.
drop policy if exists authorizations_admin_update on public.authorizations;
create policy authorizations_admin_update on public.authorizations for update to authenticated
using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and (m.sectors @> array['Subdiretoria'])))
with check (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and (m.sectors @> array['Subdiretoria'])));
create or replace function private.stamp_authorization() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp(); return new; end;
$$;
revoke all on function private.stamp_authorization() from public,anon,authenticated;
drop trigger if exists authorization_updated_at on public.authorizations;
create trigger authorization_updated_at before update on public.authorizations for each row execute function private.stamp_authorization();
-- Finaliza somente após a API administrativa do Auth excluir a conta.
-- A função não exclui diretamente em auth.users nem permite chamadas do navegador.
create or replace function private.finalize_account_deletion(p_user_id uuid,p_email text,p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(73425,19102026);
 if p_actor is null or p_actor=p_user_id or not private.is_superadmin(p_actor) then
  raise exception 'Acesso exclusivo do superadministrador' using errcode='42501';
 end if;
 if p_user_id is not null then
  if not exists(select 1 from auth.users where id=p_user_id and deleted_at is not null) then
   raise exception 'Exclua a conta pelo serviço de autenticação antes de finalizar' using errcode='22023';
  end if;
  if exists(select 1 from public.app_members where user_id=p_user_id and enabled) then
   raise exception 'Bloqueie a conta antes da exclusão' using errcode='22023';
  end if;
  delete from public.user_registrations where user_id=p_user_id;
  delete from public.app_members where user_id=p_user_id;
 else
  if exists(select 1 from auth.users where lower(email)=lower(p_email) and deleted_at is null) then
   raise exception 'Conta autenticada requer exclusão pelo Auth' using errcode='22023';
  end if;
 end if;
 delete from private.login_allowlist where email=lower(p_email);
 insert into private.user_access_audit(actor_id,actor_email,target_email,action,after_values,notes)
 values(p_actor,(select email from auth.users where id=p_actor),lower(p_email),'update',jsonb_build_object('deleted',true),'Conta excluída do portal e da autenticação; histórico preservado');
end;
$$;
revoke all on function private.finalize_account_deletion(uuid,text,uuid) from public,anon,authenticated;
create or replace function public.finalize_account_deletion(p_user_id uuid,p_email text,p_actor uuid) returns void
language sql security invoker set search_path='' as $$ select private.finalize_account_deletion(p_user_id,p_email,p_actor); $$;
revoke all on function public.finalize_account_deletion(uuid,text,uuid) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.finalize_account_deletion(uuid,text,uuid) to service_role;
grant execute on function public.finalize_account_deletion(uuid,text,uuid) to service_role;
commit;
