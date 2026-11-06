begin;

alter table public.support_tickets add column internal_notes text not null default '' check(length(internal_notes)<=4000);
alter table private.support_ticket_events drop constraint support_ticket_events_action_check;
alter table private.support_ticket_events add constraint support_ticket_events_action_check check(action in('created','assigned','started','waiting_customer','resumed','completed','cancelled','message','transferred','notes_updated'));

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
  select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at
  from public.support_tickets t left join public.app_members am on am.user_id=t.assigned_to where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status not in('completed','cancelled') limit 500
 )x),'[]'::jsonb));
end;$$;

create function public.admin_assign_support_ticket(p_ticket uuid,p_agent uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;agent_row public.support_agents%rowtype;begin
 if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or ticket_row.status<>'queued' then raise exception 'Atendimento não está disponível na fila' using errcode='22023';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 select * into agent_row from public.support_agents where user_id=p_agent and available for update;
 if not found or not private.is_support_agent(p_agent) then raise exception 'Atendente indisponível' using errcode='22023';end if;
 if ticket_row.queue_id<>'access' and not(ticket_row.queue_id=any(agent_row.queue_ids)) then raise exception 'Atendente não pertence à fila' using errcode='22023';end if;
 if private.support_active_count(p_agent)>=agent_row.capacity then raise exception 'Atendente já atingiu a capacidade' using errcode='22023';end if;
 update public.support_tickets set assigned_to=p_agent,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp() where user_id=p_agent;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'assigned',caller,jsonb_build_object('to',p_agent,'manual',true));
 return (select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;$$;

create function public.support_set_internal_notes(p_ticket uuid,p_notes text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 if length(coalesce(p_notes,''))>4000 then raise exception 'Observação muito longa' using errcode='22023';end if;
 update public.support_tickets set internal_notes=btrim(coalesce(p_notes,'')),updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'notes_updated',caller,jsonb_build_object('has_notes',length(btrim(coalesce(p_notes,'')))>0));
 return (select jsonb_build_object('internal_notes',internal_notes,'version',version,'updated_at',updated_at) from public.support_tickets where id=p_ticket);
end;$$;

create function public.get_support_ticket_messages(p_ticket uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;begin
 select * into ticket_row from public.support_tickets where id=p_ticket;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',sm.id,'ticket_id',sm.ticket_id,'author_kind',sm.author_kind,'actor_label',case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))) end,'body',sm.body,'created_at',sm.created_at) order by sm.created_at,sm.id) from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=p_ticket),'[]'::jsonb);
end;$$;

create or replace function public.get_support_conversation_public(p_protocol text,p_cnpj text,p_access_hash text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;position integer;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash;
 if not found then return null;end if;
 if ticket_row.status='queued' then select count(*)::integer into position from public.support_tickets t where t.queue_id=ticket_row.queue_id and t.status='queued' and (t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);else position:=0;end if;
 return jsonb_build_object('protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'queue_label',(select label from public.support_queues where id=ticket_row.queue_id),'service_id',ticket_row.service_id,'service_label',(select label from public.support_services where id=ticket_row.service_id),'status',ticket_row.status,'people_ahead',position,'created_at',ticket_row.created_at,'updated_at',ticket_row.updated_at,'assigned_name',(select display_name from public.app_members where user_id=ticket_row.assigned_to),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',sm.id,'author',sm.author_kind,'actor_label',case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))) end,'body',sm.body,'created_at',sm.created_at)order by sm.created_at,sm.id)from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=ticket_row.id),'[]'::jsonb));
end;$$;

revoke all on function public.admin_assign_support_ticket(uuid,uuid,integer),public.support_set_internal_notes(uuid,text,integer),public.get_support_ticket_messages(uuid) from public,anon,authenticated;
grant execute on function public.admin_assign_support_ticket(uuid,uuid,integer),public.support_set_internal_notes(uuid,text,integer),public.get_support_ticket_messages(uuid) to authenticated;

commit;
