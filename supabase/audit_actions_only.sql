-- Não registra navegação, inclusive em clientes antigos. Preserva o histórico existente.
create or replace function private.log_portal_activity(p_action text,p_resource text,p_reference text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=(select auth.uid());sid text;begin
 if not exists(select 1 from public.app_members m where m.user_id=actor and m.enabled and cardinality(m.sectors)>0) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 -- Clientes antigos podem enviar navegação; ignorar sem gerar evento.
 if p_action='page_view' then return;end if;
 if p_action is null or not p_action=any(array['session_open','session_close','download_request']) or length(coalesce(p_resource,''))>120 or length(coalesce(p_reference,''))>250 then raise exception 'Atividade inválida.' using errcode='22023';end if;
 -- JWT validado pelo gateway; nenhuma identidade vem de parâmetros do solicitante.
 sid:=nullif(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')->>'session_id','');
 if p_action='session_open' and sid is null then return;end if;
 insert into private.audit_events(actor_id,actor_name,actor_email,session_id,source,resource,record_id,record_label,action)
 values(actor,(select display_name from public.app_members where user_id=actor),(select email from auth.users where id=actor),sid,'portal',coalesce(p_resource,'portal'),p_reference,left(coalesce(p_reference,p_resource,'Portal DGSCI'),180),p_action) on conflict do nothing;
end;$$;
