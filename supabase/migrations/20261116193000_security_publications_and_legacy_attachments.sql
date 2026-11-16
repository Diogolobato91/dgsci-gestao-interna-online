-- Menor privilégio para a biblioteca pública: visitantes somente consultam.
revoke insert, update, delete, truncate, references, trigger
on table public.publications
from anon;

grant select on table public.publications to anon;

-- Regulariza anexos anteriores à vinculação obrigatória com mensagens.
-- Primeiro reaproveita a mensagem histórica exata. Quando ela não existe,
-- reconstrói apenas o registro visual do envio, preservando arquivo e horário.
do $$
declare
  attachment record;
  matched_message uuid;
begin
  for attachment in
    select *
    from public.support_attachments
    where message_id is null
    order by created_at, id
  loop
    select message.id
    into matched_message
    from public.support_messages as message
    where message.ticket_id = attachment.ticket_id
      and message.created_at between attachment.created_at - interval '10 minutes'
                                 and attachment.created_at + interval '10 minutes'
      and message.body ilike '%' || attachment.file_name || '%'
      and not exists (
        select 1
        from public.support_attachments as linked
        where linked.message_id = message.id
      )
    order by abs(extract(epoch from (message.created_at - attachment.created_at)))
    limit 1;

    if matched_message is null then
      insert into public.support_messages(ticket_id, author_kind, actor_id, body, created_at)
      values (
        attachment.ticket_id,
        case when attachment.uploaded_by is null then 'customer' else 'agent' end,
        attachment.uploaded_by,
        case when attachment.uploaded_by is null then 'Arquivo anexado: ' else 'Arquivo enviado: ' end || attachment.file_name,
        attachment.created_at
      )
      returning id into matched_message;
    end if;

    update public.support_attachments
    set message_id = matched_message
    where id = attachment.id;
  end loop;
end
$$;
