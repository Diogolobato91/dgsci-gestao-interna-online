begin;

create table public.memorial_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity,
  memorial_type text not null check (memorial_type in ('structural_safety','brigade','hydrant_calculation','descriptive')),
  protocol text not null default '' check (length(protocol)<=80),
  company_name text not null check (length(trim(company_name)) between 2 and 180),
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  contact_name text not null default '' check (length(contact_name)<=180),
  contact_email text not null check (length(contact_email)<=254),
  status text not null default 'waiting_customer' check (status in ('waiting_customer','submitted','under_review','corrections_requested','approved','signed','cancelled','expired')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object' and length(data::text)<=300000),
  internal_note text not null default '' check (length(internal_note)<=6000),
  return_note text not null default '' check (length(return_note)<=3000),
  link_hash text not null unique check (link_hash ~ '^[0-9a-f]{64}$'),
  link_expires_at timestamptz not null,
  link_revoked_at timestamptz,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null references auth.users(id),
  updated_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  approved_at timestamptz,
  signed_at timestamptz,
  signed_by uuid references auth.users(id),
  signed_by_name text not null default '' check (length(signed_by_name)<=180),
  signature_upload_path text not null default '' check (length(signature_upload_path)<=500),
  signature_started_by uuid references auth.users(id),
  final_pdf_path text not null default '' check (length(final_pdf_path)<=500),
  final_pdf_sha256 text not null default '' check (final_pdf_sha256='' or final_pdf_sha256 ~ '^[0-9a-f]{64}$'),
  unique(request_number),
  check ((status='signed' and signed_at is not null and signed_by is not null and final_pdf_path<>'' and final_pdf_sha256<>'') or status<>'signed')
);

create index memorial_requests_status_recent_idx on public.memorial_requests(status,created_at desc);
create index memorial_requests_company_cnpj_idx on public.memorial_requests(cnpj);

create table public.memorial_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.memorial_requests(id) on delete restrict,
  action text not null check (action in ('created','opened','saved','submitted','review_started','returned','approved','signature_upload_started','signed','link_revoked','link_renewed','cancelled')),
  actor_id uuid references auth.users(id),
  actor_label text not null default '' check (length(actor_label)<=180),
  occurred_at timestamptz not null default clock_timestamp(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object' and length(details::text)<=8000)
);

create index memorial_events_request_idx on public.memorial_events(request_id,occurred_at);
alter table public.memorial_requests enable row level security;
alter table public.memorial_events enable row level security;
revoke all on public.memorial_requests,public.memorial_events from public,anon,authenticated;
grant select,insert,update,delete on public.memorial_requests,public.memorial_events to service_role;
grant usage,select on sequence public.memorial_requests_request_number_seq to service_role;
grant usage,select on sequence public.memorial_events_id_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('memorial-final-pdfs','memorial-final-pdfs',false,20971520,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['application/pdf'];

commit;
