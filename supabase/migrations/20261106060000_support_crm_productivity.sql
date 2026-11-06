begin;

alter table public.support_tickets add column priority text not null default 'normal' check(priority in('low','normal','high','urgent'));
alter table public.support_tickets add column tags text[] not null default '{}'::text[] check(cardinality(tags)<=10);
alter table public.support_tickets add column due_at timestamptz;
alter table public.support_tickets add column last_customer_message_at timestamptz;
alter table public.support_tickets add column last_agent_read_at timestamptz;
update public.support_tickets set due_at=created_at+interval '2 hours',last_customer_message_at=created_at where due_at is null;
alter table public.support_tickets alter column due_at set default (clock_timestamp()+interval '2 hours');

alter table public.support_agents add column work_start time not null default '08:00';
alter table public.support_agents add column work_end time not null default '18:00';
alter table public.support_agents add column work_days smallint[] not null default array[1,2,3,4,5]::smallint[] check(work_days<@array[0,1,2,3,4,5,6]::smallint[]);
alter table public.support_agents add column timezone text not null default 'America/Belem';

create table public.support_quick_replies(id uuid primary key default gen_random_uuid(),title text not null unique,body text not null check(length(body) between 1 and 2000),enabled boolean not null default true,sort_order integer not null default 100,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
insert into public.support_quick_replies(title,body,sort_order) values
 ('Saudação inicial','Olá! Sou da equipe DGSCI e vou acompanhar seu atendimento. Como posso ajudar?',10),
 ('Solicitar documentos','Para continuar, por favor informe o número do processo e encaminhe os documentos relacionados à solicitação.',20),
 ('Aguardar análise','Recebemos as informações. O atendimento ficará em análise e retornaremos por este chat.',30),
 ('Encerramento','Sua solicitação foi atendida. Este protocolo será encerrado, mas permanecerá disponível no histórico.',40)
on conflict(title)do update set body=excluded.body,sort_order=excluded.sort_order;

create table public.support_attachments(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,message_id uuid references public.support_messages(id) on delete set null,uploaded_by uuid references auth.users(id),file_name text not null,file_path text not null unique,mime_type text not null,size_bytes bigint not null check(size_bytes between 1 and 10485760),created_at timestamptz not null default clock_timestamp());
create table public.support_satisfaction(ticket_id uuid primary key references public.support_tickets(id) on delete cascade,score smallint not null check(score between 1 and 5),comment text not null default '' check(length(comment)<=1000),created_at timestamptz not null default clock_timestamp());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-attachments','support-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id)do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.support_agent_on_shift(p_agent public.support_agents) returns boolean language plpgsql stable security definer set search_path='' as $$
declare local_now timestamp;begin
 local_now:=clock_timestamp() at time zone p_agent.timezone;
 return extract(dow from local_now)::smallint=any(p_agent.work_days) and local_now::time>=p_agent.work_start and local_now::time<p_agent.work_end;
exception when others then return false;end;$$;

create or replace function private.is_support_agent(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.support_agents a join public.app_members m on m.user_id=a.user_id where a.user_id=p_user and a.available and m.enabled);
$$;

create or replace function private.assign_support_ticket(p_ticket uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;agent_id uuid;begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;if not found or ticket_row.status<>'queued' then return ticket_row.assigned_to;end if;
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));
 select a.user_id into agent_id from public.support_agents a join public.app_members m on m.user_id=a.user_id where a.available and m.enabled and private.support_agent_on_shift(a) and (ticket_row.queue_id='access' or ticket_row.queue_id=any(a.queue_ids)) and private.support_active_count(a.user_id)<a.capacity order by private.support_active_count(a.user_id),a.last_assigned_at nulls first,a.user_id for update of a skip locked limit 1;
 if agent_id is null then return null;end if;
 update public.support_tickets set assigned_to=agent_id,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=agent_id;
 insert into private.support_ticket_events(ticket_id,action,details)values(p_ticket,'assigned',jsonb_build_object('agent_id',agent_id));return agent_id;
end;$$;

create or replace function private.fill_support_agent(p_user uuid) returns integer language plpgsql security definer set search_path='' as $$
declare agent_row public.support_agents%rowtype;ticket_id uuid;assigned integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));perform pg_advisory_xact_lock(hashtextextended('dgsci-support-agent:'||p_user::text,0));
 select * into agent_row from public.support_agents where user_id=p_user and available for update;
 if not found or not private.support_agent_on_shift(agent_row) or not exists(select 1 from public.app_members where user_id=p_user and enabled) then return 0;end if;
 while private.support_active_count(p_user)<agent_row.capacity loop select t.id into ticket_id from public.support_tickets t where t.status='queued' and (t.queue_id='access' or t.queue_id=any(agent_row.queue_ids)) order by case t.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,t.created_at,t.id for update skip locked limit 1;exit when ticket_id is null;update public.support_tickets set assigned_to=p_user,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=ticket_id;update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=p_user;insert into private.support_ticket_events(ticket_id,action,details)values(ticket_id,'assigned',jsonb_build_object('agent_id',p_user));assigned:=assigned+1;end loop;return assigned;
end;$$;

create function private.track_support_message() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.author_kind='customer' then update public.support_tickets set last_customer_message_at=new.created_at,updated_at=new.created_at where id=new.ticket_id;end if;return new;end;$$;
create trigger support_message_tracking after insert on public.support_messages for each row execute function private.track_support_message();

create or replace function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.phone,t.email,t.city,t.external_reference,t.summary,t.internal_notes,t.priority,t.tags,t.due_at,t.last_customer_message_at,t.last_agent_read_at,(t.last_customer_message_at is not null and (t.last_agent_read_at is null or t.last_customer_message_at>t.last_agent_read_at)) unread,t.status,t.assigned_to,am.display_name assigned_name,t.assigned_at,t.first_response_at,t.completed_at,t.version,t.created_at,t.updated_at from public.support_tickets t left join public.app_members am on am.user_id=t.assigned_to where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status<>'cancelled' order by t.updated_at desc limit 500)x),'[]'::jsonb));
end;$$;

create function public.support_mark_read(p_ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.support_tickets where id=p_ticket and (assigned_to=auth.uid() or private.is_support_admin(auth.uid()))) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;update public.support_tickets set last_agent_read_at=clock_timestamp() where id=p_ticket;return true;end;$$;
create function public.support_update_metadata(p_ticket uuid,p_priority text,p_tags text[],p_due_at timestamptz,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$declare t public.support_tickets%rowtype;begin
 select * into t from public.support_tickets where id=p_ticket for update;if not found or not(t.assigned_to=auth.uid() or private.is_support_admin(auth.uid())) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;if t.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;if p_priority not in('low','normal','high','urgent') or cardinality(coalesce(p_tags,'{}'))>10 then raise exception 'Metadados inválidos' using errcode='22023';end if;update public.support_tickets set priority=p_priority,tags=coalesce(p_tags,'{}'),due_at=p_due_at,updated_at=clock_timestamp(),version=version+1 where id=p_ticket;return (select to_jsonb(x)-'public_access_hash' from public.support_tickets x where id=p_ticket);end;$$;
create function public.get_support_quick_replies() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body)order by sort_order,title),'[]'::jsonb)from public.support_quick_replies where enabled$$;
create function public.admin_update_support_schedule(p_agent uuid,p_start time,p_end time,p_days smallint[],p_timezone text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$begin if not private.is_support_admin(auth.uid()) then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;if p_start>=p_end or p_days is null or not(p_days<@array[0,1,2,3,4,5,6]::smallint[]) or p_timezone not in('America/Belem','America/Fortaleza','America/Sao_Paulo') then raise exception 'Horário inválido' using errcode='22023';end if;update public.support_agents set work_start=p_start,work_end=p_end,work_days=p_days,timezone=p_timezone,updated_at=clock_timestamp(),version=version+1 where user_id=p_agent and version=p_version;if not found then raise exception 'Configuração desatualizada' using errcode='40001';end if;return(select to_jsonb(a)-'last_assigned_at' from public.support_agents a where user_id=p_agent);end;$$;
create function public.support_register_attachment(p_ticket uuid,p_file_name text,p_file_path text,p_mime_type text,p_size bigint) returns jsonb language plpgsql security definer set search_path='' as $$declare row public.support_attachments%rowtype;begin if not exists(select 1 from public.support_tickets where id=p_ticket and (assigned_to=auth.uid() or private.is_support_admin(auth.uid()))) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;if p_mime_type not in('image/jpeg','image/png','image/webp','application/pdf') or p_size not between 1 and 10485760 or p_file_path not like p_ticket::text||'/%' then raise exception 'Arquivo inválido' using errcode='22023';end if;insert into public.support_attachments(ticket_id,uploaded_by,file_name,file_path,mime_type,size_bytes)values(p_ticket,auth.uid(),left(p_file_name,200),p_file_path,p_mime_type,p_size)returning * into row;return to_jsonb(row);end;$$;
create function public.get_support_attachments(p_ticket uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not exists(select 1 from public.support_tickets where id=p_ticket and (assigned_to=auth.uid() or private.is_support_admin(auth.uid()))) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;return coalesce((select jsonb_agg(to_jsonb(a)order by created_at)from public.support_attachments a where ticket_id=p_ticket),'[]'::jsonb);end;$$;
create function public.submit_support_satisfaction(p_protocol text,p_cnpj text,p_access_hash text,p_score integer,p_comment text) returns boolean language plpgsql security definer set search_path='' as $$declare tid uuid;begin if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço' using errcode='42501';end if;select id into tid from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(p_cnpj,'\D','','g') and public_access_hash=p_access_hash and status='completed';if tid is null then return false;end if;insert into public.support_satisfaction(ticket_id,score,comment)values(tid,p_score,btrim(coalesce(p_comment,'')))on conflict(ticket_id)do nothing;return true;end;$$;

create or replace function public.get_support_admin_history() returns jsonb language plpgsql stable security definer set search_path='' as $$declare caller uuid:=auth.uid();begin if not private.is_support_admin(caller) then raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';end if;return jsonb_build_object('tickets',coalesce((select jsonb_agg(to_jsonb(x)order by x.updated_at desc)from(select t.id,t.protocol,t.cnpj,t.queue_id,t.service_id,t.requester_name,t.priority,t.tags,t.due_at,t.status,t.assigned_to,m.display_name agent_name,t.created_at,t.updated_at,t.completed_at,s.score satisfaction_score,extract(epoch from(coalesce(t.first_response_at,clock_timestamp())-t.created_at))/60 response_minutes,extract(epoch from(coalesce(t.completed_at,clock_timestamp())-t.created_at))/60 total_minutes from public.support_tickets t left join public.app_members m on m.user_id=t.assigned_to left join public.support_satisfaction s on s.ticket_id=t.id order by t.updated_at desc limit 500)x),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(x)order by x.created_at desc)from(select e.id,e.action,e.created_at,e.details,t.protocol,m.display_name actor_name from private.support_ticket_events e join public.support_tickets t on t.id=e.ticket_id left join public.app_members m on m.user_id=e.actor_id order by e.created_at desc limit 500)x),'[]'::jsonb));end;$$;

alter table public.support_quick_replies enable row level security;alter table public.support_attachments enable row level security;alter table public.support_satisfaction enable row level security;
revoke all on public.support_quick_replies,public.support_attachments,public.support_satisfaction from public,anon,authenticated;
create policy support_quick_read on public.support_quick_replies for select to authenticated using(enabled);
create policy support_attachment_read on public.support_attachments for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id and(t.assigned_to=auth.uid()or private.is_support_admin(auth.uid()))));
create policy support_storage_insert on storage.objects for insert to authenticated with check(bucket_id='support-attachments' and exists(select 1 from public.support_tickets t where t.id=(storage.foldername(name))[1]::uuid and(t.assigned_to=auth.uid()or private.is_support_admin(auth.uid()))));
create policy support_storage_read on storage.objects for select to authenticated using(bucket_id='support-attachments' and exists(select 1 from public.support_tickets t where t.id=(storage.foldername(name))[1]::uuid and(t.assigned_to=auth.uid()or private.is_support_admin(auth.uid()))));

revoke all on function public.support_mark_read(uuid),public.support_update_metadata(uuid,text,text[],timestamptz,integer),public.get_support_quick_replies(),public.admin_update_support_schedule(uuid,time,time,smallint[],text,integer),public.support_register_attachment(uuid,text,text,text,bigint),public.get_support_attachments(uuid),public.submit_support_satisfaction(text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.support_mark_read(uuid),public.support_update_metadata(uuid,text,text[],timestamptz,integer),public.get_support_quick_replies(),public.admin_update_support_schedule(uuid,time,time,smallint[],text,integer),public.support_register_attachment(uuid,text,text,text,bigint),public.get_support_attachments(uuid) to authenticated;
grant execute on function public.submit_support_satisfaction(text,text,text,integer,text) to service_role;

commit;
