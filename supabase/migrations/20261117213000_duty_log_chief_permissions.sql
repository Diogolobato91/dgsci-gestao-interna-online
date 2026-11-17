begin;

-- A abertura e o encerramento são atos do Chefe do Plantão. O
-- superadministrador conserva acesso excepcional para continuidade operacional.
create or replace function public.get_duty_log_snapshot(p_day date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare target_day date:=coalesce(p_day,(now() at time zone 'America/Fortaleza')::date);access_role text;selected_part jsonb;superadmin boolean;
begin
 access_role:=private.require_duty_log_reader(target_day);
 superadmin:=private.is_duty_log_superadmin((select auth.uid()));
 select to_jsonb(part) into selected_part from public.duty_log_parts part where service_date=target_day;
 return jsonb_build_object('date',target_day,'access',access_role,'is_superadmin',superadmin,'part',selected_part,
 'can_open',selected_part is null
   and target_day=(now() at time zone 'America/Fortaleza')::date
   and (access_role='chief' or superadmin)
   and exists(select 1 from public.plantao_roster where service_date=target_day),
 'history',coalesce((select jsonb_agg(to_jsonb(history) order by history.service_date desc) from(
 select id,service_date,calendar_year,part_number,status,chief_name,updated_at,closed_at,reviewed_at,version from public.duty_log_parts
 where service_date between target_day-interval '45 days' and target_day+interval '1 day' and private.duty_log_team_role(service_date,(select auth.uid()))<>'none')history),'[]'::jsonb));
end;$$;

create or replace function public.open_duty_log_part() returns jsonb
language plpgsql security definer set search_path='' as $$
declare day date:=(now() at time zone 'America/Fortaleza')::date;access_role text;roster public.plantao_roster%rowtype;created public.duty_log_parts%rowtype;team_data jsonb;chief_label text;
begin
 access_role:=private.require_duty_log_reader(day);
 if access_role<>'chief' and not private.is_duty_log_superadmin((select auth.uid())) then raise exception 'Somente o Chefe do Plantão pode abrir a Parte.' using errcode='42501';end if;
 select * into roster from public.plantao_roster where service_date=day;
 if not found then raise exception 'Cadastre a escala do dia antes de abrir a Parte.' using errcode='22023';end if;
 select jsonb_agg(jsonb_build_object('role',roles.label,'person_id',person.id,'name',person.posto_graduacao||' '||person.nome) order by roles.position),max(case when roles.position=1 then person.posto_graduacao||' '||person.nome end)
 into team_data,chief_label from (values (1,'Chefe do Plantão',roster.chief_id),(2,'Aux. e Cond. do Perito',roster.assistant_id),(3,'Perito de Incêndio',roster.expert_id)) roles(position,label,person_id) join public.roster_people person on person.id=roles.person_id;
 insert into public.duty_log_parts(service_date,chief_name,team,content,handover,created_by,updated_by)
 values(day,chief_label,team_data,jsonb_build_object('receipt',jsonb_build_object('time','07:00','previous_chief','','notes','Recebi o serviço com todas as ordens em vigor.'),'substitutions','[]'::jsonb,'cleaning',jsonb_build_object('changed',false,'notes',''),'rounds','[]'::jsonb,'flag',jsonb_build_object('changed',false,'notes',''),'energy','[]'::jsonb,'fueling',jsonb_build_object('changed',false,'notes',''),'vehicles',jsonb_build_object('changed',false,'notes',''),'materials','[]'::jsonb,'documents','[]'::jsonb,'inspections','[]'::jsonb,'participations','[]'::jsonb),jsonb_build_object('time','07:00','successor','','notes',''),(select auth.uid()),(select auth.uid()))
 on conflict(service_date) do nothing returning * into created;
 if created.id is null then select * into created from public.duty_log_parts where service_date=day;else insert into private.duty_log_events(part_id,action,actor_id) values(created.id,'opened',(select auth.uid()));end if;
 return to_jsonb(created);
end;$$;

create or replace function public.close_duty_log_part(p_id uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;access_role text;
begin
 select * into part from public.duty_log_parts where id=p_id for update;
 if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
 access_role:=private.require_duty_log_reader(part.service_date);
 if access_role<>'chief' and not private.is_duty_log_superadmin((select auth.uid())) then raise exception 'Somente o Chefe do Plantão pode encerrar a Parte.' using errcode='42501';end if;
 if part.status<>'draft' then raise exception 'Esta Parte já foi encerrada.' using errcode='22023';end if;
 if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada. Atualize antes de encerrar.' using errcode='40001';end if;
 if length(btrim(coalesce(part.handover->>'successor','')))<2 then raise exception 'Informe quem recebeu a passagem do serviço.' using errcode='22023';end if;
 update public.duty_log_parts set status='closed',version=version+1,updated_at=clock_timestamp(),updated_by=(select auth.uid()),closed_at=clock_timestamp(),closed_by=(select auth.uid()) where id=p_id returning * into part;
 insert into private.duty_log_events(part_id,action,actor_id) values(part.id,'closed',(select auth.uid()));
 return to_jsonb(part);
end;$$;

revoke all on function public.get_duty_log_snapshot(date),public.open_duty_log_part(),public.close_duty_log_part(uuid,integer) from public,anon,authenticated;
grant execute on function public.get_duty_log_snapshot(date),public.open_duty_log_part(),public.close_duty_log_part(uuid,integer) to authenticated;

commit;
