begin;

-- A gestão recebe as avaliações sem expor a tabela diretamente ao navegador.
-- Mantém o mesmo acesso restrito a Diretoria e Subdiretoria da função anterior.
create or replace function public.get_support_admin_history()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
begin
  if not private.is_support_admin(caller) then
    raise exception 'Acesso exclusivo da Diretoria ou Subdiretoria' using errcode='42501';
  end if;

  return jsonb_build_object(
    'tickets',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from (
        select t.id,t.protocol,t.cnpj,t.queue_id,t.service_id,t.requester_name,t.priority,t.tags,t.due_at,
          t.status,t.assigned_to,m.display_name agent_name,t.created_at,t.updated_at,t.completed_at,
          s.score satisfaction_score,s.comment satisfaction_comment,s.created_at satisfaction_created_at,
          extract(epoch from(coalesce(t.first_response_at,clock_timestamp())-t.created_at))/60 response_minutes,
          extract(epoch from(coalesce(t.completed_at,clock_timestamp())-t.created_at))/60 total_minutes
        from public.support_tickets t
        left join public.app_members m on m.user_id=t.assigned_to
        left join public.support_satisfaction s on s.ticket_id=t.id
        order by t.updated_at desc
        limit 500
      ) x
    ),'[]'::jsonb),
    'events',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select e.id,e.action,e.created_at,e.details,t.protocol,m.display_name actor_name
        from private.support_ticket_events e
        join public.support_tickets t on t.id=e.ticket_id
        left join public.app_members m on m.user_id=e.actor_id
        order by e.created_at desc
        limit 500
      ) x
    ),'[]'::jsonb)
  );
end;
$$;

commit;
