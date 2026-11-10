-- O atendimento público não coleta telefone nem e-mail.
-- Esses campos permanecem disponíveis para registros antigos, mas passam a ser opcionais.

alter table public.support_tickets
  alter column phone drop not null,
  alter column email drop not null;

alter table public.support_tickets
  drop constraint if exists support_tickets_phone_check,
  drop constraint if exists support_tickets_email_check;

alter table public.support_tickets
  add constraint support_tickets_phone_check
    check (phone is null or phone ~ '^[0-9]{10,11}$'),
  add constraint support_tickets_email_check
    check (email is null or length(email) between 5 and 254);

create or replace function public.create_support_ticket(
  p_service text,
  p_cnpj text,
  p_requester text,
  p_phone text,
  p_email text,
  p_city text,
  p_reference text,
  p_summary text,
  p_access_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_row public.support_services%rowtype;
  ticket_id uuid;
  result jsonb;
  clean_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação exclusiva do serviço de atendimento' using errcode = '42501';
  end if;

  select * into service_row
  from public.support_services
  where id = p_service and enabled;

  if not found then
    raise exception 'Serviço inválido' using errcode = '22023';
  end if;
  if not private.is_valid_cnpj(clean_cnpj) then
    raise exception 'CNPJ inválido' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_requester, ''))) not between 3 and 160
    or (clean_phone <> '' and clean_phone !~ '^[0-9]{10,11}$')
    or (clean_email <> '' and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or length(btrim(coalesce(p_city, ''))) not between 2 and 120
    or length(btrim(coalesce(p_summary, ''))) not between 10 and 1500
    or coalesce(p_access_hash, '') !~ '^[a-f0-9]{64}$'
  then
    raise exception 'Confira os dados obrigatórios' using errcode = '22023';
  end if;

  insert into public.support_tickets(
    protocol, queue_id, service_id, cnpj, requester_name, phone, email,
    city, external_reference, summary, public_access_hash
  ) values (
    private.next_support_protocol(), service_row.queue_id, service_row.id,
    clean_cnpj, btrim(p_requester), nullif(clean_phone, ''), nullif(clean_email, ''),
    btrim(p_city), btrim(coalesce(p_reference, '')), btrim(p_summary), p_access_hash
  ) returning id into ticket_id;

  insert into private.support_ticket_events(ticket_id, action, details)
  values(ticket_id, 'created', jsonb_build_object('queue_id', service_row.queue_id, 'service_id', service_row.id));

  insert into public.support_messages(ticket_id, author_kind, body)
  values(ticket_id, 'customer', btrim(p_summary));

  perform private.assign_support_ticket(ticket_id);

  select jsonb_build_object(
    'id', t.id,
    'protocol', t.protocol,
    'queue_id', t.queue_id,
    'status', t.status,
    'created_at', t.created_at
  ) into result
  from public.support_tickets t
  where t.id = ticket_id;

  return result;
end;
$$;
