-- Salvar dias diferentes da mesma semana atomicamente, preservando RLS e gatilhos.
create or replace function private.save_cleaning_week(p_days jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare item jsonb;day_date date;expected_version integer;week_start date;first_week date;seen date[]:='{}';saved integer:=0;
begin
 if not private.cleaning_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_days is null or jsonb_typeof(p_days)<>'array' then raise exception 'Selecione os dias da semana.' using errcode='22023';end if;
 if jsonb_array_length(p_days) not between 1 and 7 then raise exception 'Informe de um a sete dias da mesma semana.' using errcode='22023';end if;
 -- Ordem estável dos locks para requisições concorrentes com dias sobrepostos.
 for item in select value from jsonb_array_elements(p_days) order by value->>'service_date' loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'service_date','')!~'^\d{4}-\d{2}-\d{2}$' or coalesce(item->>'version','')!~'^\d{1,9}$' then raise exception 'Data ou versão inválida.' using errcode='22023';end if;
  day_date:=(item->>'service_date')::date;
  expected_version:=(item->>'version')::integer;
  if day_date=any(seen) then raise exception 'Dia repetido no preenchimento.' using errcode='22023';end if;
  week_start:=date_trunc('week',day_date::timestamp)::date;
  if first_week is null then first_week:=week_start;end if;
  if week_start<>first_week then raise exception 'Os dias devem pertencer à mesma semana.' using errcode='22023';end if;
  seen:=array_append(seen,day_date);
 end loop;
 for item in select value from jsonb_array_elements(p_days) order by value->>'service_date' loop
  day_date:=(item->>'service_date')::date;
  expected_version:=(item->>'version')::integer;
  perform pg_advisory_xact_lock(73426,day_date-'1900-01-01'::date);
  if expected_version=0 then
   begin
    insert into public.cleaning_roster(service_date,assignments,notes)values(day_date,item->'assignments',coalesce(item->>'notes',''));
   exception when unique_violation then
    raise exception 'A escala de % foi cadastrada por outra pessoa. Reabra a semana para conferir. Nenhum dia foi salvo.',to_char(day_date,'DD/MM/YYYY') using errcode='40001';
   end;
  else
   update public.cleaning_roster set assignments=item->'assignments',notes=coalesce(item->>'notes','') where service_date=day_date and version=expected_version;
   if not found then raise exception 'A escala de % foi alterada por outra pessoa. Reabra a semana para conferir. Nenhum dia foi salvo.',to_char(day_date,'DD/MM/YYYY') using errcode='40001';end if;
  end if;
  saved:=saved+1;
 end loop;
 return saved;
end;$$;
revoke all on function private.save_cleaning_week(jsonb) from public,anon,authenticated;
grant execute on function private.save_cleaning_week(jsonb) to authenticated;
create or replace function public.save_cleaning_week(p_days jsonb) returns integer
language sql security invoker set search_path='' as $$select private.save_cleaning_week(p_days);$$;
revoke all on function public.save_cleaning_week(jsonb) from public,anon,authenticated;
grant execute on function public.save_cleaning_week(jsonb) to authenticated;
