-- Base compartilhada de estabelecimentos; a origem integral fica preservada em schema privado.
create function private.establishment_access(manage boolean default false) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.app_members where user_id=(select auth.uid()) and enabled and cardinality(sectors)>0 and (not manage or sectors && array['Secretaria','Diretoria','Subdiretoria']::text[]));
$$;
revoke all on function private.establishment_access(boolean) from public,anon,authenticated;
grant execute on function private.establishment_access(boolean) to authenticated;
create table public.establishments(
 id uuid primary key default gen_random_uuid(),
 source_key text unique,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=20000),
 nome text generated always as (data->>'razao') stored,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid,
 updated_by_name text not null default 'Importação institucional'
);
create index establishments_division on public.establishments((data->>'divisao'));
alter table public.establishments enable row level security;
revoke all on public.establishments from public,anon,authenticated;
grant select,insert,update on public.establishments to authenticated;
create policy establishments_read on public.establishments for select to authenticated using((select private.establishment_access(false)));
create policy establishments_create on public.establishments for insert to authenticated with check((select private.establishment_access(true)));
create policy establishments_change on public.establishments for update to authenticated using((select private.establishment_access(true))) with check((select private.establishment_access(true)));
create table private.establishment_sources(source_key text primary key,source_values jsonb not null,source_sha text not null,imported_at timestamptz not null default now());
alter table private.establishment_sources enable row level security;
revoke all on private.establishment_sources from public,anon,authenticated;
create policy establishment_sources_deny on private.establishment_sources for all to authenticated using(false) with check(false);
create table public.establishment_import(
 id integer primary key check(id=1),source_title text not null,source_sha text not null,tabs jsonb not null,record_count integer not null check(record_count>=0),imported_at timestamptz not null default now()
);
alter table public.establishment_import enable row level security;
revoke all on public.establishment_import from public,anon,authenticated;
grant select on public.establishment_import to authenticated;
create policy establishment_import_read on public.establishment_import for select to authenticated using((select private.establishment_access(false)));
create function private.stamp_establishment() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());k text;begin
 if actor is not null and not private.establishment_access(true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if jsonb_typeof(new.data) is distinct from 'object' or octet_length(new.data::text)>20000 or length(trim(coalesce(new.data->>'razao','')))<2 or length(new.data->>'razao')>500 then raise exception 'Informe uma razão social válida.' using errcode='22023';end if;
 if coalesce(new.data->>'divisao','')!~'^[A-JLMN]-([1-9]|10)$' then raise exception 'Informe a divisão do estabelecimento.' using errcode='22023';end if;
 if coalesce(new.data->>'normalizedStatus','')<>all(array['REGULAR','VENCIDO','PARADO','SEM_SISGAT','DESATIVADO']) then raise exception 'Informe a classificação da situação.' using errcode='22023';end if;
 for k in select jsonb_object_keys(new.data) loop
  if k<>all(array['tab','itemNum','pasta','razao','cnpj','cnae','descricao','endereco','numeroImovel','bairro','cep','setor','setorNome','setorCor','setorHex','grupo','grupoNome','divisao','divisaoDescricao','divisaoExemplos','area','pavimentos','cargaIncendio','cargaDisplay','risco','lotacao','projetoAprovado','protocoloProjeto','statusAtivo','situacao','observacao','normalizedStatus']) or jsonb_typeof(new.data->k) not in('string','number','null') then raise exception 'Campo cadastral inválido.' using errcode='22023';end if;
  if length(new.data->>k)>4000 then raise exception 'Campo excede o tamanho permitido.' using errcode='22023';end if;
  if actor is not null and coalesce(new.data->>k,'')~'[<>]' then raise exception 'Não utilize marcação HTML nos campos.' using errcode='22023';end if;
 end loop;
 new.data:=jsonb_set(new.data,'{razao}',to_jsonb(trim(new.data->>'razao')));
 if tg_op='UPDATE' then new.id:=old.id;new.source_key:=old.source_key;new.created_at:=old.created_at;new.version:=old.version+1;
 else new.created_at:=now();new.version:=1;if actor is not null then new.source_key:=null;end if;end if;
 new.updated_at:=clock_timestamp();new.updated_by:=actor;new.updated_by_name:=coalesce((select display_name from public.app_members where user_id=actor),'Importação institucional');return new;
end;$$;
revoke all on function private.stamp_establishment() from public,anon,authenticated;
create trigger stamp_establishment before insert or update on public.establishments for each row execute function private.stamp_establishment();
create trigger capture_audit_event after insert or update on public.establishments for each row execute function private.capture_audit_event();
create function public.get_establishments_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not private.establishment_access(false) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 return jsonb_build_object(
 'companies',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'version',version,'updated_at',updated_at,'updated_by_name',updated_by_name) order by source_key nulls last,id) from public.establishments),'[]'::jsonb),
 'vistorias','[]'::jsonb,
 'loadedTabs',coalesce((select tabs from public.establishment_import where id=1),'[]'::jsonb),
 'timestamp',(select max(updated_at) from public.establishments),
 'import',(select to_jsonb(i) from public.establishment_import i where id=1));
end;$$;
revoke all on function public.get_establishments_snapshot() from public,anon,authenticated;
grant execute on function public.get_establishments_snapshot() to authenticated;
