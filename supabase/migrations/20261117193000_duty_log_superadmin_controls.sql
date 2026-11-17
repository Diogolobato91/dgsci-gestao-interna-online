begin;

alter table private.duty_log_events drop constraint duty_log_events_action_check;
alter table private.duty_log_events drop constraint duty_log_events_part_id_fkey;
alter table private.duty_log_events alter column part_id drop not null;
alter table private.duty_log_events add constraint duty_log_events_part_id_fkey foreign key(part_id) references public.duty_log_parts(id) on delete set null;
alter table private.duty_log_events add constraint duty_log_events_action_check check(action in ('opened','saved','closed','reviewed','admin_edited','admin_deleted'));

create or replace function private.is_duty_log_superadmin(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.app_members member where member.user_id=p_user and member.enabled and member.role='administrator'
 and array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']::text[] <@ member.sectors);
$$;

create or replace function public.get_duty_log_snapshot(p_day date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare target_day date:=coalesce(p_day,(now() at time zone 'America/Fortaleza')::date);access_role text;selected_part jsonb;
begin
 access_role:=private.require_duty_log_reader(target_day);
 select to_jsonb(part) into selected_part from public.duty_log_parts part where service_date=target_day;
 return jsonb_build_object('date',target_day,'access',access_role,'is_superadmin',private.is_duty_log_superadmin((select auth.uid())),'part',selected_part,
 'can_open',selected_part is null and target_day=(now() at time zone 'America/Fortaleza')::date and exists(select 1 from public.plantao_roster where service_date=target_day),
 'history',coalesce((select jsonb_agg(to_jsonb(history) order by history.service_date desc) from(
 select id,service_date,calendar_year,part_number,status,chief_name,updated_at,closed_at,reviewed_at,version from public.duty_log_parts
 where service_date between target_day-interval '45 days' and target_day+interval '1 day' and private.duty_log_team_role(service_date,(select auth.uid()))<>'none')history),'[]'::jsonb));
end;$$;

create or replace function public.admin_update_duty_log_part(p_id uuid,p_version integer,p_secretary_name text,p_content jsonb,p_handover jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;previous jsonb;
begin
 if not private.is_duty_log_superadmin((select auth.uid())) then raise exception 'A edição excepcional é exclusiva do superadministrador.' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Informe uma justificativa com pelo menos 10 caracteres.' using errcode='22023';end if;
 select * into part from public.duty_log_parts where id=p_id for update;
 if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
 if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada. Atualize antes de editar.' using errcode='40001';end if;
 if jsonb_typeof(p_content)<>'object' or length(p_content::text)>120000 or jsonb_typeof(p_handover)<>'object' or length(p_handover::text)>12000 then raise exception 'Conteúdo inválido ou muito extenso.' using errcode='22023';end if;
 previous:=jsonb_build_object('version',part.version,'status',part.status,'secretary_name',part.secretary_name,'content',part.content,'handover',part.handover);
 update public.duty_log_parts set secretary_name=left(btrim(coalesce(p_secretary_name,'')),180),content=p_content,handover=p_handover,version=version+1,updated_at=clock_timestamp(),updated_by=(select auth.uid()) where id=p_id returning * into part;
 insert into private.duty_log_events(part_id,action,actor_id,details) values(part.id,'admin_edited',(select auth.uid()),jsonb_build_object('reason',btrim(p_reason),'previous',previous,'new_version',part.version));
 return to_jsonb(part);
end;$$;

create or replace function public.admin_delete_duty_log_part(p_id uuid,p_version integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare part public.duty_log_parts%rowtype;
begin
 if not private.is_duty_log_superadmin((select auth.uid())) then raise exception 'A exclusão é exclusiva do superadministrador.' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Informe uma justificativa com pelo menos 10 caracteres.' using errcode='22023';end if;
 select * into part from public.duty_log_parts where id=p_id for update;
 if not found then raise exception 'Parte não encontrada.' using errcode='P0002';end if;
 if p_version is null or p_version<>part.version then raise exception 'A Parte foi alterada. Atualize antes de excluir.' using errcode='40001';end if;
 insert into private.duty_log_events(part_id,action,actor_id,details) values(part.id,'admin_deleted',(select auth.uid()),jsonb_build_object('reason',btrim(p_reason),'deleted_part',to_jsonb(part)));
 delete from public.duty_log_parts where id=part.id;
end;$$;

revoke all on function private.is_duty_log_superadmin(uuid),public.admin_update_duty_log_part(uuid,integer,text,jsonb,jsonb,text),public.admin_delete_duty_log_part(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.admin_update_duty_log_part(uuid,integer,text,jsonb,jsonb,text),public.admin_delete_duty_log_part(uuid,integer,text) to authenticated;
commit;
