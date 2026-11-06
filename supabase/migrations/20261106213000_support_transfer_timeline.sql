begin;

create function public.get_support_transfer_agents(p_ticket uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;begin
 select * into ticket_row from public.support_tickets where id=p_ticket;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(x)order by x.display_name)from(select a.user_id,m.display_name,a.queue_ids,a.available,a.capacity,private.support_active_count(a.user_id) active_count from public.support_agents a join public.app_members m on m.user_id=a.user_id where a.available and m.enabled and a.user_id<>ticket_row.assigned_to and(ticket_row.queue_id='access' or ticket_row.queue_id=any(a.queue_ids))and private.support_active_count(a.user_id)<a.capacity)x),'[]'::jsonb);
end;$$;

create or replace function public.admin_transfer_support_ticket(p_ticket uuid,p_agent uuid,p_reason text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;agent_row public.support_agents%rowtype;begin
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Informe uma justificativa de 10 a 500 caracteres' using errcode='22023';end if;
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(private.is_support_admin(caller) or ticket_row.assigned_to=caller) then raise exception 'Atendimento não autorizado para transferência' using errcode='42501';end if;
 if ticket_row.status not in('assigned','in_progress','waiting_customer') then raise exception 'Atendimento indisponível para transferência' using errcode='22023';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 select * into agent_row from public.support_agents where user_id=p_agent and available for update;
 if not found or not private.is_support_agent(p_agent) then raise exception 'Atendente indisponível' using errcode='22023';end if;
 if ticket_row.queue_id<>'access' and not(ticket_row.queue_id=any(agent_row.queue_ids)) then raise exception 'Atendente não pertence à fila' using errcode='22023';end if;
 if private.support_active_count(p_agent)>=agent_row.capacity then raise exception 'Atendente já atingiu a capacidade' using errcode='22023';end if;
 if ticket_row.assigned_to=p_agent then raise exception 'O atendimento já pertence a este VC' using errcode='22023';end if;
 update public.support_tickets set assigned_to=p_agent,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp() where user_id=p_agent;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'transferred',caller,jsonb_build_object('from',ticket_row.assigned_to,'to',p_agent,'reason',btrim(p_reason)));
 if ticket_row.assigned_to is not null then perform private.fill_support_agent(ticket_row.assigned_to);end if;
 return(select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;$$;

create or replace function public.get_support_ticket_messages(p_ticket uuid,p_before timestamptz default null,p_limit integer default 10) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;safe_limit integer:=least(greatest(coalesce(p_limit,10),1),10);begin
 select * into ticket_row from public.support_tickets where id=p_ticket;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 return coalesce((with timeline as(
  select 'message:'||sm.id::text item_key,sm.id::text id,sm.ticket_id,sm.author_kind,null::text event_action,case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))) end actor_label,sm.body,sm.created_at
  from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=p_ticket
  union all
  select 'event:'||e.id::text,null::text,e.ticket_id,'system',e.action,'Registro do atendimento',case
   when e.action='assigned' then 'Atendimento designado para '||coalesce(target.display_name,'atendente')
   when e.action='transferred' then coalesce(actor.display_name,'DGSCI')||' transferiu o atendimento de '||coalesce(source.display_name,'atendente anterior')||' para '||coalesce(target.display_name,'novo atendente')||'. Motivo: '||coalesce(e.details->>'reason','não informado')
   when e.action='started' then 'Atendimento iniciado por '||coalesce(actor.display_name,'DGSCI')
   when e.action='completed' then 'Atendimento finalizado por '||coalesce(actor.display_name,'DGSCI') end,e.created_at
  from private.support_ticket_events e left join public.app_members actor on actor.user_id=e.actor_id left join public.app_members source on source.user_id=(e.details->>'from')::uuid left join public.app_members target on target.user_id=coalesce((e.details->>'to')::uuid,(e.details->>'agent_id')::uuid) where e.ticket_id=p_ticket and e.action in('assigned','transferred','started','completed')
 ),page as(select * from timeline where p_before is null or created_at<p_before order by created_at desc,item_key desc limit safe_limit)
 select jsonb_agg(to_jsonb(page)order by created_at,item_key)from page),'[]'::jsonb);
end;$$;

create or replace function public.get_support_conversation_page_public(p_protocol text,p_cnpj text,p_access_hash text,p_before timestamptz default null,p_limit integer default 10) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;position integer;message_rows jsonb;has_more boolean;oldest timestamptz;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 if p_limit not between 1 and 50 then raise exception 'Limite inválido' using errcode='22023';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash;
 if not found then return null;end if;
 if ticket_row.status='queued' then select count(*)::integer into position from public.support_tickets t where t.queue_id=ticket_row.queue_id and t.status='queued' and(t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);else position:=0;end if;
 with timeline as(
  select 'message:'||sm.id::text id,sm.author_kind author,case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI')))end actor_label,sm.body,sm.created_at
  from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=ticket_row.id
  union all
  select 'event:'||e.id::text,'system','Registro do atendimento',case when e.action='assigned' then 'Atendimento designado para '||coalesce(target.display_name,'atendente') when e.action='transferred' then coalesce(actor.display_name,'DGSCI')||' transferiu o atendimento de '||coalesce(source.display_name,'atendente anterior')||' para '||coalesce(target.display_name,'novo atendente') when e.action='started' then 'Atendimento iniciado por '||coalesce(actor.display_name,'DGSCI') when e.action='completed' then 'Atendimento finalizado por '||coalesce(actor.display_name,'DGSCI')end,e.created_at
  from private.support_ticket_events e left join public.app_members actor on actor.user_id=e.actor_id left join public.app_members source on source.user_id=(e.details->>'from')::uuid left join public.app_members target on target.user_id=coalesce((e.details->>'to')::uuid,(e.details->>'agent_id')::uuid) where e.ticket_id=ticket_row.id and e.action in('assigned','transferred','started','completed')
 ),page as(select * from timeline where p_before is null or created_at<p_before order by created_at desc,id desc limit p_limit)
 select coalesce(jsonb_agg(to_jsonb(page)order by created_at,id),'[]'::jsonb),min(created_at) into message_rows,oldest from page;
 with timeline_times as(select created_at from public.support_messages where ticket_id=ticket_row.id union all select created_at from private.support_ticket_events where ticket_id=ticket_row.id and action in('assigned','transferred','started','completed'))select oldest is not null and exists(select 1 from timeline_times where created_at<oldest)into has_more;
 return jsonb_build_object('protocol',ticket_row.protocol,'ticket_id',ticket_row.id,'queue_id',ticket_row.queue_id,'queue_label',(select label from public.support_queues where id=ticket_row.queue_id),'service_id',ticket_row.service_id,'service_label',(select label from public.support_services where id=ticket_row.service_id),'status',ticket_row.status,'people_ahead',position,'created_at',ticket_row.created_at,'updated_at',ticket_row.updated_at,'assigned_name',(select display_name from public.app_members where user_id=ticket_row.assigned_to),'messages',message_rows,'has_more',has_more);
end;$$;

revoke all on function public.get_support_transfer_agents(uuid) from public,anon,authenticated;
grant execute on function public.get_support_transfer_agents(uuid) to authenticated;

commit;
