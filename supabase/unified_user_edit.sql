-- Um único salvamento transacional: qualquer falha desfaz dados e permissões.
create or replace function private.save_user_full(p_user_id uuid,p_version integer,p_details jsonb,p_sectors text[],p_enabled boolean,p_superadmin boolean) returns void
language plpgsql security definer set search_path='' as $$
declare reg public.user_registrations%rowtype;member public.app_members%rowtype;
begin
 perform private.require_user_manager();
 perform pg_advisory_xact_lock(73425,19102026);
 perform private.require_user_manager();
 if p_details is null or jsonb_typeof(p_details)<>'object' or p_enabled is null or p_superadmin is null or p_sectors is null then raise exception 'Confira os dados e permissões.' using errcode='22023';end if;
 select * into reg from public.user_registrations where user_id=p_user_id for update;
 if not found then raise exception 'Cadastro não localizado.' using errcode='22023';end if;
 select * into member from public.app_members where user_id=p_user_id;
 if reg.status not in ('approved','blocked') and (p_enabled is distinct from member.enabled or p_superadmin or p_sectors is distinct from member.sectors) then
  raise exception 'Use Aprovar ou Reavaliar para conceder acesso a este cadastro.' using errcode='22023';
 end if;
 perform private.update_personal_data(p_user_id,p_version,p_details->>'nome',p_details->>'posto',p_details->>'matricula',p_details->>'cpf',nullif(p_details->>'nascimento','')::date,p_details->>'contato');
 if reg.status in ('approved','blocked') then
  perform private.save_managed_user(reg.email,p_details->>'nome',p_sectors,p_enabled,p_superadmin,p_version+1);
 end if;
end;$$;
revoke all on function private.save_user_full(uuid,integer,jsonb,text[],boolean,boolean) from public,anon,authenticated;
grant execute on function private.save_user_full(uuid,integer,jsonb,text[],boolean,boolean) to authenticated;
create or replace function public.admin_save_user_full(p_user_id uuid,p_version integer,p_details jsonb,p_sectors text[],p_enabled boolean,p_superadmin boolean) returns void
language sql security invoker set search_path='' as $$select private.save_user_full(p_user_id,p_version,p_details,p_sectors,p_enabled,p_superadmin);$$;
revoke all on function public.admin_save_user_full(uuid,integer,jsonb,text[],boolean,boolean) from public,anon,authenticated;
grant execute on function public.admin_save_user_full(uuid,integer,jsonb,text[],boolean,boolean) to authenticated;
