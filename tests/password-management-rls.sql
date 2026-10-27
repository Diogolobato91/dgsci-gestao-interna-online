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

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;v integer;begin
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002';
 r:=public.prepare_password_action('reset','91000000-0000-4000-8000-000000000002',v);
 if r->>'target_id'<>'91000000-0000-4000-8000-000000000002' then raise exception 'Reset com alvo incorreto';end if;
 perform set_config('dgsci.test_password_request',r->>'request_id',true);
 begin perform public.finish_password_action((r->>'request_id')::uuid,true);raise exception 'Cliente forjou conclusão de senha';exception when insufficient_privilege then null;end;
 begin perform public.prepare_password_action('reset','91000000-0000-4000-8000-000000000001',1);raise exception 'Reset da própria conta permitido';exception when invalid_parameter_value then null;end;
 begin perform public.prepare_password_action('reset','91000000-0000-4000-8000-000000000002',v+99);raise exception 'Versão obsoleta aceita';exception when serialization_failure then null;end;
 begin perform public.update_my_contact('91999990000',1);raise exception 'Contato editável';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role service_role;
select public.finish_password_action(current_setting('dgsci.test_password_request')::uuid,true);
select public.finish_password_action(current_setting('dgsci.test_password_request')::uuid,true);
reset role;
do $$begin
 if (select count(*) from private.user_access_audit where after_values->>'password_request_id'=current_setting('dgsci.test_password_request'))<>1 then raise exception 'Conclusão duplicada ou ausente';end if;
 if exists(select 1 from public.app_members where user_id='91000000-0000-4000-8000-000000000002' and enabled) then raise exception 'Reset habilitou pendente';end if;
end$$;
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare r jsonb;begin
 r:=public.prepare_password_action('change','91000000-0000-4000-8000-000000000001',1);
 if r->>'target_id'<>'91000000-0000-4000-8000-000000000003' then raise exception 'Usuário escolheu conta de terceiro';end if;
 begin perform public.prepare_password_action('reset','91000000-0000-4000-8000-000000000002',1);raise exception 'Usuário comum resetou senha';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$begin begin perform public.prepare_password_action('change');raise exception 'Bloqueado alterou senha';exception when insufficient_privilege then null;end;end$$;
reset role;
set local role anon;
do $$begin begin perform public.prepare_password_action('change');raise exception 'Anônimo alterou senha';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
