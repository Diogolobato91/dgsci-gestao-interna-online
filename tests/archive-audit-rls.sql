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
do $$declare rev int;d jsonb;s uuid;a uuid;e uuid;old_chief uuid;begin
 insert into public.support_documents(id,type,title,description,is_demo)values('audit-test-notice','notice','Comunicado auditável','Texto para consulta',false),('audit-test-model','model','Modelo auditável','Descrição',false);
 select revision into rev from public.support_documents where id='audit-test-notice';
 perform public.set_document_archive('audit-test-notice',rev,true,'Conteúdo desatualizado');
 if not exists(select 1 from public.support_documents where id='audit-test-notice' and archived_by=auth.uid() and archived_at is not null)then raise exception 'Arquivamento não carimbou autor';end if;
 begin perform public.set_document_archive('audit-test-notice',rev,false,null);raise exception 'Versão obsoleta aceita';exception when serialization_failure then null;end;
 d:=public.get_audit_events('support_documents','audit-test-notice');
 if not exists(select 1 from jsonb_array_elements(d->'items')x where x->>'action'='archive' and x->>'actor_id'=auth.uid()::text and x->>'source'='database')then raise exception 'Arquivamento não auditado';end if;
 s:=public.save_staff_member(null,null,'Chefe Anterior Teste','CAP',null,null,null,null);
 a:=public.save_staff_member(null,null,'Auxiliar Teste','SD',null,null,null,null);
 e:=public.save_staff_member(null,null,'Perito Teste','MAJ',null,null,null,null);
 select id into s from public.roster_people where staff_id=s;
 select id into a from public.roster_people where staff_id=a;
 select id into e from public.roster_people where staff_id=e;
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id)values('2098-09-01',s,a,e);
 update public.plantao_roster set chief_id=e,expert_id=s where service_date='2098-09-01';
 d:=public.get_audit_events('rosters','2098-09-01');
 if not exists(select 1 from jsonb_array_elements(d->'items')x where x->>'action'='update' and x->'before_values'->>'chief_name'='CAP Chefe Anterior Teste' and x->'after_values'->>'chief_name'='MAJ Perito Teste')then raise exception 'Substituição não preservou nomes';end if;
end$$;
reset role;
-- Secretaria pode arquivar comunicado e consultar apenas o histórico das escalas.
update public.app_members set role='editor',sectors=array['Secretaria'] where user_id='91000000-0000-4000-8000-000000000003';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare rev int;begin
 perform public.get_audit_events('rosters');
 begin perform public.get_audit_events();raise exception 'Gestor consultou auditoria geral';exception when insufficient_privilege then null;end;
 begin perform public.get_audit_events('user_registrations');raise exception 'Gestor consultou dados pessoais';exception when insufficient_privilege then null;end;
 select revision into rev from public.support_documents where id='audit-test-notice';
 perform public.set_document_archive('audit-test-notice',rev,false,null);
 select revision into rev from public.support_documents where id='audit-test-notice';
 perform public.set_document_archive('audit-test-notice',rev,true,'Substituído por comunicado recente');
 select revision into rev from public.support_documents where id='audit-test-model';
 begin perform public.set_document_archive('audit-test-model',rev,true,'Modelo antigo');raise exception 'Secretaria arquivou modelo';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"session_id":"audit-test-session"}',true);
 perform public.log_portal_activity('session_open');perform public.log_portal_activity('session_open');
 perform public.log_portal_activity('page_view','/dashboard');
 perform public.log_portal_activity('download_request','support_documents','audit-test-model');
 begin perform public.log_portal_activity('update','app_members','spoof');raise exception 'Ação de banco forjada';exception when invalid_parameter_value then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$begin
 if exists(select 1 from public.support_documents where id='audit-test-notice')then raise exception 'Leitor consultou arquivado';end if;
 if exists(select 1 from public.notice_publications where document_id='audit-test-notice')then raise exception 'Arquivado permaneceu em notificações';end if;
 begin perform public.get_audit_events('rosters');raise exception 'Leitor consultou histórico restrito';exception when insufficient_privilege then null;end;
 begin perform count(*) from private.audit_events;raise exception 'Acesso direto a auditoria permitido';exception when insufficient_privilege then null;end;
 begin update private.audit_events set actor_name='Adulterado';raise exception 'Usuário adulterou eventos';exception when insufficient_privilege then null;end;
 begin perform public.set_document_archive('audit-test-model',1,true,'Tentar arquivar');raise exception 'Leitor arquivou modelo';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from private.audit_events where resource='user_registrations' and after_values->>'user_id'='91000000-0000-4000-8000-000000000002' and after_values->>'cpf'='[dado protegido]') then raise exception 'CPF não protegido no snapshot';end if;
 if (select count(*) from private.audit_events where action='session_open' and session_id='audit-test-session')<>1 then raise exception 'Sessão duplicada';end if;
 if exists(select 1 from private.audit_events where action='page_view' and actor_id='91000000-0000-4000-8000-000000000003')then raise exception 'Navegação foi gravada';end if;
 if not exists(select 1 from private.audit_events where source='portal' and action='download_request' and actor_id='91000000-0000-4000-8000-000000000003')then raise exception 'Ator do download incorreto';end if;
 begin update private.audit_events set actor_name='Adulterado';raise exception 'Histórico mutável';exception when insufficient_privilege then null;end;
 begin delete from private.audit_events;raise exception 'Histórico apagável';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.get_audit_events('rosters');raise exception 'Pendente consultou histórico';exception when insufficient_privilege then null;end;
 begin perform public.log_portal_activity('page_view','/dashboard');raise exception 'Pendente informou atividade';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.get_audit_events();raise exception 'Anônimo consultou auditoria';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
