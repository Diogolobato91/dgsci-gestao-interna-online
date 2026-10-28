begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare record_id uuid;payload jsonb;affected integer;snapshot jsonb;begin
 payload:='{"razao":"Estabelecimento Teste","cnpj":"00000000000191","divisao":"C-1","normalizedStatus":"PARADO","endereco":"Endereço de teste"}';
 insert into public.establishments(data,source_key,version,updated_by_name)values(payload,'origem forjada',99,'Nome adulterado')returning id into record_id;
 if not exists(select 1 from public.establishments where id=record_id and source_key is null and version=1 and updated_by=auth.uid() and updated_by_name='Gestor Teste Efetivo')then raise exception 'Autoria, versão ou origem adulteradas';end if;
 update public.establishments set data=payload||'{"observacao":"Edição de teste"}' where id=record_id and version=1;
 if not exists(select 1 from public.establishments where id=record_id and version=2)then raise exception 'Versão não incrementada';end if;
 update public.establishments set data=payload where id=record_id and version=1;get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Filtro de versão ignorado';end if;
 snapshot:=public.get_establishments_snapshot();
 if jsonb_array_length(snapshot->'companies')<>(select count(*)from public.establishments)then raise exception 'Snapshot cortou a base';end if;
 if not exists(select 1 from jsonb_array_elements(snapshot->'companies')r where r->>'id'=record_id::text and (r->>'version')::int=2)then raise exception 'Snapshot não contém cadastro atualizado';end if;
 if snapshot::text like '%source_values%' then raise exception 'Origem privada vazou';end if;
 begin insert into public.establishments(data)values(payload||'{"razao":""}');raise exception 'Nome vazio aceito';exception when invalid_parameter_value then null;end;
 begin insert into public.establishments(data)values(payload||'{"role":"administrator"}');raise exception 'Campo arbitrário aceito';exception when invalid_parameter_value then null;end;
 begin insert into public.establishments(data)values(payload||'{"razao":"<button>Conteúdo</button>"}');raise exception 'HTML aceito';exception when invalid_parameter_value then null;end;
 begin perform count(*) from private.establishment_sources;raise exception 'Origem privada exposta';exception when insufficient_privilege then null;end;
 begin delete from public.establishments where id=record_id;raise exception 'Exclusão aceita';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin if not exists(select 1 from private.audit_events where resource='establishments' and actor_id='91000000-0000-4000-8000-000000000001' and action='update')then raise exception 'Edição não auditada';end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare snapshot jsonb;begin
 snapshot:=public.get_establishments_snapshot();if jsonb_array_length(snapshot->'companies')=0 then raise exception 'Leitor sem consulta';end if;
 begin insert into public.establishments(data)values('{"razao":"Não permitido","divisao":"C-1","normalizedStatus":"PARADO"}');raise exception 'Leitor cadastrou';exception when insufficient_privilege then null;end;
 update public.establishments set data=data||'{"razao":"Alteração indevida"}';
 if exists(select 1 from public.establishments where nome='Alteração indevida')then raise exception 'Leitor alterou';end if;
 begin perform count(*) from public.establishment_import;exception when insufficient_privilege then raise exception 'Metadados de importação indisponíveis';end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin begin perform public.get_establishments_snapshot();raise exception 'Pendente consultou';exception when insufficient_privilege then null;end; if exists(select 1 from public.establishments)then raise exception 'Pendente leu tabela';end if;end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin begin perform public.get_establishments_snapshot();raise exception 'Bloqueado consultou';exception when insufficient_privilege then null;end;end$$;
reset role;
set local role anon;
do $$begin begin perform public.get_establishments_snapshot();raise exception 'Anônimo consultou';exception when insufficient_privilege then null;end;begin perform count(*)from public.establishments;raise exception 'Tabela pública';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
