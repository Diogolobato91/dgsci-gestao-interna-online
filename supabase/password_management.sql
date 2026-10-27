-- Contato passa a ser corrigido pela Gestão de Usuários.
revoke execute on function public.update_my_contact(text,integer) from public,anon,authenticated;
revoke execute on function private.update_my_contact(text,integer) from public,anon,authenticated;

create or replace function private.prepare_password_action(p_operation text,p_target uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid;target_email text;v integer;request_id uuid:=gen_random_uuid();
begin
 if p_operation='change' then
  perform private.my_account();target_id:=actor;
 elsif p_operation='reset' then
  perform private.require_user_manager();
  if p_target is null or p_target=actor then raise exception 'Para alterar sua própria senha, utilize Minha conta.' using errcode='22023';end if;
  target_id:=p_target;
  select version into v from public.user_registrations where user_id=target_id for update;
  if v is null or p_version is null or v<>p_version then raise exception 'O cadastro mudou. Atualize a lista.' using errcode='40001';end if;
 else raise exception 'Operação inválida.' using errcode='22023';end if;
 select email into target_email from auth.users where id=target_id and deleted_at is null;
 if target_email is null then raise exception 'Conta não disponível.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('password-action:'||actor::text,0));
 if (select count(*) from private.user_access_audit where actor_id=actor and after_values->>'password_state'='requested' and created_at>now()-interval '5 minutes')>=5 then raise exception 'Aguarde alguns minutos antes de tentar novamente.' using errcode='22023';end if;
 insert into private.user_access_audit(id,actor_id,actor_email,target_email,action,after_values,notes)
 values(request_id,actor,(select email from auth.users where id=actor),target_email,'update',jsonb_build_object('password_operation',p_operation,'password_state','requested','target_user_id',target_id),'Solicitação de '||case p_operation when 'reset' then 'reset administrativo de senha' else 'alteração da própria senha' end);
 return jsonb_build_object('request_id',request_id,'target_id',target_id,'target_email',target_email);
end;$$;
revoke all on function private.prepare_password_action(text,uuid,integer) from public,anon,authenticated;
grant execute on function private.prepare_password_action(text,uuid,integer) to authenticated;
create or replace function public.prepare_password_action(p_operation text,p_target uuid default null,p_version integer default null) returns jsonb
language sql security invoker set search_path='' as $$select private.prepare_password_action(p_operation,p_target,p_version);$$;
revoke all on function public.prepare_password_action(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.prepare_password_action(text,uuid,integer) to authenticated;

create or replace function private.finish_password_action(p_request uuid,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$declare r private.user_access_audit%rowtype;begin
 if p_success is null then raise exception 'Resultado inválido.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('password-finish:'||p_request::text,0));
 select * into r from private.user_access_audit where id=p_request and after_values->>'password_state'='requested';
 if not found then raise exception 'Solicitação inválida.' using errcode='22023';end if;
 if exists(select 1 from private.user_access_audit where after_values->>'password_request_id'=p_request::text) then return;end if;
 insert into private.user_access_audit(actor_id,actor_email,target_email,action,after_values,notes)
 values(r.actor_id,r.actor_email,r.target_email,'update',jsonb_build_object('password_operation',r.after_values->>'password_operation','password_state',case when p_success then 'completed' else 'failed' end,'password_request_id',p_request),case when p_success then 'Concluído: ' else 'Não concluído: ' end||case r.after_values->>'password_operation' when 'reset' then 'reset administrativo de senha' else 'alteração da própria senha' end);
end;$$;
revoke all on function private.finish_password_action(uuid,boolean) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.finish_password_action(uuid,boolean) to service_role;
create or replace function public.finish_password_action(p_request uuid,p_success boolean) returns void
language sql security invoker set search_path='' as $$select private.finish_password_action(p_request,p_success);$$;
revoke all on function public.finish_password_action(uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_password_action(uuid,boolean) to service_role;
