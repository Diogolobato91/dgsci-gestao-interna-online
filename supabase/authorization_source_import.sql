-- Importações documentais feitas exclusivamente pelo proprietário do banco.
-- Clientes autenticados mantêm a validação de competência e não controlam dados de origem.
create or replace function private.validate_authorization() returns trigger language plpgsql set search_path='' as $$
declare source_import boolean:=current_user='postgres' and (select auth.uid()) is null and new.source_key like 'pdf:%' and coalesce(new.source_values->>'sha256','')~'^[a-f0-9]{64}$' and new.source_row>0;
begin
 if tg_op='INSERT' and new.competencia is null and not source_import then raise exception 'Informe a competência mensal' using errcode='22023';end if;
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
