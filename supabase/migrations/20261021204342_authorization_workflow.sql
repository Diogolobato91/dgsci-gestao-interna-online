begin;
alter table public.authorizations add column version integer not null default 1,
 add column competencia date check(competencia is null or extract(day from competencia)=1),
 add column workflow_status text not null default 'aguardando' check(workflow_status in ('aguardando','autorizado','pago','cancelado')),
 add column created_at timestamptz, add column updated_by uuid references auth.users(id);
-- Padroniza a situação operacional sem apagar a descrição nem os valores da origem.
drop trigger if exists authorization_updated_at on public.authorizations;
update public.authorizations set workflow_status=case
 when upper(coalesce(status,'')) like '%CANCELADO%' then 'cancelado'
 when upper(coalesce(status,'')) like '%PAGA%' then 'pago'
 when upper(coalesce(status,'')) like '%AUTORIZADO%' then 'autorizado' else 'aguardando' end;
alter table public.authorizations alter column source_key set default ('manual:'||gen_random_uuid()::text),alter column source_row set default 0;
create index authorization_competencia_unit_idx on public.authorizations(competencia,unidade);
create function private.finance_access(p_write boolean default false) returns boolean
language sql stable security invoker set search_path='' as $$select exists(select 1 from public.app_members m
 where m.user_id=(select auth.uid()) and m.enabled and case when p_write then m.sectors @> array['Subdiretoria'] else m.sectors && array['Secretaria','Diretoria','Subdiretoria'] end);$$;
revoke all on function private.finance_access(boolean) from public,anon,authenticated;
grant execute on function private.finance_access(boolean) to authenticated;
drop policy if exists authorizations_sector_read on public.authorizations;
drop policy if exists authorizations_admin_update on public.authorizations;
create policy authorizations_sector_read on public.authorizations for select to authenticated using((select private.finance_access(false)));
create policy authorizations_admin_update on public.authorizations for update to authenticated using((select private.finance_access(true))) with check((select private.finance_access(true)));
create policy authorizations_insert on public.authorizations for insert to authenticated with check((select private.finance_access(true)));
grant insert,update on public.authorizations to authenticated;
create table public.authorization_period_budgets(
 id uuid primary key default gen_random_uuid(),competencia date not null check(extract(day from competencia)=1),
 unidade text not null check(length(btrim(unidade)) between 1 and 160),
 saldo_inicial numeric(14,2) not null check(saldo_inicial::text not in ('NaN','Infinity','-Infinity')),
 observacao text not null default '' check(length(observacao)<=2000),version integer not null default 1,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),unique(competencia,unidade)
);
alter table public.authorization_period_budgets enable row level security;
revoke all on public.authorization_period_budgets from public,anon,authenticated;
grant select,insert,update on public.authorization_period_budgets to authenticated;
create policy finance_budget_read on public.authorization_period_budgets for select to authenticated using((select private.finance_access(false)));
create policy finance_budget_insert on public.authorization_period_budgets for insert to authenticated with check((select private.finance_access(true)));
create policy finance_budget_update on public.authorization_period_budgets for update to authenticated using((select private.finance_access(true))) with check((select private.finance_access(true)));
create function private.stamp_finance_budget() returns trigger language plpgsql set search_path='' as $$begin
 new.unidade:=upper(btrim(new.unidade));new.updated_at:=clock_timestamp();new.updated_by:=auth.uid();
 if tg_op='UPDATE' then new.version:=old.version+1;else new.version:=1;end if;return new;
end;$$;
revoke all on function private.stamp_finance_budget() from public,anon,authenticated;
create trigger stamp_finance_budget before insert or update on public.authorization_period_budgets for each row execute function private.stamp_finance_budget();
create table public.authorization_documents(
 id uuid primary key default gen_random_uuid(),authorization_id uuid not null references public.authorizations(id),
 path text not null unique,filename text not null check(length(filename) between 1 and 200),
 size_bytes bigint not null check(size_bytes between 1 and 20971520),content_type text not null,
 created_at timestamptz not null default now(),created_by uuid references auth.users(id)
);
create index authorization_documents_parent_idx on public.authorization_documents(authorization_id);
alter table public.authorization_documents enable row level security;
revoke all on public.authorization_documents from public,anon,authenticated;
grant select,insert on public.authorization_documents to authenticated;
create policy finance_documents_read on public.authorization_documents for select to authenticated using((select private.finance_access(false)));
create policy finance_documents_insert on public.authorization_documents for insert to authenticated with check((select private.finance_access(true)));
create table public.authorization_events(
 id uuid primary key default gen_random_uuid(),authorization_id uuid not null references public.authorizations(id),
 action text not null,actor_id uuid references auth.users(id),actor_name text not null,
 before_values jsonb,after_values jsonb not null,created_at timestamptz not null default now()
);
create index authorization_events_parent_idx on public.authorization_events(authorization_id,created_at desc);
alter table public.authorization_events enable row level security;
revoke all on public.authorization_events from public,anon,authenticated;
grant select on public.authorization_events to authenticated;
create policy finance_events_read on public.authorization_events for select to authenticated using((select private.finance_access(false)));
create function private.validate_authorization() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='INSERT' and new.competencia is null then raise exception 'Informe a competência mensal' using errcode='22023';end if;
 if new.protocolo is null or length(btrim(new.protocolo)) not between 1 and 160 then raise exception 'Informe o protocolo' using errcode='22023';end if;
 if new.unidade is null or length(btrim(new.unidade)) not between 1 and 160 then raise exception 'Informe a unidade' using errcode='22023';end if;
 if length(coalesce(new.referencia,''))>500 or length(coalesce(new.destino,''))>500 or length(coalesce(new.periodo,''))>500 or length(coalesce(new.observacao,''))>4000 or length(coalesce(new.data_autorizacao,''))>100 then raise exception 'Confira o tamanho dos campos' using errcode='22023';end if;
 if (new.valor_despesa is not null and (new.valor_despesa<0 or new.valor_despesa::text in ('NaN','Infinity','-Infinity')))
 or (new.valor_arrecadado is not null and (new.valor_arrecadado<0 or new.valor_arrecadado::text in ('NaN','Infinity','-Infinity')))
 or (new.qtd_efetivo is not null and new.qtd_efetivo<0) then raise exception 'Os valores e o efetivo não podem ser negativos' using errcode='22023';end if;
 new.protocolo:=btrim(new.protocolo);new.unidade:=upper(btrim(new.unidade));new.updated_at:=clock_timestamp();new.updated_by:=auth.uid();
 if tg_op='UPDATE' then
  if new.source_key is distinct from old.source_key or new.source_values is distinct from old.source_values or new.source_row is distinct from old.source_row or new.status is distinct from old.status then raise exception 'Os dados de origem são preservados. Use a situação operacional.' using errcode='22023';end if;
  new.version:=old.version+1;new.created_at:=old.created_at;
 else
  new.source_key:='manual:'||new.id::text;new.source_row:=0;new.source_values:='{}';new.status:=null;new.version:=1;new.created_at:=clock_timestamp();
 end if;return new;
end;$$;
revoke all on function private.validate_authorization() from public,anon,authenticated;
drop trigger if exists authorization_updated_at on public.authorizations;
create trigger validate_authorization before insert or update on public.authorizations for each row execute function private.validate_authorization();
create function private.audit_authorization() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.authorization_events(authorization_id,action,actor_id,actor_name,before_values,after_values)
 values(new.id,case when tg_op='INSERT' then 'create' else 'update' end,auth.uid(),coalesce((select display_name from public.app_members where user_id=auth.uid()),'Administração'),
 case when tg_op='UPDATE' then to_jsonb(old)-'source_values' else null end,to_jsonb(new)-'source_values');return new;
end;$$;
revoke all on function private.audit_authorization() from public,anon,authenticated;
create trigger audit_authorization after insert or update on public.authorizations for each row execute function private.audit_authorization();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dgsci-authorizations','dgsci-authorizations',false,20971520,
 array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg']);
create policy finance_files_read on storage.objects for select to authenticated using(bucket_id='dgsci-authorizations' and (select private.finance_access(false)) and
 (exists(select 1 from public.authorization_documents d where d.path=name) or (select private.finance_access(true))));
create policy finance_files_insert on storage.objects for insert to authenticated with check(bucket_id='dgsci-authorizations' and (select private.finance_access(true)) and exists(select 1 from public.authorizations a where a.id::text=split_part(name,'/',1)));
create policy finance_files_cleanup on storage.objects for delete to authenticated using(bucket_id='dgsci-authorizations' and (select private.finance_access(true)) and not exists(select 1 from public.authorization_documents d where d.path=name));
create function private.validate_authorization_document() returns trigger language plpgsql security definer set search_path='' as $$declare obj storage.objects%rowtype;begin
 if not private.finance_access(true) then raise exception 'Acesso exclusivo da Subdiretoria' using errcode='42501';end if;
 if split_part(new.path,'/',1)<>new.authorization_id::text then raise exception 'O arquivo não pertence ao processo' using errcode='22023';end if;
 select * into obj from storage.objects where bucket_id='dgsci-authorizations' and name=new.path;
 if not found or coalesce((obj.metadata->>'size')::bigint,0)<>new.size_bytes then raise exception 'Envie o documento antes de vincular ao processo' using errcode='22023';end if;
 new.created_at:=clock_timestamp();new.created_by:=auth.uid();
 insert into public.authorization_events(authorization_id,action,actor_id,actor_name,after_values)
 values(new.authorization_id,'attachment',auth.uid(),coalesce((select display_name from public.app_members where user_id=auth.uid()),'Administração'),jsonb_build_object('filename',new.filename,'path',new.path));return new;
end;$$;
revoke all on function private.validate_authorization_document() from public,anon,authenticated;
create trigger validate_authorization_document before insert on public.authorization_documents for each row execute function private.validate_authorization_document();

create or replace function public.get_diarias_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 with records as(select id,category,source_row as "linhaFonte",protocolo,unidade,referencia,destino,qtd_efetivo as "qtdEfetivo",periodo,
 valor_despesa as "valorDespesa",valor_arrecadado as "valorArrecadado",workflow_status as "workflowStatus",status as "situacaoOriginal",
 case workflow_status when 'autorizado' then 'Autorizado' when 'pago' then 'Pago' when 'cancelado' then 'Cancelado' else 'Aguardando' end as status,
 competencia,data_autorizacao as "dataAutorizacao",observacao,version from public.authorizations)
 select jsonb_build_object('fonte',coalesce((select source_label from public.import_batches where kind='diarias'),'Controle DGSCI'),
 'importadoEm',(select imported_at from public.import_batches where kind='diarias'),
 'sat',coalesce((select jsonb_agg(to_jsonb(r) order by "linhaFonte",id) from records r where category='sat'),'[]'::jsonb),
 'dgsci',coalesce((select jsonb_agg(to_jsonb(r) order by "linhaFonte",id) from records r where category='dgsci'),'[]'::jsonb),
 'saldos',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,source_row as "linhaFonte",saldo_df as "saldoDF",informado_em as "informadoEm",despesa_sat as "despesaSAT",despesa_dgsci as "despesaDGSCI",saldo_atual as "saldoAtual" from public.authorization_balances)t),'[]'::jsonb),
 'budgets',coalesce((select jsonb_agg(to_jsonb(b) order by competencia desc,unidade) from public.authorization_period_budgets b),'[]'::jsonb));
$$;
commit;
