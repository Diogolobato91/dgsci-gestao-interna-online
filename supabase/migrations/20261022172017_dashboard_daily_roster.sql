-- Consulta limitada ao plantão de hoje. Não amplia a leitura do efetivo,
-- planejamento mensal, histórico de escalas ou dados pessoais cadastrais.
create or replace function private.today_duty() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  day date := (now() at time zone 'America/Fortaleza')::date;
  duty public.plantao_roster%rowtype;
  team jsonb;
  review boolean;
begin
  if not exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0) then
    raise exception 'Acesso não autorizado.' using errcode='42501';
  end if;
  select * into duty from public.plantao_roster where service_date=day;
  if not found then
    return jsonb_build_object('date',day,'registered',false,'needs_review',false,'team','[]'::jsonb);
  end if;
  select jsonb_agg(jsonb_build_object('role',v.label,'nome',p.nome,'posto',p.posto_graduacao,
    'contato',coalesce(r.contato,p.contato)) order by v.position),
    coalesce(bool_or(exists(select 1 from public.staff_absences a where a.staff_id=p.staff_id
      and a.cancelled_at is null and day between a.starts_on and a.ends_on)),false)
    into team,review
  from (values(1,'Chefe do Plantão',duty.chief_id),(2,'Aux. e Cond do Perito',duty.assistant_id),
    (3,'Perito de Incêndio',duty.expert_id)) v(position,label,person_id)
  join public.roster_people p on p.id=v.person_id
  left join public.staff s on s.id=p.staff_id
  left join lateral (
    select reg.contato from public.user_registrations reg
    where reg.status='approved' and reg.contato is not null
      and regexp_replace(reg.cpf,'\D','','g')=regexp_replace(s.cpf,'\D','','g')
      and regexp_replace(reg.matricula,'[^0-9]','','g')<>''
      and regexp_replace(reg.matricula,'[^0-9]','','g')=regexp_replace(s.mf,'[^0-9]','','g')
      and exists(select 1 from public.app_members m where m.user_id=reg.user_id and m.enabled)
    limit 1
  ) r on true;
  return jsonb_build_object('date',day,'registered',true,'needs_review',review,'team',team);
end;$$;
revoke all on function private.today_duty() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.today_duty() to authenticated;
create or replace function public.get_today_duty() returns jsonb
language sql stable security invoker set search_path='' as $$select private.today_duty();$$;
revoke all on function public.get_today_duty() from public,anon,authenticated;
grant execute on function public.get_today_duty() to authenticated;
