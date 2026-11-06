begin;

create or replace function private.next_support_protocol() returns text language sql volatile security definer set search_path='' as $$
 select 'DGSCI-'||lpad(nextval('private.support_protocol_seq')::text,7,'0');
$$;

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
  select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,
   (t.last_customer_message_at is not null and (t.last_agent_read_at is null or t.last_customer_message_at>t.last_agent_read_at)) unread,
   lm.body last_customer_message,lm.created_at last_customer_message_at,t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at
  from public.support_tickets t left join public.app_members am on am.user_id=t.assigned_to
  left join lateral(select m.body,m.created_at from public.support_messages m where m.ticket_id=t.id and m.author_kind='customer' order by m.created_at desc,m.id desc limit 1)lm on true
  where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status<>'cancelled' order by t.updated_at desc limit 500
 )x),'[]'::jsonb));
end;$$;

commit;
