begin;

create table public.support_queues(
  id text primary key check(id in('inspection','fines','projects','accreditation','access')),
  label text not null unique,
  universal boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);

insert into public.support_queues(id,label,universal) values
 ('inspection','Seção de Vistoria',false),
 ('fines','Seção de Multa',false),
 ('projects','Seção de Análise de Projeto',false),
 ('accreditation','Seção de Credenciamento de Empresas e Profissionais',false),
 ('access','Acesso e Senha',true)
on conflict(id) do update set label=excluded.label,universal=excluded.universal;

create table public.support_services(
  id text primary key,
  queue_id text not null references public.support_queues(id),
  label text not null,
  sort_order integer not null check(sort_order>0),
  enabled boolean not null default true,
  unique(queue_id,label)
);

insert into public.support_services(id,queue_id,label,sort_order) values
 ('renew-license','inspection','Renovar licenciamento',10),
 ('request-inspection','inspection','Solicitar vistoria',20),
 ('track-inspection','inspection','Acompanhar vistoria',30),
 ('inspection-question','inspection','Pendência ou dúvida sobre vistoria',40),
 ('general-guidance','inspection','Outro assunto ou orientação geral',50),
 ('debt-query','fines','Consultar débito ou multa',60),
 ('fine-payment','fines','Pagamento ou regularização',70),
 ('fine-defense','fines','Defesa ou recurso',80),
 ('fine-question','fines','Outra dúvida sobre multa',90),
 ('submit-project','projects','Solicitar análise de projeto',100),
 ('track-project','projects','Acompanhar análise',110),
 ('project-correction','projects','Corrigir pendência do projeto',120),
 ('project-question','projects','Orientação sobre projeto',130),
 ('new-accreditation','accreditation','Novo credenciamento',140),
 ('renew-accreditation','accreditation','Renovar credenciamento',150),
 ('track-accreditation','accreditation','Acompanhar credenciamento',160),
 ('accreditation-documents','accreditation','Documentação de credenciamento',170),
 ('password-reset','access','Resetar senha',180)
on conflict(id) do update set queue_id=excluded.queue_id,label=excluded.label,sort_order=excluded.sort_order;

create table public.support_agents(
  user_id uuid primary key references public.app_members(user_id) on delete cascade,
  queue_ids text[] not null default '{}'::text[] check(queue_ids <@ array['inspection','fines','projects','accreditation']::text[]),
  available boolean not null default true,
  capacity smallint not null default 5 check(capacity=5),
  last_assigned_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references auth.users(id)
);

create sequence private.support_protocol_seq;

create table public.support_tickets(
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  queue_id text not null references public.support_queues(id),
  service_id text not null references public.support_services(id),
  cnpj text not null check(cnpj ~ '^[0-9]{14}$'),
  requester_name text not null check(length(btrim(requester_name)) between 3 and 160),
  phone text not null check(phone ~ '^[0-9]{10,11}$'),
  email text not null check(length(email) between 5 and 254),
  city text not null check(length(btrim(city)) between 2 and 120),
  external_reference text not null default '' check(length(external_reference)<=160),
  summary text not null check(length(btrim(summary)) between 20 and 1500),
  public_access_hash text not null check(length(public_access_hash)=64),
  status text not null default 'queued' check(status in('queued','assigned','in_progress','waiting_customer','completed','cancelled')),
  assigned_to uuid references public.support_agents(user_id),
  assigned_at timestamptz,
  first_response_at timestamptz,
  completed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check(status<>'queued' or assigned_to is null),
  check(status not in('assigned','in_progress','waiting_customer') or assigned_to is not null)
);

create index support_tickets_queue_waiting_idx on public.support_tickets(queue_id,created_at,id) where status='queued';
create index support_tickets_agent_active_idx on public.support_tickets(assigned_to,status,updated_at) where status in('assigned','in_progress','waiting_customer');
create index support_tickets_cnpj_idx on public.support_tickets(cnpj,created_at desc);

create table public.support_messages(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_kind text not null check(author_kind in('customer','agent','system')),
  actor_id uuid references auth.users(id),
  body text not null check(length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp(),
  check((author_kind='agent' and actor_id is not null) or author_kind<>'agent')
);
create index support_messages_ticket_idx on public.support_messages(ticket_id,created_at,id);

create table private.support_ticket_events(
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  action text not null check(action in('created','assigned','started','waiting_customer','resumed','completed','cancelled','message')),
  actor_id uuid references auth.users(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index support_ticket_events_ticket_idx on private.support_ticket_events(ticket_id,created_at,id);

create function private.is_valid_cnpj(raw text) returns boolean language plpgsql immutable set search_path='' as $$
declare digits text:=regexp_replace(coalesce(raw,''),'\D','','g');sum_value integer;weight integer;digit integer;i integer;begin
 if length(digits)<>14 or digits~'^([0-9])\1{13}$' then return false;end if;
 for digit in 13..14 loop
  sum_value:=0;weight:=digit-8;
  for i in 1..digit-1 loop
   sum_value:=sum_value+substring(digits from i for 1)::integer*weight;weight:=weight-1;if weight=1 then weight:=9;end if;
  end loop;
  if (case when sum_value%11<2 then 0 else 11-sum_value%11 end)<>substring(digits from digit for 1)::integer then return false;end if;
 end loop;
 return true;
end;$$;

create function private.is_support_admin(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.app_members m where m.user_id=p_user and m.enabled and m.sectors&&array['Diretoria','Subdiretoria']);
$$;

create function private.is_support_agent(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.support_agents a join public.app_members m on m.user_id=a.user_id where a.user_id=p_user and a.available and m.enabled);
$$;

create function private.next_support_protocol() returns text language sql volatile security definer set search_path='' as $$
 select 'DGSCI-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('private.support_protocol_seq')::text,6,'0');
$$;

create function private.support_active_count(p_user uuid) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from public.support_tickets where assigned_to=p_user and status in('assigned','in_progress','waiting_customer');
$$;

create function private.assign_support_ticket(p_ticket uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;agent_id uuid;begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or ticket_row.status<>'queued' then return ticket_row.assigned_to;end if;
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));
 select a.user_id into agent_id from public.support_agents a join public.app_members m on m.user_id=a.user_id
 where a.available and m.enabled and (ticket_row.queue_id='access' or ticket_row.queue_id=any(a.queue_ids))
 and private.support_active_count(a.user_id)<a.capacity
 order by private.support_active_count(a.user_id),a.last_assigned_at nulls first,a.user_id for update of a skip locked limit 1;
 if agent_id is null then return null;end if;
 update public.support_tickets set assigned_to=agent_id,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=agent_id;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details) values(p_ticket,'assigned',null,jsonb_build_object('agent_id',agent_id));
 return agent_id;
end;$$;

create function private.fill_support_agent(p_user uuid) returns integer language plpgsql security definer set search_path='' as $$
declare agent_row public.support_agents%rowtype;ticket_id uuid;assigned integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-dispatch',0));
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-agent:'||p_user::text,0));
 select * into agent_row from public.support_agents where user_id=p_user and available for update;
 if not found or not exists(select 1 from public.app_members where user_id=p_user and enabled) then return 0;end if;
 while private.support_active_count(p_user)<agent_row.capacity loop
  select t.id into ticket_id from public.support_tickets t where t.status='queued' and (t.queue_id='access' or t.queue_id=any(agent_row.queue_ids))
  order by t.created_at,t.id for update skip locked limit 1;
  exit when ticket_id is null;
  update public.support_tickets set assigned_to=p_user,assigned_at=clock_timestamp(),status='assigned',updated_at=clock_timestamp(),version=version+1 where id=ticket_id;
  update public.support_agents set last_assigned_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where user_id=p_user;
  insert into private.support_ticket_events(ticket_id,action,actor_id,details) values(ticket_id,'assigned',null,jsonb_build_object('agent_id',p_user));
  assigned:=assigned+1;
 end loop;
 return assigned;
end;$$;

revoke all on function private.is_valid_cnpj(text),private.is_support_admin(uuid),private.is_support_agent(uuid),private.next_support_protocol(),private.support_active_count(uuid),private.assign_support_ticket(uuid),private.fill_support_agent(uuid) from public,anon,authenticated;
grant execute on function private.is_support_admin(uuid),private.is_support_agent(uuid) to authenticated;

alter table public.support_queues enable row level security;
alter table public.support_services enable row level security;
alter table public.support_agents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table private.support_ticket_events enable row level security;
revoke all on public.support_queues,public.support_services,public.support_agents,public.support_tickets,public.support_messages from public,anon,authenticated;
revoke all on private.support_ticket_events from public,anon,authenticated;
grant select on public.support_queues,public.support_services to authenticated;
grant select on public.support_agents,public.support_tickets,public.support_messages to authenticated;

create policy support_catalog_read on public.support_queues for select to authenticated using(true);
create policy support_services_read on public.support_services for select to authenticated using(true);
create policy support_agents_read on public.support_agents for select to authenticated using(user_id=(select auth.uid()) or private.is_support_admin((select auth.uid())));
create policy support_tickets_read on public.support_tickets for select to authenticated using(assigned_to=(select auth.uid()) or private.is_support_admin((select auth.uid())));
create policy support_messages_read on public.support_messages for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.assigned_to=(select auth.uid()) or private.is_support_admin((select auth.uid())))));

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='support_tickets')then alter publication supabase_realtime add table public.support_tickets;end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='support_messages')then alter publication supabase_realtime add table public.support_messages;end if;
 end if;
end$$;

create function public.admin_set_support_agent(p_user uuid,p_queue_ids text[],p_available boolean,p_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.support_agents%rowtype;clean_queues text[];begin
 if not private.is_support_admin(auth.uid()) then raise exception 'Apenas Diretoria ou Subdiretoria pode configurar atendentes' using errcode='42501';end if;
 if p_queue_ids is null or not p_queue_ids<@array['inspection','fines','projects','accreditation']::text[] then raise exception 'Fila inválida' using errcode='22023';end if;
 select coalesce(array_agg(distinct q order by q),'{}'::text[]) into clean_queues from unnest(p_queue_ids) q;
 if not exists(select 1 from public.app_members where user_id=p_user and enabled and sectors&&array['Vistoriador','Análise','Multas','Credenciamento']) then raise exception 'Usuário indisponível para atendimento' using errcode='22023';end if;
 select * into current_row from public.support_agents where user_id=p_user for update;
 if found then
  if p_version is null or p_version<>current_row.version then raise exception 'O atendente foi alterado por outra pessoa' using errcode='40001';end if;
  update public.support_agents set queue_ids=clean_queues,available=p_available,updated_at=clock_timestamp(),updated_by=auth.uid(),version=version+1 where user_id=p_user;
 else
  insert into public.support_agents(user_id,queue_ids,available,updated_by) values(p_user,clean_queues,p_available,auth.uid());
 end if;
 if p_available then perform private.fill_support_agent(p_user);end if;
 return (select to_jsonb(a)-'last_assigned_at' from public.support_agents a where user_id=p_user);
end;$$;

create function public.create_support_ticket(p_service text,p_cnpj text,p_requester text,p_phone text,p_email text,p_city text,p_reference text,p_summary text,p_access_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare service_row public.support_services%rowtype;ticket_id uuid;result jsonb;clean_cnpj text:=regexp_replace(coalesce(p_cnpj,''),'\D','','g');clean_phone text:=regexp_replace(coalesce(p_phone,''),'\D','','g');begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into service_row from public.support_services where id=p_service and enabled;
 if not found then raise exception 'Serviço inválido' using errcode='22023';end if;
 if not private.is_valid_cnpj(clean_cnpj) then raise exception 'CNPJ inválido' using errcode='22023';end if;
 if length(btrim(coalesce(p_requester,''))) not between 3 and 160 or clean_phone!~'^[0-9]{10,11}$' or coalesce(p_email,'')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(btrim(coalesce(p_city,''))) not between 2 and 120 or length(btrim(coalesce(p_summary,''))) not between 20 and 1500 or coalesce(p_access_hash,'')!~'^[a-f0-9]{64}$' then raise exception 'Confira os dados obrigatórios' using errcode='22023';end if;
 insert into public.support_tickets(protocol,queue_id,service_id,cnpj,requester_name,phone,email,city,external_reference,summary,public_access_hash)
 values(private.next_support_protocol(),service_row.queue_id,service_row.id,clean_cnpj,btrim(p_requester),clean_phone,lower(btrim(p_email)),btrim(p_city),btrim(coalesce(p_reference,'')),btrim(p_summary),p_access_hash) returning id into ticket_id;
 insert into private.support_ticket_events(ticket_id,action,details) values(ticket_id,'created',jsonb_build_object('queue_id',service_row.queue_id,'service_id',service_row.id));
 insert into public.support_messages(ticket_id,author_kind,body) values(ticket_id,'customer',btrim(p_summary));
 perform private.assign_support_ticket(ticket_id);
 select jsonb_build_object('id',t.id,'protocol',t.protocol,'queue_id',t.queue_id,'status',t.status,'created_at',t.created_at) into result from public.support_tickets t where t.id=ticket_id;
 return result;
end;$$;

create function public.get_support_ticket_public(p_protocol text,p_access_hash text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;position integer;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and public_access_hash=p_access_hash;
 if not found then return null;end if;
 if ticket_row.status='queued' then select count(*)::integer into position from public.support_tickets t where t.queue_id=ticket_row.queue_id and t.status='queued' and (t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);else position:=0;end if;
 return jsonb_build_object('protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'service_id',ticket_row.service_id,'status',ticket_row.status,'people_ahead',position,'created_at',ticket_row.created_at,'updated_at',ticket_row.updated_at);
end;$$;

create function public.get_my_support_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid();begin
 if not private.is_support_agent(caller) and not private.is_support_admin(caller) then raise exception 'Acesso restrito ao atendimento' using errcode='42501';end if;
 return jsonb_build_object('active_count',private.support_active_count(caller),'capacity',coalesce((select capacity from public.support_agents where user_id=caller),5),'tickets',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from(select t.id,t.protocol,t.queue_id,t.service_id,t.cnpj,t.requester_name,t.city,t.status,t.version,t.created_at,t.updated_at from public.support_tickets t where (private.is_support_admin(caller) or t.assigned_to=caller) and t.status not in('completed','cancelled') limit 500)x),'[]'::jsonb));
end;$$;

create function public.support_send_message(p_ticket uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;message_row public.support_messages%rowtype;caller uuid:=auth.uid();begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 if ticket_row.status in('queued','completed','cancelled') then raise exception 'Atendimento indisponível para mensagem' using errcode='22023';end if;
 if length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Mensagem inválida' using errcode='22023';end if;
 insert into public.support_messages(ticket_id,author_kind,actor_id,body) values(p_ticket,'agent',caller,btrim(p_body)) returning * into message_row;
 if ticket_row.status='assigned' then update public.support_tickets set status='in_progress',first_response_at=coalesce(first_response_at,clock_timestamp()),updated_at=clock_timestamp(),version=version+1 where id=p_ticket;insert into private.support_ticket_events(ticket_id,action,actor_id)values(p_ticket,'started',caller);end if;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,'message',caller,jsonb_build_object('message_id',message_row.id));
 return to_jsonb(message_row);
end;$$;

create function public.support_set_ticket_status(p_ticket uuid,p_status text,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;caller uuid:=auth.uid();action_name text;released_agent uuid;begin
 select * into ticket_row from public.support_tickets where id=p_ticket for update;
 if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then raise exception 'Atendimento não autorizado' using errcode='42501';end if;
 if ticket_row.version<>p_version then raise exception 'O atendimento foi alterado por outra pessoa' using errcode='40001';end if;
 if p_status not in('in_progress','waiting_customer','completed','cancelled') or
   (ticket_row.status='queued' and p_status<>'cancelled') or
   (ticket_row.status='assigned' and p_status not in('in_progress','completed','cancelled')) or
   (ticket_row.status='in_progress' and p_status not in('waiting_customer','completed','cancelled')) or
   (ticket_row.status='waiting_customer' and p_status not in('in_progress','completed','cancelled')) or ticket_row.status in('completed','cancelled') then raise exception 'Mudança de situação inválida' using errcode='22023';end if;
 released_agent:=ticket_row.assigned_to;
 action_name:=case p_status when 'in_progress' then case when ticket_row.status='waiting_customer' then 'resumed' else 'started' end when 'waiting_customer' then 'waiting_customer' when 'completed' then 'completed' else 'cancelled' end;
 update public.support_tickets set status=p_status,first_response_at=case when p_status='in_progress' then coalesce(first_response_at,clock_timestamp()) else first_response_at end,completed_at=case when p_status in('completed','cancelled') then clock_timestamp() else null end,updated_at=clock_timestamp(),version=version+1 where id=p_ticket;
 insert into private.support_ticket_events(ticket_id,action,actor_id,details)values(p_ticket,action_name,caller,jsonb_build_object('from',ticket_row.status,'to',p_status));
 if p_status in('completed','cancelled') and released_agent is not null then perform private.fill_support_agent(released_agent);end if;
 return (select to_jsonb(t)-'public_access_hash' from public.support_tickets t where id=p_ticket);
end;$$;

revoke all on function public.admin_set_support_agent(uuid,text[],boolean,integer),public.create_support_ticket(text,text,text,text,text,text,text,text,text),public.get_support_ticket_public(text,text),public.get_my_support_inbox(),public.support_send_message(uuid,text),public.support_set_ticket_status(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.admin_set_support_agent(uuid,text[],boolean,integer),public.get_my_support_inbox(),public.support_send_message(uuid,text),public.support_set_ticket_status(uuid,text,integer) to authenticated;
grant execute on function public.create_support_ticket(text,text,text,text,text,text,text,text,text),public.get_support_ticket_public(text,text) to service_role;

commit;
