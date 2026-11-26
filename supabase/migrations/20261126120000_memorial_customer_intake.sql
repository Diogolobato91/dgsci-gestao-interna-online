begin;

alter table public.memorial_requests
  alter column company_name set default '',
  alter column cnpj set default '',
  alter column contact_name set default '',
  alter column contact_email set default '';

alter table public.memorial_requests
  drop constraint if exists memorial_requests_company_name_check,
  drop constraint if exists memorial_requests_cnpj_check,
  drop constraint if exists memorial_requests_contact_name_check,
  drop constraint if exists memorial_requests_contact_email_check;

alter table public.memorial_requests
  add constraint memorial_requests_company_name_check
    check (length(company_name) <= 180 and (status = 'waiting_customer' and trim(company_name) = '' or length(trim(company_name)) between 2 and 180)),
  add constraint memorial_requests_cnpj_check
    check (cnpj = '' and status = 'waiting_customer' or cnpj ~ '^[0-9]{14}$'),
  add constraint memorial_requests_contact_name_check
    check (length(contact_name) <= 180 and (trim(contact_name) = '' or length(trim(contact_name)) between 2 and 180)),
  add constraint memorial_requests_contact_email_check
    check (length(contact_email) <= 254 and (trim(contact_email) = '' or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

commit;
