begin;

alter table public.support_tickets add column transfer_priority boolean not null default false;

create or replace function private.assign_support_ticket(p_ticket uuid) returns uuid language plpgsql security definer set search_path='' as $$declare ticket_row public.support_tickets%rowtype;agent_id uuid;begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;if not found or ticket_row.status<>'queued' then return ticket_row.assigned_to;end if;
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));
 select a.user_id into agent_id from public.support_agents a join public.app_members m on m.user_id=a.user_id where a.available and m.enabled and private.support_agent_on_shift(a)and(ticket_row.queue_id='access' or ticket_row.queue_id=any(a.queue_ids))and private.support_active_count(a.user_id)<a.capacity order by private.support_active_count(a.user_id),a.last_assigned_at nulls first,a.user_id for update of a skip locked limit 1;
 if agent_id is null then return null;end if;
 update public.support_tickets set assigned_to=agent_id,assigned_at=clock_timestamp(),status='assigned',transfer_priority=false,updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=agent_id;
 insert into private.support_ticket_events(ticket_id,action,details)values(p_ticket,'assigned',jsonb_build_object('agent_id',agent_id));return agent_id;
end;$$;

create or replace function private.fill_support_agent(p_user uuid) returns integer language plpgsql security definer set search_path='' as $$declare agent_row public.support_agents%rowtype;ticket_id uuid;assigned integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));perform pg_advisory_xact_lock(hashtextextended('dgsci-support-agent:'||p_user::text,0));
 select * into agent_row from public.support_agents where user_id=p_user and available for update;
 if not found or not private.support_agent_on_shift(agent_row)or not exists(select 1 from public.app_members where user_id=p_user and enabled)then return 0;end if;
 while private.support_active_count(p_user)<agent_row.capacity loop select t.id into ticket_id from public.support_tickets t where t.status='queued'and(t.queue_id='access'or t.queue_id=any(agent_row.queue_ids))order by t.transfer_priority desc,t.created_at,t.id for update skip locked limit 1;exit when ticket_id is null;update public.support_tickets set assigned_to=p_user,assigned_at=clock_timestamp(),status='assigned',transfer_priority=false,updated_at=clock_timestamp(),version=version+1 where id=ticket_id;update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=p_user;insert into private.support_ticket_events(ticket_id,action,details)values(ticket_id,'assigned',jsonb_build_object('agent_id',p_user));assigned:=assigned+1;end loop;return assigned;
end;$$;

create function public.support_transfer_to_queue(p_ticket uuid,p_queue text,p_reason text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();ticket_row public.support_tickets%rowtype;target_label text;new_agent uuid;begin
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Informe uma justificativa de 10 a 500 caracteres' using errcode='22023';end if;
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(private.is_support_admin(caller)or ticket_row.assigned_to=caller)then raise exception 'Atendimento não autorizado para transferência' using errcode='42501';end if;
 if ticket_row.status not in('assigned','in_progress','waiting_customer')then raise exception 'Atendimento indisponível para transferência' using errcode='22023';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 select label into target_label from public.support_queues where id=p_queue and enabled;if target_label is null or p_queue=ticket_row.queue_id then raise exception 'Selecione outra seção' using errcode='22023';end if;
 update public.support_tickets set queue_id=p_queue,assigned_to=null,assigned_at=null,status='queued',transfer_priority=true,updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 insert into public.support_messages(ticket_id,author_kind,body)values(p_ticket,'system','Você foi transferido para a '||target_label||'.');
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'transferred',caller,jsonb_build_object('from_queue',ticket_row.queue_id,'to_queue',p_queue,'reason',btrim(p_reason)));
 select private.assign_support_ticket(p_ticket)into new_agent;
 if ticket_row.assigned_to is not null then perform private.fill_support_agent(ticket_row.assigned_to);end if;
 return(select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;$$;

alter table public.support_quick_replies add column queue_id text references public.support_queues(id);
update public.support_quick_replies set queue_id='inspection' where queue_id is null;
alter table public.support_quick_replies alter column queue_id set not null;
alter table public.support_quick_replies drop constraint if exists support_quick_replies_title_key;
alter table public.support_quick_replies add constraint support_quick_replies_queue_title_key unique(queue_id,title);

create function public.get_support_quick_replies_for_ticket(p_ticket uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare caller uuid:=auth.uid();qid text;begin select queue_id into qid from public.support_tickets where id=p_ticket and(assigned_to=caller or private.is_support_admin(caller));if qid is null then raise exception 'Atendimento não autorizado' using errcode='42501';end if;return coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body)order by sort_order,title)from public.support_quick_replies where enabled and queue_id=qid),'[]'::jsonb);end;$$;
create function public.admin_get_support_quick_replies() returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not private.is_support_admin(auth.uid())then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;return coalesce((select jsonb_agg(to_jsonb(r)order by queue_id,sort_order,title)from public.support_quick_replies r),'[]'::jsonb);end;$$;
create function public.admin_save_support_quick_reply(p_id uuid,p_queue text,p_title text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$declare row public.support_quick_replies%rowtype;begin if not private.is_support_admin(auth.uid())then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;if not exists(select 1 from public.support_queues where id=p_queue and enabled)or length(btrim(p_title))not between 2 and 100 or length(btrim(p_body))not between 1 and 2000 then raise exception 'Confira a resposta rápida' using errcode='22023';end if;if p_id is null then insert into public.support_quick_replies(queue_id,title,body)values(p_queue,btrim(p_title),btrim(p_body))returning * into row;else update public.support_quick_replies set queue_id=p_queue,title=btrim(p_title),body=btrim(p_body),updated_at=clock_timestamp()where id=p_id returning * into row;end if;return to_jsonb(row);end;$$;
create function public.admin_delete_support_quick_reply(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin if not private.is_support_admin(auth.uid())then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;delete from public.support_quick_replies where id=p_id;return found;end;$$;

revoke all on function public.support_transfer_to_queue(uuid,text,text,integer),public.get_support_quick_replies_for_ticket(uuid),public.admin_get_support_quick_replies(),public.admin_save_support_quick_reply(uuid,text,text,text),public.admin_delete_support_quick_reply(uuid) from public,anon,authenticated;
grant execute on function public.support_transfer_to_queue(uuid,text,text,integer),public.get_support_quick_replies_for_ticket(uuid) to authenticated;
grant execute on function public.admin_get_support_quick_replies(),public.admin_save_support_quick_reply(uuid,text,text,text),public.admin_delete_support_quick_reply(uuid) to authenticated;

commit;
