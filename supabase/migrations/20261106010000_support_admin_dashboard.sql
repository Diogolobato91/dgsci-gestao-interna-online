begin;

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object(
  'active_count',private.support_active_count(caller),
  'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),
  'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
   select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.status,t.assigned_to,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at
   from public.support_tickets t where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status not in('completed','cancelled') limit 500
  )x),'[]'::jsonb)
 );
end;$$;

create function public.get_support_admin_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;
 return jsonb_build_object(
  'agents',coalesce((select jsonb_agg(to_jsonb(x) order by x.display_name) from(
   select m.user_id,m.display_name,m.sectors,coalesce(a.queue_ids,'{}'::text[]) queue_ids,coalesce(a.available,false) available,coalesce(a.capacity,5) capacity,coalesce(a.version,0) version,
    (select count(*)::integer from public.support_tickets t where t.assigned_to=m.user_id and t.status in('assigned','in_progress','waiting_customer')) active_count,
    (select count(*)::integer from public.support_tickets t where t.assigned_to=m.user_id and t.status='completed' and t.completed_at>=date_trunc('day',clock_timestamp())) completed_today,
    (select coalesce(round(avg(extract(epoch from(t.first_response_at-t.created_at))/60)::numeric,1),0) from public.support_tickets t where t.assigned_to=m.user_id and t.first_response_at is not null) average_first_response_minutes
   from public.app_members m left join public.support_agents a on a.user_id=m.user_id
   where m.enabled and m.sectors&&array['Vistoriador','Análise','Multas','Credenciamento']
  )x),'[]'::jsonb),
  'queues',coalesce((select jsonb_agg(to_jsonb(x) order by x.label) from(
   select q.id,q.label,
    count(t.id) filter(where t.status='queued')::integer waiting,
    count(t.id) filter(where t.status in('assigned','in_progress','waiting_customer'))::integer active,
    count(t.id) filter(where t.status='completed' and t.completed_at>=date_trunc('day',clock_timestamp()))::integer completed_today,
    coalesce(round(avg(extract(epoch from(coalesce(t.assigned_at,clock_timestamp())-t.created_at))/60) filter(where t.status<>'queued')::numeric,1),0) average_wait_minutes
   from public.support_queues q left join public.support_tickets t on t.queue_id=q.id where q.enabled group by q.id,q.label
  )x),'[]'::jsonb)
 );
end;$$;

create function public.admin_transfer_support_ticket(p_ticket uuid,p_agent uuid,p_reason text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;agent_row public.support_agents%rowtype;begin
 if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Informe uma justificativa de 10 a 500 caracteres' using errcode='22023';end if;
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or ticket_row.status not in('assigned','in_progress','waiting_customer') then raise exception 'Atendimento indisponível para transferência' using errcode='22023';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 select * into agent_row from public.support_agents where user_id=p_agent and available for update;
 if not found or not private.is_support_agent(p_agent) then raise exception 'Atendente indisponível' using errcode='22023';end if;
 if ticket_row.queue_id<>'access' and not(ticket_row.queue_id=any(agent_row.queue_ids)) then raise exception 'Atendente não pertence à fila' using errcode='22023';end if;
 if private.support_active_count(p_agent)>=agent_row.capacity then raise exception 'Atendente já atingiu a capacidade' using errcode='22023';end if;
 if ticket_row.assigned_to=p_agent then raise exception 'O atendimento já pertence a este VC' using errcode='22023';end if;
 update public.support_tickets set assigned_to=p_agent,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp() where user_id=p_agent;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details) values(p_ticket,'transferred',caller,jsonb_build_object('from',ticket_row.assigned_to,'to',p_agent,'reason',btrim(p_reason)));
 if ticket_row.assigned_to is not null then perform private.fill_support_agent(ticket_row.assigned_to);end if;
 return (select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;$$;

create function public.get_support_admin_history() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;
 return jsonb_build_object(
  'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
   select t.id,t.protocol,t.queue_id,t.service_id,t.requester_name,t.status,t.assigned_to,m.display_name agent_name,t.created_at,t.updated_at,t.completed_at,
    extract(epoch from(coalesce(t.first_response_at,clock_timestamp())-t.created_at))/60 response_minutes,
    extract(epoch from(coalesce(t.completed_at,clock_timestamp())-t.created_at))/60 total_minutes
   from public.support_tickets t left join public.app_members m on m.user_id=t.assigned_to order by t.updated_at desc limit 500
  )x),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from(
   select e.id,e.action,e.created_at,e.details,t.protocol,m.display_name actor_name
   from private.support_ticket_events e join public.support_tickets t on t.id=e.ticket_id left join public.app_members m on m.user_id=e.actor_id order by e.created_at desc limit 500
  )x),'[]'::jsonb)
 );
end;$$;

revoke all on function public.get_support_admin_dashboard(),public.admin_transfer_support_ticket(uuid,uuid,text,integer),public.get_support_admin_history() from public,anon,authenticated;
grant execute on function public.get_support_admin_dashboard(),public.admin_transfer_support_ticket(uuid,uuid,text,integer),public.get_support_admin_history() to authenticated;

commit;
