begin;

-- Cada anexo novo pertence a uma única mensagem. Registros antigos continuam válidos
-- e permanecem disponíveis pela lista lateral de anexos.
create unique index if not exists support_attachments_one_message_idx
  on public.support_attachments(message_id)
  where message_id is not null;

-- O anexo enviado pelo cidadão cria a mensagem e o vínculo na mesma operação.
create or replace function public.register_support_attachment_public(
  p_protocol text,
  p_cnpj text,
  p_access_hash text,
  p_file_name text,
  p_file_path text,
  p_mime_type text,
  p_size bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tid uuid;
  message_row jsonb;
  message_uuid uuid;
  attachment_row public.support_attachments%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação exclusiva do serviço' using errcode='42501';
  end if;

  select public.prepare_support_attachment_public(p_protocol,p_cnpj,p_access_hash) into tid;
  if tid is null then return null; end if;

  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf')
    or p_size not between 1 and 10485760
    or p_file_path not like tid::text || '/%'
  then
    raise exception 'Arquivo inválido' using errcode='22023';
  end if;

  message_row := public.append_support_customer_message(
    p_protocol,p_cnpj,p_access_hash,'Arquivo anexado: ' || left(btrim(p_file_name),200)
  );
  message_uuid := (message_row->>'id')::uuid;

  insert into public.support_attachments(ticket_id,message_id,file_name,file_path,mime_type,size_bytes)
  values(tid,message_uuid,left(btrim(p_file_name),200),p_file_path,p_mime_type,p_size)
  returning * into attachment_row;

  return to_jsonb(attachment_row);
end;
$$;

-- O envio pela equipe segue a mesma regra e preserva as transições de status
-- aplicadas por support_send_message.
create or replace function public.support_register_attachment(
  p_ticket uuid,
  p_file_name text,
  p_file_path text,
  p_mime_type text,
  p_size bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  message_row jsonb;
  message_uuid uuid;
  attachment_row public.support_attachments%rowtype;
begin
  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf')
    or p_size not between 1 and 10485760
    or p_file_path not like p_ticket::text || '/%'
  then
    raise exception 'Arquivo inválido' using errcode='22023';
  end if;

  message_row := public.support_send_message(
    p_ticket,'Arquivo enviado: ' || left(btrim(p_file_name),200)
  );
  message_uuid := (message_row->>'id')::uuid;

  insert into public.support_attachments(ticket_id,message_id,uploaded_by,file_name,file_path,mime_type,size_bytes)
  values(p_ticket,message_uuid,auth.uid(),left(btrim(p_file_name),200),p_file_path,p_mime_type,p_size)
  returning * into attachment_row;

  return to_jsonb(attachment_row);
end;
$$;

-- O histórico interno não pode converter valores de situação (por exemplo,
-- "in_progress") em UUID. Também devolve o identificador do anexo ligado à mensagem.
create or replace function public.get_support_ticket_messages(
  p_ticket uuid,
  p_before timestamptz default null,
  p_limit integer default 10
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  caller uuid := auth.uid();
  ticket_row public.support_tickets%rowtype;
  safe_limit integer := least(greatest(coalesce(p_limit,10),1),10);
begin
  select * into ticket_row from public.support_tickets where id=p_ticket;
  if not found or not(ticket_row.assigned_to=caller or private.is_support_admin(caller)) then
    raise exception 'Atendimento não autorizado' using errcode='42501';
  end if;

  return coalesce((with timeline as (
    select
      'message:' || sm.id::text item_key,
      sm.id::text id,
      sm.ticket_id,
      sm.author_kind,
      null::text event_action,
      case
        when sm.author_kind='customer' then ticket_row.requester_name
        when sm.author_kind='system' then 'Sistema'
        else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI')))
      end actor_label,
      sm.body,
      sa.id attachment_id,
      sm.created_at
    from public.support_messages sm
    left join public.app_members am on am.user_id=sm.actor_id
    left join auth.users au on au.id=sm.actor_id
    left join public.support_attachments sa on sa.message_id=sm.id
    where sm.ticket_id=p_ticket

    union all

    select
      'event:' || e.id::text,
      null::text,
      e.ticket_id,
      'system',
      e.action,
      'Registro do atendimento',
      case
        when e.action='assigned' then 'Atendimento designado para ' || coalesce(target.display_name,'atendente')
        when e.action='transferred' then coalesce(actor.display_name,'DGSCI') || ' transferiu o atendimento de ' || coalesce(source.display_name,'atendente anterior') || ' para ' || coalesce(target.display_name,'novo atendente') || '. Motivo: ' || coalesce(e.details->>'reason','não informado')
        when e.action='started' then 'Atendimento iniciado por ' || coalesce(actor.display_name,'DGSCI')
        when e.action='completed' then 'Atendimento finalizado por ' || coalesce(actor.display_name,'DGSCI')
      end,
      null::uuid,
      e.created_at
    from private.support_ticket_events e
    left join public.app_members actor on actor.user_id=e.actor_id
    left join public.app_members source on source.user_id = case
      when (e.details->>'from') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'from')::uuid
      else null
    end
    left join public.app_members target on target.user_id = case
      when e.action='assigned' and (e.details->>'agent_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'agent_id')::uuid
      when e.action='transferred' and (e.details->>'to') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'to')::uuid
      else null
    end
    where e.ticket_id=p_ticket and e.action in ('assigned','transferred','started','completed')
  ), page as (
    select * from timeline
    where p_before is null or created_at<p_before
    order by created_at desc,item_key desc
    limit safe_limit
  )
  select jsonb_agg(to_jsonb(page) order by created_at,item_key) from page),'[]'::jsonb);
end;
$$;

-- A consulta pública recebe somente o identificador do anexo; a Edge Function
-- gera o link temporário após validar o protocolo e a chave do cidadão.
create or replace function public.get_support_conversation_page_public(
  p_protocol text,
  p_cnpj text,
  p_access_hash text,
  p_before timestamptz default null,
  p_limit integer default 10
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  ticket_row public.support_tickets%rowtype;
  position integer;
  message_rows jsonb;
  has_more boolean;
  oldest timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';
  end if;
  if p_limit not between 1 and 50 then
    raise exception 'Limite inválido' using errcode='22023';
  end if;

  select * into ticket_row
  from public.support_tickets
  where protocol=upper(btrim(p_protocol))
    and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g')
    and public_access_hash=p_access_hash;
  if not found then return null; end if;

  if ticket_row.status='queued' then
    select count(*)::integer into position
    from public.support_tickets t
    where t.queue_id=ticket_row.queue_id
      and t.status='queued'
      and (t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);
  else
    position:=0;
  end if;

  with timeline as (
    select
      'message:' || sm.id::text id,
      sm.author_kind author,
      case
        when sm.author_kind='customer' then ticket_row.requester_name
        when sm.author_kind='system' then 'Sistema'
        else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI')))
      end actor_label,
      sm.body,
      sa.id attachment_id,
      sm.created_at
    from public.support_messages sm
    left join public.app_members am on am.user_id=sm.actor_id
    left join auth.users au on au.id=sm.actor_id
    left join public.support_attachments sa on sa.message_id=sm.id
    where sm.ticket_id=ticket_row.id

    union all

    select
      'event:' || e.id::text,
      'system',
      'Registro do atendimento',
      case
        when e.action='assigned' then 'Atendimento designado para ' || coalesce(target.display_name,'atendente')
        when e.action='transferred' then coalesce(actor.display_name,'DGSCI') || ' transferiu o atendimento de ' || coalesce(source.display_name,'atendente anterior') || ' para ' || coalesce(target.display_name,'novo atendente')
        when e.action='started' then 'Atendimento iniciado por ' || coalesce(actor.display_name,'DGSCI')
        when e.action='completed' then 'Atendimento finalizado por ' || coalesce(actor.display_name,'DGSCI')
      end,
      null::uuid,
      e.created_at
    from private.support_ticket_events e
    left join public.app_members actor on actor.user_id=e.actor_id
    left join public.app_members source on source.user_id = case
      when (e.details->>'from') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'from')::uuid
      else null
    end
    left join public.app_members target on target.user_id = case
      when e.action='assigned' and (e.details->>'agent_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'agent_id')::uuid
      when e.action='transferred' and (e.details->>'to') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e.details->>'to')::uuid
      else null
    end
    where e.ticket_id=ticket_row.id and e.action in ('assigned','transferred','started','completed')
  ), page as (
    select * from timeline
    where p_before is null or created_at<p_before
    order by created_at desc,id desc
    limit p_limit
  )
  select coalesce(jsonb_agg(to_jsonb(page) order by created_at,id),'[]'::jsonb),min(created_at)
  into message_rows,oldest from page;

  select exists(
    select 1 from (
      select sm.created_at from public.support_messages sm where sm.ticket_id=ticket_row.id
      union all
      select e.created_at from private.support_ticket_events e where e.ticket_id=ticket_row.id and e.action in ('assigned','transferred','started','completed')
    ) timeline_rows
    where timeline_rows.created_at < coalesce(oldest,'infinity'::timestamptz)
  ) into has_more;

  return jsonb_build_object(
    'protocol',ticket_row.protocol,
    'queue_id',ticket_row.queue_id,
    'queue_label',(select label from public.support_queues where id=ticket_row.queue_id),
    'service_id',ticket_row.service_id,
    'service_label',(select label from public.support_services where id=ticket_row.service_id),
    'status',ticket_row.status,
    'people_ahead',position,
    'created_at',ticket_row.created_at,
    'updated_at',ticket_row.updated_at,
    'assigned_name',(select display_name from public.app_members where user_id=ticket_row.assigned_to),
    'messages',message_rows,
    'has_more',has_more,
    'ticket_id',ticket_row.id
  );
end;
$$;

revoke all on function public.register_support_attachment_public(text,text,text,text,text,text,bigint),public.support_register_attachment(uuid,text,text,text,bigint),public.get_support_ticket_messages(uuid,timestamptz,integer),public.get_support_conversation_page_public(text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.support_register_attachment(uuid,text,text,text,bigint),public.get_support_ticket_messages(uuid,timestamptz,integer) to authenticated;
grant execute on function public.register_support_attachment_public(text,text,text,text,text,text,bigint),public.get_support_conversation_page_public(text,text,text,timestamptz,integer) to service_role;

commit;
