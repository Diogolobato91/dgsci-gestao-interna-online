begin;

alter table public.support_tickets
  add column if not exists response_deadline timestamptz;

-- Mensagens iniciais simples para que o cidadão entenda a fila e a regra antes
-- de conversar com um atendente.
create or replace function private.support_welcome_customer() returns trigger
language plpgsql security definer set search_path='' as $$
declare queue_name text;
begin
  select label into queue_name from public.support_queues where id=new.queue_id;
  insert into public.support_messages(ticket_id,author_kind,body) values
    (new.id,'system','Olá, ' || split_part(new.requester_name,' ',1) || '. Recebemos sua solicitação.'),
    (new.id,'system','Você entrou na fila da ' || coalesce(queue_name,'seção responsável') || '. Aguarde nesta página. Quando o atendimento começar, responda em até 10 minutos para manter a conversa aberta.');
  return new;
end;
$$;

drop trigger if exists support_ticket_welcome_customer on public.support_tickets;
create trigger support_ticket_welcome_customer
after insert on public.support_tickets
for each row execute function private.support_welcome_customer();

-- Finaliza atendimentos cujo cidadão não respondeu dentro do prazo e libera a
-- capacidade do atendente para o próximo chamado.
create or replace function private.expire_support_inactive_tickets() returns integer
language plpgsql security definer set search_path='' as $$
declare item record; expired_count integer:=0;
begin
  for item in
    select id,assigned_to from public.support_tickets
    where status='waiting_customer' and response_deadline is not null and response_deadline<=clock_timestamp()
    order by response_deadline for update skip locked
  loop
    update public.support_tickets
      set status='completed',completed_at=clock_timestamp(),response_deadline=null,
          updated_at=clock_timestamp(),version=version+1
      where id=item.id;
    insert into public.support_messages(ticket_id,author_kind,body)
      values(item.id,'system','Este atendimento foi encerrado automaticamente após 10 minutos sem resposta. Se ainda precisar de ajuda, inicie um novo atendimento.');
    insert into private.support_ticket_events(ticket_id,action,details)
      values(item.id,'completed',jsonb_build_object('automatic',true,'reason','customer_inactivity'));
    if item.assigned_to is not null then perform private.fill_support_agent(item.assigned_to); end if;
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end;
$$;

create or replace function public.expire_support_inactive_public(p_protocol text,p_cnpj text,p_access_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
  if not exists(select 1 from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash) then return false;end if;
  perform private.expire_support_inactive_tickets();
  return true;
end;
$$;

create or replace function public.support_send_message(p_ticket uuid,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;message_row public.support_messages%rowtype;caller uuid:=auth.uid();admin boolean:=private.is_support_admin(auth.uid());
begin
  perform private.expire_support_inactive_tickets();
  select * into ticket_row from public.support_tickets where id=p_ticket for update;
  if not found or not(ticket_row.assigned_to=caller or admin) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
  if ticket_row.status in('completed','cancelled') or (ticket_row.status='queued' and not admin) then raise exception 'Atendimento indisponível para mensagem' using errcode='22023';end if;
  if length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Mensagem inválida' using errcode='22023';end if;

  if ticket_row.status='assigned' then
    insert into private.support_ticket_events(ticket_id,action,actor_id) values(p_ticket,'started',caller);
  end if;
  insert into public.support_messages(ticket_id,author_kind,actor_id,body)
    values(p_ticket,'agent',caller,btrim(p_body)) returning * into message_row;
  update public.support_tickets set
    status=case when ticket_row.status='queued' then 'queued' else 'waiting_customer' end,
    first_response_at=coalesce(first_response_at,clock_timestamp()),
    response_deadline=case when ticket_row.status='queued' then null else clock_timestamp()+interval '10 minutes' end,
    updated_at=clock_timestamp(),version=version+1
    where id=p_ticket;
  insert into private.support_ticket_events(ticket_id,action,actor_id,details)
    values(p_ticket,'message',caller,jsonb_build_object('message_id',message_row.id,'administrative_reply',ticket_row.status='queued'));
  return to_jsonb(message_row);
end;
$$;

create or replace function public.append_support_customer_message(p_protocol text,p_cnpj text,p_access_hash text,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;message_row public.support_messages%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
  perform private.expire_support_inactive_tickets();
  select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash for update;
  if not found then return null;end if;
  if ticket_row.status in('completed','cancelled') then raise exception 'Atendimento encerrado' using errcode='22023';end if;
  if length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Mensagem inválida' using errcode='22023';end if;
  insert into public.support_messages(ticket_id,author_kind,body) values(ticket_row.id,'customer',btrim(p_body)) returning * into message_row;
  if ticket_row.status='waiting_customer' then
    update public.support_tickets set status='in_progress',response_deadline=null,updated_at=clock_timestamp(),version=version+1 where id=ticket_row.id;
    insert into private.support_ticket_events(ticket_id,action,details) values(ticket_row.id,'resumed',jsonb_build_object('by','customer'));
  else
    update public.support_tickets set response_deadline=null,updated_at=clock_timestamp() where id=ticket_row.id;
  end if;
  insert into private.support_ticket_events(ticket_id,action,details) values(ticket_row.id,'message',jsonb_build_object('message_id',message_row.id,'author','customer'));
  return jsonb_build_object('id',message_row.id,'author',message_row.author_kind,'body',message_row.body,'created_at',message_row.created_at);
end;
$$;

create or replace function public.support_set_ticket_status(p_ticket uuid,p_status text,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;caller uuid:=auth.uid();action_name text;released_agent uuid;
begin
  perform private.expire_support_inactive_tickets();
  select * into ticket_row from public.support_tickets where id=p_ticket for update;
  if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
  if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
  if p_status not in('in_progress','waiting_customer','completed','cancelled') or
    (ticket_row.status='queued' and p_status<>'cancelled') or
    (ticket_row.status='assigned' and p_status not in('in_progress','completed','cancelled')) or
    (ticket_row.status='in_progress' and p_status not in('waiting_customer','completed','cancelled')) or
    (ticket_row.status='waiting_customer' and p_status not in('in_progress','completed','cancelled')) or ticket_row.status in('completed','cancelled')
  then raise exception 'Mudança de situação inválida' using errcode='22023';end if;
  released_agent:=ticket_row.assigned_to;
  action_name:=case p_status when 'in_progress' then case when ticket_row.status='waiting_customer' then 'resumed' else 'started' end when 'waiting_customer' then 'waiting_customer' when 'completed' then 'completed' else 'cancelled' end;
  update public.support_tickets set status=p_status,
    first_response_at=case when p_status='in_progress' then coalesce(first_response_at,clock_timestamp()) else first_response_at end,
    completed_at=case when p_status in('completed','cancelled') then clock_timestamp() else null end,
    response_deadline=case when p_status='waiting_customer' then clock_timestamp()+interval '10 minutes' else null end,
    updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
  if p_status='completed' then
    insert into public.support_messages(ticket_id,author_kind,body) values(p_ticket,'system','Seu atendimento foi concluído pela equipe DGSCI. Obrigado pelo contato. Esta conversa permanecerá disponível para consulta.');
  elsif p_status='cancelled' then
    insert into public.support_messages(ticket_id,author_kind,body) values(p_ticket,'system','Este atendimento foi cancelado pela equipe DGSCI.');
  elsif p_status='waiting_customer' then
    insert into public.support_messages(ticket_id,author_kind,body) values(p_ticket,'system','Aguardamos sua resposta. Se não houver retorno em até 10 minutos, este atendimento será encerrado automaticamente.');
  end if;
  insert into private.support_ticket_events(ticket_id,action,actor_id,details) values(p_ticket,action_name,caller,jsonb_build_object('from',ticket_row.status,'to',p_status));
  if p_status in('completed','cancelled') and released_agent is not null then perform private.fill_support_agent(released_agent);end if;
  return(select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;
$$;

create or replace function public.get_my_support_inbox() returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();
begin
  if not exists(select 1 from public.support_agents where user_id=caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
  perform private.expire_support_inactive_tickets();
  return jsonb_build_object(
    'is_agent',exists(select 1 from public.support_agents where user_id=caller),
    'available',coalesce((select available from public.support_agents where user_id=caller),false),
    'active_count',private.support_active_count(caller),
    'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),
    'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(
      select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,t.priority,t.tags,t.due_at,t.response_deadline,t.last_customer_message_at,t.last_agent_read_at,
        (t.last_customer_message_at is not null and(t.last_agent_read_at is null or t.last_customer_message_at>t.last_agent_read_at)) unread,
        lm.body last_customer_message,lm.created_at last_customer_message_preview_at,
        t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at
      from public.support_tickets t
      left join public.app_members am on am.user_id=t.assigned_to
      left join lateral(select m.body,m.created_at from public.support_messages m where m.ticket_id=t.id and m.author_kind='customer' order by m.created_at desc,m.id desc limit 1)lm on true
      where(private.is_support_admin(caller) or t.assigned_to=caller) and t.status<>'cancelled'
      order by t.updated_at desc limit 500
    )x),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.expire_support_inactive_public(text,text,text) from public,anon,authenticated;
grant execute on function public.expire_support_inactive_public(text,text,text) to service_role;

commit;
