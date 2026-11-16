-- O atendimento aceita pessoa física ou jurídica sem expor recuperação de senha.

create or replace function private.is_valid_cpf(raw text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  value text := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
  sum_value integer;
  check_digit integer;
  index_value integer;
begin
  if value !~ '^\d{11}$' or value ~ '^(\d)\1{10}$' then return false; end if;
  sum_value := 0;
  for index_value in 1..9 loop sum_value := sum_value + substring(value, index_value, 1)::integer * (11 - index_value); end loop;
  check_digit := (sum_value * 10) % 11;
  if check_digit = 10 then check_digit := 0; end if;
  if check_digit <> substring(value, 10, 1)::integer then return false; end if;
  sum_value := 0;
  for index_value in 1..10 loop sum_value := sum_value + substring(value, index_value, 1)::integer * (12 - index_value); end loop;
  check_digit := (sum_value * 10) % 11;
  if check_digit = 10 then check_digit := 0; end if;
  return check_digit = substring(value, 11, 1)::integer;
end;
$$;

alter table public.support_tickets drop constraint if exists support_tickets_cnpj_check;
alter table public.support_tickets add constraint support_tickets_cnpj_check
  check ((cnpj ~ '^\d{11}$' and private.is_valid_cpf(cnpj)) or (cnpj ~ '^\d{14}$' and private.is_valid_cnpj(cnpj)));
comment on column public.support_tickets.cnpj is 'CPF ou CNPJ do solicitante; nome mantido por compatibilidade.';

update public.support_services set enabled = false where id = 'password-reset';
update public.support_queues set enabled = false where id = 'access';

create or replace function public.create_support_ticket(
  p_service text, p_cnpj text, p_requester text, p_phone text, p_email text,
  p_city text, p_reference text, p_summary text, p_access_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  service_row public.support_services%rowtype;
  ticket_id uuid;
  result jsonb;
  clean_document text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  if auth.role() <> 'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode = '42501'; end if;
  select * into service_row from public.support_services where id = p_service and enabled;
  if not found or service_row.id = 'password-reset' then raise exception 'Serviço inválido' using errcode = '22023'; end if;
  if not ((length(clean_document) = 11 and private.is_valid_cpf(clean_document)) or (length(clean_document) = 14 and private.is_valid_cnpj(clean_document))) then
    raise exception 'CPF ou CNPJ inválido' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_requester, ''))) not between 3 and 160
    or (clean_phone <> '' and clean_phone !~ '^\d{10,11}$')
    or (clean_email <> '' and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or length(btrim(coalesce(p_city, ''))) not between 2 and 120
    or length(btrim(coalesce(p_summary, ''))) not between 10 and 1500
    or coalesce(p_access_hash, '') !~ '^[a-f0-9]{64}$'
  then raise exception 'Confira os dados obrigatórios' using errcode = '22023'; end if;

  insert into public.support_tickets(protocol, queue_id, service_id, cnpj, requester_name, phone, email, city, external_reference, summary, public_access_hash)
  values(private.next_support_protocol(), service_row.queue_id, service_row.id, clean_document, btrim(p_requester), nullif(clean_phone, ''), nullif(clean_email, ''), btrim(p_city), btrim(coalesce(p_reference, '')), btrim(p_summary), p_access_hash)
  returning id into ticket_id;
  insert into private.support_ticket_events(ticket_id, action, details) values(ticket_id, 'created', jsonb_build_object('queue_id', service_row.queue_id, 'service_id', service_row.id));
  insert into public.support_messages(ticket_id, author_kind, body) values(ticket_id, 'customer', btrim(p_summary));
  perform private.assign_support_ticket(ticket_id);
  select jsonb_build_object('id', t.id, 'protocol', t.protocol, 'queue_id', t.queue_id, 'status', t.status, 'created_at', t.created_at)
    into result from public.support_tickets t where t.id = ticket_id;
  return result;
end;
$$;

revoke all on function private.is_valid_cpf(text) from public, anon, authenticated;
revoke all on function public.create_support_ticket(text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_support_ticket(text,text,text,text,text,text,text,text,text) to service_role;
