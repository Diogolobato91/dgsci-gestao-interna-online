begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';
update public.app_members set role='administrator',sectors=array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'] where user_id='91000000-0000-4000-8000-000000000001';
insert into private.login_allowlist(email,display_name,enabled,role,sectors) values('staff-secretary@example.invalid','Gestor Teste Efetivo',true,'administrator',array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']) on conflict(email) do update set enabled=excluded.enabled,role=excluded.role,sectors=excluded.sectors;

insert into public.sat_regions(id,gbm,sat,municipios) values('quality-region','TESTE QUALIDADE','SAT QUALIDADE','Teste');
insert into public.sat_commands(id,source_key,source_row,ordem,sat) values('95000000-0000-4000-8000-000000000001','quality-command',0,999,'SAT TESTE');
insert into public.support_documents(id,type,title,is_demo) values('quality-model','model','Modelo de teste',false),('quality-notice','notice','Comunicado de teste',false);
insert into public.authorizations(id,category,protocolo,unidade,competencia) values('95000000-0000-4000-8000-000000000002','sat','QUALITY-TEST','TESTE','2098-01-01');
insert into public.ordinance_years(year) values(2199) on conflict do nothing;
insert into public.staff(id,source_key,source_order,nome,posto_graduacao,categoria) values('95000000-0000-4000-8000-000000000003','quality-staff',0,'Efetivo teste','CAP','Militar');
create temporary table quality_test_scope(dummy boolean) on commit drop;
-- Função temporária executada com o papel authenticated, nunca SECURITY DEFINER.
create function pg_temp.check_sector(p_sat boolean,p_admin boolean,p_finance boolean,p_ordinance boolean,p_super boolean) returns void
language plpgsql security invoker as $$declare n integer;begin
 if not exists(select 1 from public.sat_regions where id='quality-region') then raise exception 'Consulta compartilhada indisponível';end if;
 update public.sat_regions set crb='CRB II',risp='3º RISP',municipios='Teste revisto' where id='quality-region';get diagnostics n=row_count;
 if (n=1)<>p_sat then raise exception 'Permissão SAT incorreta';end if;
 update public.sat_commands set commander_name='Comandante teste' where source_key='quality-command';get diagnostics n=row_count;
 if (n=1)<>p_sat then raise exception 'Permissão comando incorreta';end if;
 update public.support_documents set description='Texto revisto' where id='quality-model';get diagnostics n=row_count;
 if (n=1)<>p_sat then raise exception 'Permissão modelos incorreta';end if;
 update public.support_documents set description='Comunicado revisto' where id='quality-notice';get diagnostics n=row_count;
 if (n=1)<>p_admin then raise exception 'Permissão comunicados incorreta';end if;
 if exists(select 1 from public.staff where source_key='quality-staff')<>p_admin then raise exception 'Consulta efetivo incorreta';end if;
 if exists(select 1 from public.authorizations where protocolo='QUALITY-TEST')<>p_admin then raise exception 'Consulta financeira incorreta';end if;
 update public.authorizations set observacao='Teste revisto' where protocolo='QUALITY-TEST';get diagnostics n=row_count;
 if (n=1)<>p_finance then raise exception 'Escrita financeira incorreta';end if;
 if exists(select 1 from public.ordinance_years where year=2199)<>p_ordinance then raise exception 'Portarias expostas';end if;
 begin perform public.get_audit_events('rosters');if not p_admin then raise exception 'Histórico escalas exposto';end if;exception when insufficient_privilege then if p_admin then raise;end if;end;
 begin perform public.get_audit_events();if not p_super then raise exception 'Auditoria geral exposta';end if;exception when insufficient_privilege then if p_super then raise;end if;end;
 begin perform public.admin_list_users();if not p_super then raise exception 'Gestão usuários exposta';end if;exception when insufficient_privilege then if p_super then raise;end if;end;
 begin perform count(*) from private.audit_events;raise exception 'Acesso direto auditoria';exception when insufficient_privilege then null;end;
end$$;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant execute on function pg_temp.check_sector(boolean,boolean,boolean,boolean,boolean) to authenticated;
update public.app_members set sectors=array['Diretoria'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(true,true,false,false,false);
reset role;
update public.app_members set sectors=array['Subdiretoria'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(true,true,true,true,false);
reset role;
update public.app_members set sectors=array['Secretaria'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(false,true,false,false,false);
reset role;
update public.app_members set sectors=array['Vistoriador'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(false,false,false,false,false);
reset role;
update public.app_members set sectors=array['Análise'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(false,false,false,false,false);
reset role;
update public.app_members set sectors=array['Multas'],enabled=true where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_sector(false,false,false,false,false);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_sector(true,true,true,true,true);
do $$begin
 begin insert into public.sat_regions(gbm,sat) values(' teste   qualidade ',' sat qualidade ');raise exception 'Duplicidade SAT aceita';exception when unique_violation then null;end;
 begin insert into public.sat_regions(gbm,sat) values('  ','Teste');raise exception 'Unidade vazia aceita';exception when invalid_parameter_value then null;end;
 begin update public.sat_regions set municipios=repeat('x',4001) where id='quality-region';raise exception 'Texto excessivo aceito';exception when invalid_parameter_value then null;end;
end$$;
reset role;
-- Uma conta bloqueada mantém o JWT, mas perde acesso pelo banco.
update public.app_members set enabled=false,sectors=array['Diretoria'] where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.sat_regions) or exists(select 1 from public.support_documents) or exists(select 1 from public.authorizations) or exists(select 1 from public.staff) then raise exception 'Bloqueado acessou dados';end if;
 begin perform public.admin_list_users();raise exception 'Bloqueado acessou gestão';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.sat_regions) or exists(select 1 from public.support_documents) or exists(select 1 from public.authorizations) or exists(select 1 from public.staff) then raise exception 'Pendente acessou dados';end if;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform count(*) from public.sat_regions;raise exception 'Anônimo acessou SAT';exception when insufficient_privilege then null;end;
 begin perform public.admin_list_users();raise exception 'Anônimo acessou gestão';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
