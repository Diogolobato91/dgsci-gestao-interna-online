begin;

create table private.support_request_limits(
  scope text not null check(scope in('open','conversation','message')),
  key_hash text not null check(length(key_hash)=64),
  window_started_at timestamptz not null,
  request_count integer not null check(request_count>0),
  primary key(scope,key_hash)
);

alter table private.support_request_limits enable row level security;
revoke all on private.support_request_limits from public,anon,authenticated;

create function public.consume_support_rate_limit(p_scope text,p_key_hash text,p_limit integer,p_window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare current_row private.support_request_limits%rowtype;now_at timestamptz:=clock_timestamp();begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 if p_scope not in('open','conversation','message') or p_key_hash!~'^[a-f0-9]{64}$' or p_limit not between 1 and 500 or p_window_seconds not between 10 and 86400 then raise exception 'Limite inválido' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-rate:'||p_scope||':'||p_key_hash,0));
 select * into current_row from private.support_request_limits where scope=p_scope and key_hash=p_key_hash for update;
 if not found or current_row.window_started_at+(p_window_seconds||' seconds')::interval<=now_at then
  insert into private.support_request_limits(scope,key_hash,window_started_at,request_count)values(p_scope,p_key_hash,now_at,1)
  on conflict(scope,key_hash)do update set window_started_at=excluded.window_started_at,request_count=1;
  return true;
 end if;
 if current_row.request_count>=p_limit then return false;end if;
 update private.support_request_limits set request_count=request_count+1 where scope=p_scope and key_hash=p_key_hash;
 return true;
end;$$;

create function public.get_support_conversation_public(p_protocol text,p_cnpj text,p_access_hash text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;position integer;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash;
 if not found then return null;end if;
 if ticket_row.status='queued' then select count(*)::integer into position from public.support_tickets t where t.queue_id=ticket_row.queue_id and t.status='queued' and (t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);else position:=0;end if;
 return jsonb_build_object(
  'protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'queue_label',(select label from public.support_queues where id=ticket_row.queue_id),
  'service_id',ticket_row.service_id,'service_label',(select label from public.support_services where id=ticket_row.service_id),
  'status',ticket_row.status,'people_ahead',position,'created_at',ticket_row.created_at,'updated_at',ticket_row.updated_at,
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'author',m.author_kind,'body',m.body,'created_at',m.created_at)order by m.created_at,m.id)from public.support_messages m where m.ticket_id=ticket_row.id),'[]'::jsonb)
 );
end;$$;

create function public.append_support_customer_message(p_protocol text,p_cnpj text,p_access_hash text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;message_row public.support_messages%rowtype;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash for update;
 if not found then return null;end if;
 if ticket_row.status in('completed','cancelled') then raise exception 'Atendimento encerrado' using errcode='22023';end if;
 if length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Mensagem inválida' using errcode='22023';end if;
 insert into public.support_messages(ticket_id,author_kind,body)values(ticket_row.id,'customer',btrim(p_body))returning * into message_row;
 if ticket_row.status='waiting_customer' then update public.support_tickets set status='in_progress',updated_at=clock_timestamp(),version=version+1 where id=ticket_row.id;insert into private.support_ticket_events(ticket_id,action,details)values(ticket_row.id,'resumed',jsonb_build_object('by','customer'));else update public.support_tickets set updated_at=clock_timestamp() where id=ticket_row.id;end if;
 insert into private.support_ticket_events(ticket_id,action,details)values(ticket_row.id,'message',jsonb_build_object('message_id',message_row.id,'author','customer'));
 return jsonb_build_object('id',message_row.id,'author',message_row.author_kind,'body',message_row.body,'created_at',message_row.created_at);
end;$$;

revoke all on function public.consume_support_rate_limit(text,text,integer,integer),public.get_support_conversation_public(text,text,text),public.append_support_customer_message(text,text,text,text) from public,anon,authenticated;
grant execute on function public.consume_support_rate_limit(text,text,integer,integer),public.get_support_conversation_public(text,text,text),public.append_support_customer_message(text,text,text,text) to service_role;

commit;
