begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Subdiretoria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';

do $$declare rid uuid;begin
 insert into public.authorizations(source_key,source_row,category,protocolo,unidade,competencia,status,source_values,workflow_status,valor_despesa)
 values('pdf:fixture:1',1,'sat','PDF-TESTE','UNIDADE TESTE',null,'CORREÇÃO SAT',jsonb_build_object('sha256',repeat('a',64),'page',1),'aguardando',100.50)returning id into rid;
 if not exists(select 1 from public.authorizations where id=rid and source_key='pdf:fixture:1' and source_row=1 and competencia is null and status='CORREÇÃO SAT' and source_values->>'page'='1')then raise exception 'Origem documental perdida';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare rid uuid;begin
 begin
 insert into public.authorizations(source_key,source_row,category,protocolo,unidade,competencia,source_values)values('pdf:forjado:1',1,'sat','CLIENTE-TESTE','UNIDADE TESTE',null,jsonb_build_object('sha256',repeat('a',64)));
 raise exception 'Cliente burlou competência';exception when invalid_parameter_value then null;end;
 insert into public.authorizations(source_key,source_row,category,protocolo,unidade,competencia,status,source_values)values('pdf:forjado:2',2,'sat','CLIENTE-TESTE','UNIDADE TESTE','2026-11-01','PAGO',jsonb_build_object('sha256',repeat('a',64)))returning id into rid;
 if not exists(select 1 from public.authorizations where id=rid and source_key='manual:'||rid::text and source_row=0 and source_values='{}' and status is null)then raise exception 'Cliente forjou origem documental';end if;
end$$;
reset role;
rollback;
