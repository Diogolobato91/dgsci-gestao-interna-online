begin;

create or replace function private.support_welcome_customer() returns trigger
language plpgsql security definer set search_path='' as $$
declare queue_name text;
begin
  select label into queue_name from public.support_queues where id=new.queue_id;
  insert into public.support_messages(ticket_id,author_kind,body) values
    (new.id,'system','Olá, ' || split_part(new.requester_name,' ',1) || '. Recebemos sua solicitação.'),
    (new.id,'system','Você entrou na fila da ' || coalesce(queue_name,'seção responsável') || '. Nosso atendimento funciona das 8h às 18h. Aguarde nesta página e, quando o atendimento começar, responda em até 10 minutos para manter a conversa aberta.');
  return new;
end;
$$;

commit;
