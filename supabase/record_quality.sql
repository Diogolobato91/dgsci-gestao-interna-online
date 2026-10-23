-- Preserva cadastros legados; valida somente inclusões e alterações dos campos correspondentes.
create or replace function private.validate_sat_region_quality() returns trigger
language plpgsql security invoker set search_path='' as $$
declare next_key text; old_key text;
begin
 if tg_op='INSERT' or new.gbm is distinct from old.gbm or new.sat is distinct from old.sat then
  new.gbm:=btrim(new.gbm);new.sat:=btrim(new.sat);
  if new.gbm is null or length(new.gbm) not between 1 and 180 or new.sat is null or length(new.sat) not between 1 and 180 then raise exception 'Informe a unidade e a SAT (até 180 caracteres).' using errcode='22023';end if;
  next_key:=lower(regexp_replace(new.gbm,'\s+',' ','g'))||chr(31)||lower(regexp_replace(new.sat,'\s+',' ','g'));
  if tg_op='UPDATE' then old_key:=lower(regexp_replace(btrim(old.gbm),'\s+',' ','g'))||chr(31)||lower(regexp_replace(btrim(old.sat),'\s+',' ','g'));end if;
  if next_key is distinct from old_key then
   perform pg_advisory_xact_lock(hashtextextended('sat-region:'||next_key,0));
   if exists(select 1 from public.sat_regions r where r.id<>new.id and lower(regexp_replace(btrim(r.gbm),'\s+',' ','g'))||chr(31)||lower(regexp_replace(btrim(r.sat),'\s+',' ','g'))=next_key) then raise exception 'Já existe uma SAT cadastrada com essa unidade e identificação.' using errcode='23505';end if;
  end if;
 end if;
 if (tg_op='INSERT' or new.municipios is distinct from old.municipios) and length(coalesce(new.municipios,''))>4000 then raise exception 'Municípios de abrangência: use até 4000 caracteres.' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_sat_region_quality() from public,anon,authenticated;
drop trigger if exists validate_sat_region_quality on public.sat_regions;
create trigger validate_sat_region_quality before insert or update on public.sat_regions for each row execute function private.validate_sat_region_quality();
