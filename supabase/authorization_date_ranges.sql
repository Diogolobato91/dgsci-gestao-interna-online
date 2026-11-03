begin;
-- Datas explícitas: não inferir ano/mês de textos incompletos das fontes históricas.
alter table public.authorizations add column if not exists data_inicio date, add column if not exists data_fim date;
alter table public.authorization_period_budgets add column if not exists data_inicio date, add column if not exists data_fim date;
-- Saldos mensais existentes preservam o intervalo exato que já representavam.
update public.authorization_period_budgets set data_inicio=competencia,data_fim=(competencia+interval '1 month - 1 day')::date where data_inicio is null;
alter table public.authorization_period_budgets alter column data_inicio set not null,alter column data_fim set not null;
alter table public.authorization_period_budgets drop constraint if exists authorization_period_budgets_competencia_unidade_key;
create unique index if not exists authorization_budget_range_unit_key on public.authorization_period_budgets(data_inicio,data_fim,unidade);
create index if not exists authorization_service_start_idx on public.authorizations(data_inicio);
create or replace function private.stamp_finance_budget() returns trigger language plpgsql set search_path='' as $$begin
 if new.data_inicio is null or new.data_fim is null or new.data_inicio<'1900-01-01'::date or new.data_fim>'9999-12-31'::date or new.data_fim<new.data_inicio then raise exception 'Informe início e fim válidos para o saldo' using errcode='22023';end if;
 new.competencia:=date_trunc('month',new.data_inicio)::date;
 new.unidade:=upper(btrim(new.unidade));new.updated_at:=clock_timestamp();new.updated_by:=auth.uid();
 if tg_op='UPDATE' then new.version:=old.version+1;else new.version:=1;end if;return new;
end;$$;
create or replace function private.validate_authorization() returns trigger language plpgsql set search_path='' as $$
declare source_import boolean:=current_user='postgres' and (select auth.uid()) is null and new.source_key like 'pdf:%' and coalesce(new.source_values->>'sha256','')~'^[a-f0-9]{64}$' and new.source_row>0;
begin
 if (new.data_inicio is null) <> (new.data_fim is null) or (new.data_inicio is not null and (new.data_inicio<'1900-01-01'::date or new.data_fim>'9999-12-31'::date or new.data_fim<new.data_inicio)) then raise exception 'Informe início e fim válidos; o fim não pode anteceder o início' using errcode='22023';end if;
 if tg_op='INSERT' and new.data_inicio is null and not source_import then raise exception 'Informe início e fim do serviço' using errcode='22023';end if;
 -- Competência legada deixa de ser entrada do usuário; mantém compatibilidade interna.
 if new.data_inicio is not null then new.competencia:=date_trunc('month',new.data_inicio)::date;end if;
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
 elsif source_import then
  new.version:=1;new.created_at:=clock_timestamp();
 else
  new.source_key:='manual:'||new.id::text;new.source_row:=0;new.source_values:='{}';new.status:=null;new.version:=1;new.created_at:=clock_timestamp();
 end if;return new;
end;$$;
revoke all on function private.validate_authorization() from public,anon,authenticated;

create or replace function public.get_diarias_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 with records as(select id,category,source_row as "linhaFonte",protocolo,unidade,referencia,destino,qtd_efetivo as "qtdEfetivo",periodo,
 valor_despesa as "valorDespesa",valor_arrecadado as "valorArrecadado",workflow_status as "workflowStatus",status as "situacaoOriginal",
 case workflow_status when 'autorizado' then 'Autorizado' when 'pago' then 'Pago' when 'cancelado' then 'Cancelado' else 'Aguardando' end as status,
 data_inicio as "dataInicio",data_fim as "dataFim",competencia,data_autorizacao as "dataAutorizacao",observacao,version from public.authorizations)
 select jsonb_build_object('fonte',coalesce((select source_label from public.import_batches where kind='diarias'),'Controle DGSCI'),
 'importadoEm',(select imported_at from public.import_batches where kind='diarias'),
 'sat',coalesce((select jsonb_agg(to_jsonb(r) order by "linhaFonte",id) from records r where category='sat'),'[]'::jsonb),
 'dgsci',coalesce((select jsonb_agg(to_jsonb(r) order by "linhaFonte",id) from records r where category='dgsci'),'[]'::jsonb),
 'saldos',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,source_row as "linhaFonte",saldo_df as "saldoDF",informado_em as "informadoEm",despesa_sat as "despesaSAT",despesa_dgsci as "despesaDGSCI",saldo_atual as "saldoAtual" from public.authorization_balances)t),'[]'::jsonb),
 'budgets',coalesce((select jsonb_agg(to_jsonb(b) order by competencia desc,unidade) from public.authorization_period_budgets b),'[]'::jsonb));
$$;

commit;
