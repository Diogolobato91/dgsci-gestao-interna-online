begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001','finance-manager@example.invalid','{"nome":"Gestor Financeiro Teste","posto_graduacao":"CAP","matricula":"FIN-01","cpf":"52998224725","data_nascimento":"1980-01-01"}'),
 ('a1000000-0000-4000-8000-000000000002','finance-reader@example.invalid','{"nome":"Consulta Financeira Teste","posto_graduacao":"CAP","matricula":"FIN-02","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('a1000000-0000-4000-8000-000000000003','finance-other@example.invalid','{"nome":"Outro Setor Teste","posto_graduacao":"SD","matricula":"FIN-03","cpf":"22233344405","data_nascimento":"1980-01-01"}'),
 ('a1000000-0000-4000-8000-000000000004','finance-pending@example.invalid','{"nome":"Pendente Financeiro Teste","posto_graduacao":"SD","matricula":"FIN-04","cpf":"12345678909","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Subdiretoria'] where user_id='a1000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Diretoria'] where user_id='a1000000-0000-4000-8000-000000000002';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='a1000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
insert into public.authorizations(id,category,protocolo,unidade,competencia,valor_despesa,valor_arrecadado)
 values('a2000000-0000-4000-8000-000000000001','sat','TESTE-FIN',' Teste Financeiro ','2100-01-01',120.50,300);
do $$declare affected int;begin
 if not exists(select 1 from public.authorizations where id='a2000000-0000-4000-8000-000000000001' and unidade='TESTE FINANCEIRO' and version=1) then raise exception 'Cadastro financeiro não normalizado';end if;
 update public.authorizations set workflow_status='pago' where id='a2000000-0000-4000-8000-000000000001' and version=1;
 update public.authorizations set valor_despesa=999 where id='a2000000-0000-4000-8000-000000000001' and version=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Processo obsoleto sobrescreveu valores';end if;
 begin update public.authorizations set valor_despesa=-1 where id='a2000000-0000-4000-8000-000000000001';raise exception 'Despesa negativa aceita';exception when invalid_parameter_value then null;end;
 begin update public.authorizations set valor_despesa='NaN' where id='a2000000-0000-4000-8000-000000000001';raise exception 'NaN aceito';exception when invalid_parameter_value then null;end;
 begin update public.authorizations set workflow_status='invalido' where id='a2000000-0000-4000-8000-000000000001';raise exception 'Situação inválida aceita';exception when check_violation then null;end;
 begin update public.authorizations set source_values='{"alterado":true}' where id='a2000000-0000-4000-8000-000000000001';raise exception 'Origem alterada';exception when invalid_parameter_value then null;end;
 begin insert into public.authorizations(category,protocolo,unidade) values('sat','SEM-COMPETENCIA','TESTE');raise exception 'Processo novo sem competência aceito';exception when invalid_parameter_value then null;end;
end$$;
insert into public.authorization_period_budgets(id,competencia,unidade,saldo_inicial) values('a3000000-0000-4000-8000-000000000001','2100-01-01',' teste financeiro ',1000);
do $$declare affected int;begin
 begin insert into public.authorization_period_budgets(competencia,unidade,saldo_inicial) values('2100-01-01','TESTE FINANCEIRO',10);raise exception 'Saldo duplicado aceito';exception when unique_violation then null;end;
 update public.authorization_period_budgets set saldo_inicial=1200 where id='a3000000-0000-4000-8000-000000000001' and version=1;
 update public.authorization_period_budgets set saldo_inicial=9999 where id='a3000000-0000-4000-8000-000000000001' and version=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Saldo obsoleto aceito';end if;
 if not exists(select 1 from jsonb_array_elements(public.get_diarias_snapshot()->'sat') x where x->>'id'='a2000000-0000-4000-8000-000000000001' and x->>'workflowStatus'='pago') then raise exception 'Snapshot não inclui processo atualizado';end if;
end$$;
-- Apenas metadados de teste com rollback; nenhum arquivo fictício é enviado ao Storage.
insert into storage.objects(id,bucket_id,name,metadata) values('a4000000-0000-4000-8000-000000000001','dgsci-authorizations','a2000000-0000-4000-8000-000000000001/fixture.pdf','{"size":12,"mimetype":"application/pdf"}');
do $$begin
 begin insert into public.authorization_documents(authorization_id,path,filename,size_bytes,content_type) values('a2000000-0000-4000-8000-000000000001','outro/fixture.pdf','fixture.pdf',12,'application/pdf');raise exception 'Documento de outro processo aceito';exception when invalid_parameter_value then null;end;
 begin insert into public.authorization_documents(authorization_id,path,filename,size_bytes,content_type) values('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001/missing.pdf','missing.pdf',12,'application/pdf');raise exception 'Ponteiro sem arquivo aceito';exception when invalid_parameter_value then null;end;
end$$;
insert into public.authorization_documents(authorization_id,path,filename,size_bytes,content_type) values('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001/fixture.pdf','fixture.pdf',12,'application/pdf');
do $$declare affected int;begin
 if (select count(*) from public.authorization_events where authorization_id='a2000000-0000-4000-8000-000000000001')<>3 then raise exception 'Auditoria de cadastro, edição e anexo incompleta';end if;
 begin
  delete from storage.objects where id='a4000000-0000-4000-8000-000000000001';get diagnostics affected=row_count;if affected<>0 then raise exception 'Arquivo vinculado removido';end if;
 exception when insufficient_privilege then null;end; -- Supabase também impede DELETE direto fora da Storage API.
 if not exists(select 1 from storage.objects where id='a4000000-0000-4000-8000-000000000001') then raise exception 'Arquivo vinculado ausente';end if;
 begin delete from public.authorization_events where authorization_id='a2000000-0000-4000-8000-000000000001';raise exception 'Histórico removido';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$declare affected int;begin
 if not exists(select 1 from public.authorization_documents where authorization_id='a2000000-0000-4000-8000-000000000001') or not exists(select 1 from storage.objects where id='a4000000-0000-4000-8000-000000000001') then raise exception 'Diretoria não consultou documento';end if;
 update public.authorizations set workflow_status='cancelado' where id='a2000000-0000-4000-8000-000000000001';get diagnostics affected=row_count;if affected<>0 then raise exception 'Diretoria alterou processo';end if;
 begin insert into public.authorization_period_budgets(competencia,unidade,saldo_inicial) values('2100-02-01','TESTE',0);raise exception 'Diretoria editou saldo';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name,metadata) values('dgsci-authorizations','a2000000-0000-4000-8000-000000000001/denied.pdf','{"size":12}');raise exception 'Diretoria enviou arquivo';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Secretaria'] where user_id='a1000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin
 if not exists(select 1 from public.authorization_period_budgets where id='a3000000-0000-4000-8000-000000000001') then raise exception 'Secretaria não consultou saldo';end if;
 begin insert into public.authorizations(category,protocolo,unidade,competencia) values('sat','NEGADO','TESTE','2100-01-01');raise exception 'Secretaria criou processo';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.authorization_documents) or exists(select 1 from public.authorization_period_budgets) or exists(select 1 from public.authorization_events) or exists(select 1 from storage.objects where bucket_id='dgsci-authorizations') then raise exception 'Outro setor consultou dados financeiros';end if;
end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
do $$begin if exists(select 1 from public.authorizations) or exists(select 1 from public.authorization_documents) then raise exception 'Pendente consultou dados financeiros';end if;end$$;
reset role;
update public.app_members set enabled=false where user_id='a1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$begin if exists(select 1 from public.authorization_documents) or exists(select 1 from storage.objects where bucket_id='dgsci-authorizations') then raise exception 'Bloqueado leu documentos';end if;end$$;
reset role;
set local role anon;
do $$begin
 begin perform * from public.authorization_documents;raise exception 'Anônimo leu documentos';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='dgsci-authorizations') then raise exception 'Anônimo leu arquivos';end if;
end$$;
reset role;
rollback;
