begin;

create or replace function public.admin_set_support_agent(p_user uuid,p_queue_ids text[],p_available boolean,p_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.support_agents%rowtype;clean_queues text[];begin
 if not private.is_support_admin(auth.uid()) then raise exception 'Apenas Diretoria ou Subdiretoria pode configurar atendentes' using errcode='42501';end if;
 if p_queue_ids is null or not p_queue_ids<@array['inspection','fines','projects','accreditation']::text[] then raise exception 'Fila inválida' using errcode='22023';end if;
 select coalesce(array_agg(distinct q order by q),'{}'::text[]) into clean_queues from unnest(p_queue_ids)q;
 if not exists(select 1 from public.app_members where user_id=p_user and enabled) then raise exception 'Usuário indisponível para atendimento' using errcode='22023';end if;
 select * into current_row from public.support_agents where user_id=p_user for update;
 if found then if p_version is null or p_version<>current_row.version then raise exception 'O atendente foi alterado por outra pessoa' using errcode='40001';end if;update public.support_agents set queue_ids=clean_queues,available=p_available,updated_at=clock_timestamp(),updated_by=auth.uid(),version=version+1 where user_id=p_user;
 else insert into public.support_agents(user_id,queue_ids,available,updated_by)values(p_user,clean_queues,p_available,auth.uid());end if;
 if p_available then perform private.fill_support_agent(p_user);end if;
 return(select to_jsonb(a)-'last_assigned_at' from public.support_agents a where user_id=p_user);
end;$$;

create function public.get_support_agent_candidates() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.is_support_admin(auth.uid()) then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name,'sectors',m.sectors)order by m.display_name)from public.app_members m where m.enabled and not exists(select 1 from public.support_agents a where a.user_id=m.user_id)),'[]'::jsonb);
end;$$;

create or replace function public.get_support_admin_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$declare caller uuid:=auth.uid();begin
 if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;
 return jsonb_build_object('agents',coalesce((select jsonb_agg(to_jsonb(x)order by x.display_name)from(select m.user_id,m.display_name,m.sectors,a.queue_ids,a.available,a.capacity,a.version,(select count(*)::integer from public.support_tickets t where t.assigned_to=m.user_id and t.status in('assigned','in_progress','waiting_customer'))active_count,(select count(*)::integer from public.support_tickets t where t.assigned_to=m.user_id and t.status='completed' and t.completed_at>=date_trunc('day',clock_timestamp()))completed_today,(select coalesce(round(avg(extract(epoch from(t.first_response_at-t.created_at))/60)::numeric,1),0)from public.support_tickets t where t.assigned_to=m.user_id and t.first_response_at is not null)average_first_response_minutes from public.support_agents a join public.app_members m on m.user_id=a.user_id where m.enabled)x),'[]'::jsonb),'queues',coalesce((select jsonb_agg(to_jsonb(x)order by x.label)from(select q.id,q.label,count(t.id)filter(where t.status='queued')::integer waiting,count(t.id)filter(where t.status in('assigned','in_progress','waiting_customer'))::integer active,count(t.id)filter(where t.status='completed' and t.completed_at>=date_trunc('day',clock_timestamp()))::integer completed_today,coalesce(round(avg(extract(epoch from(coalesce(t.assigned_at,clock_timestamp())-t.created_at))/60)filter(where t.status='queued')::numeric,1),0)average_wait_minutes from public.support_queues q left join public.support_tickets t on t.queue_id=q.id and t.created_at>=clock_timestamp()-interval '30 days' group by q.id,q.label)x),'[]'::jsonb));
end;$$;

create function public.support_set_my_availability(p_available boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket record;new_agent uuid;begin
 if not exists(select 1 from public.support_agents where user_id=caller) then raise exception 'Usuário não pertence à equipe de atendimento' using errcode='42501';end if;
 update public.support_agents set available=p_available,updated_at=clock_timestamp(),updated_by=caller,version=version+1 where user_id=caller;
 if p_available then perform private.fill_support_agent(caller);
 else
  for ticket in select id from public.support_tickets where assigned_to=caller and status='assigned' for update loop
   update public.support_tickets set assigned_to=null,assigned_at=null,status='queued',updated_at=clock_timestamp(),version=version+1 where id=ticket.id;
   select private.assign_support_ticket(ticket.id) into new_agent;
   if new_agent is not null then insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(ticket.id,'transferred',caller,jsonb_build_object('from',caller,'to',new_agent,'reason','Atendente ficou indisponível'));end if;
  end loop;
 end if;
 return(select to_jsonb(a)-'last_assigned_at' from public.support_agents a where user_id=caller);
end;$$;

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$declare caller uuid:=auth.uid();begin
 if not exists(select 1 from public.support_agents where user_id=caller)and not private.is_support_admin(caller)then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('is_agent',exists(select 1 from public.support_agents where user_id=caller),'available',coalesce((select available from public.support_agents where user_id=caller),false),'active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x)order by x.updated_at desc)from(select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,t.priority,t.tags,t.due_at,t.last_customer_message_at,t.last_agent_read_at,(t.last_customer_message_at is not null and(t.last_agent_read_at is null or t.last_customer_message_at>t.last_agent_read_at))unread,t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at from public.support_tickets t left join public.app_members am on am.user_id=t.assigned_to where(private.is_support_admin(caller)or t.assigned_to=caller)and t.status<>'cancelled' order by t.updated_at desc limit 500)x),'[]'::jsonb));
end;$$;

revoke all on function public.get_support_agent_candidates(),public.support_set_my_availability(boolean) from public,anon,authenticated;
grant execute on function public.get_support_agent_candidates() to authenticated;
grant execute on function public.support_set_my_availability(boolean) to authenticated;

commit;
