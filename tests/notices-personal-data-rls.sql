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
do $$declare v int;before_status text;begin
 select version,status into v,before_status from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002';
 perform public.admin_update_personal_data('91000000-0000-4000-8000-000000000002',v,'Cadastro Corrigido','2º SGT','902/2','11144477735','1990-02-03','91999990002');
 if not exists(select 1 from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002' and nome='Cadastro Corrigido' and posto_graduacao='2º SGT' and matricula='902/2' and contato='91999990002' and data_nascimento='1990-02-03' and status=before_status and version=v+1) then raise exception 'Correção incompleta ou aprovação indevida';end if;
 if exists(select 1 from public.app_members where user_id='91000000-0000-4000-8000-000000000002' and enabled) then raise exception 'Correção habilitou pendente';end if;
 begin perform public.admin_update_personal_data('91000000-0000-4000-8000-000000000002',v,'Obsoleto','SD',null,null,null,null);raise exception 'Versão obsoleta aceita';exception when serialization_failure then null;end;
 begin perform public.admin_update_personal_data('91000000-0000-4000-8000-000000000002',v+1,'Inválido','SD',null,'11111111111',null,null);raise exception 'CPF inválido aceito';exception when invalid_parameter_value then null;end;
 begin perform public.admin_update_personal_data('91000000-0000-4000-8000-000000000002',v+1,'Duplicado','SD',null,'52998224725',null,null);raise exception 'CPF duplicado aceito';exception when unique_violation then null;end;
 insert into public.support_documents(id,type,title,description,is_demo) values('test-notification-new','notice','Novo comunicado de teste','Texto completo',false),('test-notification-demo','notice','Demonstração', '',true),('test-notification-model','model','Modelo de teste','',false);
 if (select count(*) from public.notice_publications where document_id like 'test-notification-%')<>1 then raise exception 'Demonstração ou modelo gerou aviso';end if;
 if public.get_pending_notice()->>'title'<>'Novo comunicado de teste' then raise exception 'Autor não recebeu aviso';end if;
 update public.support_documents set description='Texto editado' where id='test-notification-new';
 if (select count(*) from public.notice_publications where document_id='test-notification-new')<>1 then raise exception 'Edição repetiu publicação';end if;
 insert into public.notice_receipts(user_id,publication_id) select auth.uid(),id from public.notice_publications where document_id='test-notification-new' on conflict do nothing;
 if public.get_pending_notice() is not null then raise exception 'Aviso dispensado repetiu';end if;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare pub uuid;begin
 if public.get_pending_notice()->>'title'<>'Novo comunicado de teste' then raise exception 'Outro usuário não recebeu aviso independente';end if;
 select id into pub from public.notice_publications where document_id='test-notification-new';
 begin insert into public.notice_receipts(user_id,publication_id)values('91000000-0000-4000-8000-000000000001',pub);raise exception 'Recibo de terceiro permitido';exception when insufficient_privilege then null;end;
 begin perform public.admin_update_personal_data('91000000-0000-4000-8000-000000000003',1,'Tentativa','SD',null,null,null,null);raise exception 'Leitor corrigiu dados';exception when insufficient_privilege then null;end;
 insert into public.notice_receipts(user_id,publication_id)values(auth.uid(),pub) on conflict do nothing;
 insert into public.notice_receipts(user_id,publication_id)values(auth.uid(),pub) on conflict do nothing;
 if public.get_pending_notice() is not null then raise exception 'Recibo não persistiu';end if;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 if public.get_pending_notice() is not null then raise exception 'Pendente recebeu conteúdo interno';end if;
 if exists(select 1 from public.notice_receipts)then raise exception 'Pendente leu recibos';end if;
end$$;
reset role;
do $$begin if not exists(select 1 from private.user_access_audit where target_email='staff-pending@example.invalid' and action='update') then raise exception 'Correção não auditada';end if;end$$;
set local role anon;
do $$begin
 begin perform public.get_pending_notice();raise exception 'Anônimo consultou avisos';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
