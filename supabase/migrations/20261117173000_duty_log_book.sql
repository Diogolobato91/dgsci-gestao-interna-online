begin;

create table public.duty_log_parts (
  id uuid primary key default gen_random_uuid(),
  service_date date not null unique,
  calendar_year integer generated always as (extract(year from service_date)::integer) stored,
  part_number integer generated always as (extract(doy from service_date)::integer) stored,
  status text not null default 'draft' check (status in ('draft','closed','reviewed')),
  chief_name text not null check (length(chief_name) between 2 and 180),
  secretary_name text not null default '' check (length(secretary_name) <= 180),
  team jsonb not null default '[]'::jsonb check (jsonb_typeof(team)='array' and length(team::text)<=12000),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object' and length(content::text)<=120000),
  handover jsonb not null default '{}'::jsonb check (jsonb_typeof(handover)='object' and length(handover::text)<=12000),
  version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null references auth.users(id),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid not null references auth.users(id),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_note text not null default '' check (length(review_note)<=2000),
  check (service_date >= date '2020-01-01' and service_date <= date '2200-12-31'),
  check ((status='draft' and closed_at is null and closed_by is null) or (status<>'draft' and closed_at is not null and closed_by is not null)),
  check ((status<>'reviewed' and reviewed_at is null and reviewed_by is null) or (status='reviewed' and reviewed_at is not null and reviewed_by is not null))
);

create index duty_log_parts_recent_idx on public.duty_log_parts(service_date desc);

create table private.duty_log_events (
  id bigint generated always as identity primary key,
  part_id uuid not null references public.duty_log_parts(id) on delete restrict,
  action text not null check (action in ('opened','saved','closed','reviewed')),
  actor_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default clock_timestamp(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object' and length(details::text)<=12000)
);
create index duty_log_events_part_idx on private.duty_log_events(part_id,occurred_at);

alter table public.duty_log_parts enable row level security;
revoke all on public.duty_log_parts from public,anon,authenticated;
revoke all on private.duty_log_events from public,anon,authenticated;

create or replace function private.is_duty_log_manager(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.app_members m
    where m.user_id=p_user and m.enabled
      and m.sectors && array['Secretaria','Subdiretoria','Diretoria']
  );
$$;

create or replace function private.duty_log_team_role(p_day date,p_user uuid default auth.uid()) returns text
language sql stable security definer set search_path='' as $$
  select case
    when private.is_duty_log_manager(p_user) then 'manager'
    else coalesce((
      select case person.id
        when roster.chief_id then 'chief'
        when roster.assistant_id then 'assistant'
        when roster.expert_id then 'expert'
      end
      from public.user_registrations registration
      join public.app_members member on member.user_id=registration.user_id and member.enabled
      join public.staff staff
        on regexp_replace(registration.cpf,'\D','','g')=regexp_replace(staff.cpf,'\D','','g')
       and regexp_replace(registration.matricula,'[^0-9]','','g')<>''
       and regexp_replace(registration.matricula,'[^0-9]','','g')=regexp_replace(staff.mf,'[^0-9]','','g')
      join public.roster_people person on person.staff_id=staff.id
      join public.plantao_roster roster on roster.service_date=p_day
       and person.id in (roster.chief_id,roster.assistant_id,roster.expert_id)
      where registration.user_id=p_user and registration.status='approved'
      limit 1
    ),'none')
  end;
$$;

create or replace function private.require_duty_log_reader(p_day date) returns text
language plpgsql stable security definer set search_path='' as $$
declare access_role text;
begin
  if not exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled) then
    raise exception 'Acesso não autorizado.' using errcode='42501';
  end if;
  access_role:=private.duty_log_team_role(p_day,(select auth.uid()));
  if access_role='none' then raise exception 'Livro disponível somente para a equipe do plantão e a Administração.' using errcode='42501';end if;
  return access_role;
end;
$$;

create policy duty_log_read on public.duty_log_parts for select to authenticated
using (private.duty_log_team_role(service_date,(select auth.uid()))<>'none');

create or replace function public.get_duty_log_snapshot(p_day date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  target_day date:=coalesce(p_day,(now() at time zone 'America/Fortaleza')::date);
  access_role text;
  selected_part jsonb;
begin
  access_role:=private.require_duty_log_reader(target_day);
  select to_jsonb(part) into selected_part from public.duty_log_parts part where service_date=target_day;
  return jsonb_build_object(
    'date',target_day,
    'access',access_role,
    'part',selected_part,
    'can_open',selected_part is null and target_day=(now() at time zone 'America/Fortaleza')::date
      and exists(select 1 from public.plantao_roster where service_date=target_day),
    'history',coalesce((
      select jsonb_agg(to_jsonb(history) order by history.service_date desc)
      from (
        select id,service_date,calendar_year,part_number,status,chief_name,updated_at,closed_at,reviewed_at,version
        from public.duty_log_parts
        where service_date between target_day-interval '45 days' and target_day+interval '1 day'
          and private.duty_log_team_role(service_date,(select auth.uid()))<>'none'
      ) history
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.open_duty_log_part() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  day date:=(now() at time zone 'America/Fortaleza')::date;
  access_role text;
  roster public.plantao_roster%rowtype;
  created public.duty_log_parts%rowtype;
  team_data jsonb;
  chief_label text;
begin
  access_role:=private.require_duty_log_reader(day);
  if access_role not in ('chief','manager') then raise exception 'Somente o Chefe do Plantão pode abrir a Parte.' using errcode='42501';end if;
  select * into roster from public.plantao_roster where service_date=day;
  if not found then raise exception 'Cadastre a escala do dia antes de abrir a Parte.' using errcode='22023';end if;
  select jsonb_agg(jsonb_build_object('role',roles.label,'person_id',person.id,'name',person.posto_graduacao||' '||person.nome) order by roles.position),
    max(case when roles.position=1 then person.posto_graduacao||' '||person.nome end)
  into team_data,chief_label
  from (values (1,'Chefe do Plantão',roster.chief_id),(2,'Aux. e Cond. do Perito',roster.assistant_id),(3,'Perito de Incêndio',roster.expert_id)) roles(position,label,person_id)
  join public.roster_people person on person.id=roles.person_id;
  insert into public.duty_log_parts(service_date,chief_name,team,content,handover,created_by,updated_by)
  values(day,chief_label,team_data,
    jsonb_build_object(
      'receipt',jsonb_build_object('time','07:00','previous_chief','','notes','Recebi o serviço com todas as ordens em vigor.'),
      'substitutions','[]'::jsonb,
      'cleaning',jsonb_build_object('changed',false,'notes',''),
      'rounds','[]'::jsonb,
      'flag',jsonb_build_object('changed',false,'notes',''),
      'energy','[]'::jsonb,
      'fueling',jsonb_build_object('changed',false,'notes',''),
      'vehicles',jsonb_build_object('changed',false,'notes',''),
      'materials','[]'::jsonb,
      'documents','[]'::jsonb,
      'inspections','[]'::jsonb,
      'participations','[]'::jsonb
    ),
    jsonb_build_object('time','07:00','successor','','notes',''),
    (select auth.uid()),(select auth.uid()))
  on conflict(service_date) do nothing returning * into created;
  if created.id is null then select * into created from public.duty_log_parts where service_date=day;end if;
  insert into private.duty_log_events(part_id,action,actor_id) values(created.id,'opened',(select auth.uid()));
  return to_jsonb(created);
end;
$$;

create or replace function public.save_duty_log_part(p_id uuid,p_version integer,p_secretary_name text,p_content jsonb,p_handover jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;access_role text;
begin
  select * into part from public.duty_log_parts where id=p_id for update;
  if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
  access_role:=private.require_duty_log_reader(part.service_date);
  if part.status<>'draft' then raise exception 'A Parte encerrada não pode ser alterada. Registre uma retificação.' using errcode='22023';end if;
  if access_role not in ('chief','assistant','expert','manager') then raise exception 'Usuário sem permissão para preencher esta Parte.' using errcode='42501';end if;
  if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada por outra pessoa. Atualize antes de salvar.' using errcode='40001';end if;
  if jsonb_typeof(p_content)<>'object' or length(p_content::text)>120000 or jsonb_typeof(p_handover)<>'object' or length(p_handover::text)>12000 then
    raise exception 'Conteúdo inválido ou muito extenso.' using errcode='22023';
  end if;
  update public.duty_log_parts set secretary_name=left(btrim(coalesce(p_secretary_name,'')),180),content=p_content,handover=p_handover,
    version=version+1,updated_at=clock_timestamp(),updated_by=(select auth.uid()) where id=p_id returning * into part;
  insert into private.duty_log_events(part_id,action,actor_id,details) values(part.id,'saved',(select auth.uid()),jsonb_build_object('version',part.version));
  return to_jsonb(part);
end;
$$;

create or replace function public.close_duty_log_part(p_id uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;access_role text;
begin
  select * into part from public.duty_log_parts where id=p_id for update;
  if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
  access_role:=private.require_duty_log_reader(part.service_date);
  if access_role not in ('chief','manager') then raise exception 'Somente o Chefe do Plantão pode encerrar a Parte.' using errcode='42501';end if;
  if part.status<>'draft' then raise exception 'Esta Parte já foi encerrada.' using errcode='22023';end if;
  if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada. Atualize antes de encerrar.' using errcode='40001';end if;
  if length(btrim(coalesce(part.handover->>'successor','')))<2 then raise exception 'Informe quem recebeu a passagem do serviço.' using errcode='22023';end if;
  update public.duty_log_parts set status='closed',version=version+1,updated_at=clock_timestamp(),updated_by=(select auth.uid()),closed_at=clock_timestamp(),closed_by=(select auth.uid()) where id=p_id returning * into part;
  insert into private.duty_log_events(part_id,action,actor_id) values(part.id,'closed',(select auth.uid()));
  return to_jsonb(part);
end;
$$;

create or replace function public.review_duty_log_part(p_id uuid,p_version integer,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;
begin
  if not private.is_duty_log_manager((select auth.uid())) then raise exception 'Visto restrito à Administração.' using errcode='42501';end if;
  select * into part from public.duty_log_parts where id=p_id for update;
  if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
  if part.status<>'closed' then raise exception 'Somente uma Parte encerrada pode receber o visto.' using errcode='22023';end if;
  if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada. Atualize antes de confirmar.' using errcode='40001';end if;
  update public.duty_log_parts set status='reviewed',review_note=left(btrim(coalesce(p_note,'')),2000),version=version+1,
    updated_at=clock_timestamp(),updated_by=(select auth.uid()),reviewed_at=clock_timestamp(),reviewed_by=(select auth.uid()) where id=p_id returning * into part;
  insert into private.duty_log_events(part_id,action,actor_id) values(part.id,'reviewed',(select auth.uid()));
  return to_jsonb(part);
end;
$$;

revoke all on function private.is_duty_log_manager(uuid),private.duty_log_team_role(date,uuid),private.require_duty_log_reader(date) from public,anon,authenticated;
revoke all on function public.get_duty_log_snapshot(date),public.open_duty_log_part(),public.save_duty_log_part(uuid,integer,text,jsonb,jsonb),public.close_duty_log_part(uuid,integer),public.review_duty_log_part(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.get_duty_log_snapshot(date),public.open_duty_log_part(),public.save_duty_log_part(uuid,integer,text,jsonb,jsonb),public.close_duty_log_part(uuid,integer),public.review_duty_log_part(uuid,integer,text) to authenticated;

commit;
