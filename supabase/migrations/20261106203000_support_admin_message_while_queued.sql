begin;

create or replace function public.support_send_message(p_ticket uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;message_row public.support_messages%rowtype;caller uuid:=auth.uid();caller_admin boolean:=private.is_support_admin(auth.uid());begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(ticket_row.assigned_to=caller or caller_admin) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 if ticket_row.status in('completed','cancelled') or(ticket_row.status='queued' and not caller_admin) then raise exception 'Atendimento indisponível para mensagem' using errcode='22023';end if;
 if length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Mensagem inválida' using errcode='22023';end if;
 insert into public.support_messages(ticket_id,author_kind,actor_id,body) values(p_ticket,'agent',caller,btrim(p_body)) returning * into message_row;
 if ticket_row.status='assigned' then update public.support_tickets set status='in_progress',first_response_at=coalesce(first_response_at,clock_timestamp()),updated_at=clock_timestamp(),version=version+1 where id=p_ticket;insert into private.support_ticket_events(ticket_id,action,actor_id)values(p_ticket,'started',caller);else update public.support_tickets set updated_at=clock_timestamp() where id=p_ticket;end if;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'message',caller,jsonb_build_object('message_id',message_row.id));
 return to_jsonb(message_row);
end;$$;

commit;
