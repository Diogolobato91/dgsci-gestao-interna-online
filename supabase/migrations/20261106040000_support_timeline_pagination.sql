begin;

drop function if exists public.get_support_ticket_messages(uuid);
create function public.get_support_ticket_messages(p_ticket uuid,p_before timestamptz default null,p_limit integer default 10) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;safe_limit integer:=least(greatest(coalesce(p_limit,10),1),10);begin
 select * into ticket_row from public.support_tickets where id=p_ticket;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 return coalesce((with timeline as(
  select 'message:'||sm.id::text item_key,sm.id::text id,sm.ticket_id,sm.author_kind,null::text event_action,case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))) end actor_label,sm.body,sm.created_at
  from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=p_ticket
  union all
  select 'event:'||e.id::text,null::text,e.ticket_id,'system',e.action,btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))),null::text,e.created_at
  from private.support_ticket_events e left join public.app_members am on am.user_id=e.actor_id left join auth.users au on au.id=e.actor_id where e.ticket_id=p_ticket and e.action in('started','completed')
 ),page as(select * from timeline where p_before is null or created_at<p_before order by created_at desc,item_key desc limit safe_limit)
 select jsonb_agg(to_jsonb(page) order by created_at,item_key) from page),'[]'::jsonb);
end;$$;

create function public.get_support_customer_history(p_ticket uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;begin
 select * into ticket_row from public.support_tickets where id=p_ticket;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from(
  select t.id,t.protocol,s.label service_label,t.status,t.created_at,t.completed_at,m.display_name agent_name
  from public.support_tickets t join public.support_services s on s.id=t.service_id left join public.app_members m on m.user_id=t.assigned_to
  where t.cnpj=ticket_row.cnpj and t.id<>ticket_row.id order by t.created_at desc limit 10
 )x),'[]'::jsonb);
end;$$;

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
  select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at
  from public.support_tickets t left join public.app_members am on am.user_id=t.assigned_to where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status<>'cancelled' order by t.updated_at desc limit 500
 )x),'[]'::jsonb));
end;$$;

revoke all on function public.get_support_ticket_messages(uuid,timestamptz,integer),public.get_support_customer_history(uuid) from public,anon,authenticated;
grant execute on function public.get_support_ticket_messages(uuid,timestamptz,integer),public.get_support_customer_history(uuid) to authenticated;

commit;
