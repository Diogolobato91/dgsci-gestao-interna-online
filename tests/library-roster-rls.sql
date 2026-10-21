begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('70000000-0000-4000-8000-000000000001','lib-manager@example.invalid','{"nome":"Gestor Biblioteca","posto_graduacao":"CEL","matricula":"LIB-001","cpf":"52998224725","data_nascimento":"1980-01-01"}'),
 ('70000000-0000-4000-8000-000000000002','lib-secretary@example.invalid','{"nome":"Secretaria Biblioteca","posto_graduacao":"CAP","matricula":"LIB-002","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('70000000-0000-4000-8000-000000000003','lib-pending@example.invalid','{"nome":"Pendente Biblioteca","posto_graduacao":"SD","matricula":"LIB-003","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,role='editor',sectors=array['Diretoria'] where user_id='70000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,role='editor',sectors=array['Secretaria'] where user_id='70000000-0000-4000-8000-000000000002';
insert into public.duty_roster(id,service_date,staff_id,duty_role,shift)
select '60000000-0000-4000-8000-000000000001','2100-01-01',id,'Teste','Integral' from public.staff limit 1;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$declare affected int;begin
 begin
  insert into public.support_documents(id,type,title) values('test-model-denied','model','Modelo de teste');
  raise exception 'Secretaria cadastrou modelo';
 exception when insufficient_privilege then null;end;
 insert into public.support_documents(id,type,title) values('test-notice-ok','notice','Comunicado de teste');
 begin
  update public.support_documents set type='model' where id='test-notice-ok';
  raise exception 'Tipo de conteúdo alterado';
 exception when invalid_parameter_value or insufficient_privilege then null;end;
 update public.duty_roster set duty_role='Teste editado' where id='60000000-0000-4000-8000-000000000001' and version=1;
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Secretaria não editou a escala';end if;
 update public.duty_roster set duty_role='Versão obsoleta' where id='60000000-0000-4000-8000-000000000001' and version=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Versão obsoleta sobrescreveu escala';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.support_documents(id,type,title) values('test-model-director','model','Modelo da Diretoria');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$declare affected int;begin
 update public.support_documents set title='Tentativa' where id='test-model-director';
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Secretaria editou modelo';end if;
 if not exists(select 1 from public.support_documents where id='test-model-director') then raise exception 'Secretaria não consultou modelo';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.support_documents) then raise exception 'Pendente consultou documentos';end if;
 if exists(select 1 from public.duty_roster) then raise exception 'Pendente consultou escala';end if;
end$$;
reset role;
rollback;
