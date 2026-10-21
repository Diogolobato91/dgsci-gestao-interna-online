begin;
insert into private.login_allowlist values ('permissions-0@example.invalid','Teste','reader',array['Secretaria'],true),('permissions-1@example.invalid','Teste','reader',array['Diretoria'],true),('permissions-2@example.invalid','Teste','reader',array['Subdiretoria'],true),('permissions-3@example.invalid','Teste','reader',array['Vistoriador'],true),('permissions-4@example.invalid','Teste','reader',array['Análise'],true),('permissions-5@example.invalid','Teste','reader',array['Multas'],true),('permissions-6@example.invalid','Teste','administrator',array['Secretaria','Diretoria','Subdiretoria','Vistoriador','Análise','Multas'],true),('permissions-7@example.invalid','Teste','reader',array['Diretoria'],true);
insert into auth.users(id,email,aud,role) values ('20000000-0000-4000-8000-000000000000','permissions-0@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000001','permissions-1@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000002','permissions-2@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000003','permissions-3@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000004','permissions-4@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000005','permissions-5@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000006','permissions-6@example.invalid','authenticated','authenticated'),('20000000-0000-4000-8000-000000000007','permissions-7@example.invalid','authenticated','authenticated');
insert into public.app_members(user_id,display_name,role,sectors,enabled) values ('20000000-0000-4000-8000-000000000000','Teste','reader',array['Secretaria'],true),('20000000-0000-4000-8000-000000000001','Teste','reader',array['Diretoria'],true),('20000000-0000-4000-8000-000000000002','Teste','reader',array['Subdiretoria'],true),('20000000-0000-4000-8000-000000000003','Teste','reader',array['Vistoriador'],true),('20000000-0000-4000-8000-000000000004','Teste','reader',array['Análise'],true),('20000000-0000-4000-8000-000000000005','Teste','reader',array['Multas'],true),('20000000-0000-4000-8000-000000000006','Teste','administrator',array['Secretaria','Diretoria','Subdiretoria','Vistoriador','Análise','Multas'],true),('20000000-0000-4000-8000-000000000007','Teste','reader',array['Diretoria'],false);
set local role authenticated;
do $$declare i integer; uid uuid; can_sat boolean; can_support boolean; seen integer; command_id uuid; base_version integer; doc_id text; region_id text;
begin
 for i in 0..7 loop
 uid=('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid::text,'role','authenticated')::text,true);
 can_sat=i in (1,2,6);can_support=i in (0,1,2,6);
 select count(*) into seen from public.sat_commands;
 if (i=7 and seen<>0) or (i<>7 and seen<>33) then raise exception 'Consulta comando incorreta para %',i;end if;
 if i<>7 then
 select id,version into command_id,base_version from public.sat_commands order by ordem limit 1;
 update public.sat_commands set commander_rank=commander_rank where id=command_id and version=base_version;
 if found<>can_sat then raise exception 'Permissão comando incorreta para %',i;end if;
 if can_sat and (select version from public.sat_commands where id=command_id)<>base_version+1 then raise exception 'Versão comando incorreta';end if;
 update public.sat_commands set commander_rank=commander_rank where id=command_id and version=base_version;
 if found then raise exception 'Concorrência comando falhou';end if;
 end if;
 begin
 insert into public.sat_regions(gbm,sat,municipios) values('TESTE','TESTE','TESTE') returning id into region_id;
 if not can_sat then raise exception 'Inclusão SAT indevida %',i;end if;
 update public.sat_regions set municipios='Alterado' where id=region_id;
 if not found then raise exception 'Edição SAT bloqueada %',i;end if;
 exception when insufficient_privilege then if can_sat then raise;end if;
 end;
 for doc_id in select unnest(array['notice','guide','model']) loop
 begin
 insert into public.support_documents(type,title) values(doc_id,'TESTE') returning id into doc_id;
 if not can_support then raise exception 'Conteúdo indevido %',i;end if;
 update public.support_documents set description='Alterado' where id=doc_id and revision=1;
 if not found or (select revision from public.support_documents where id=doc_id)<>2 then raise exception 'Edição de conteúdo falhou';end if;
 exception when insufficient_privilege then if can_support then raise;end if;
 end;
 end loop;
 begin
 insert into storage.objects(bucket_id,name) values('dgsci-support','permission-test/'||i||'.txt');
 if not can_support then raise exception 'Anexo indevido %',i;end if;
 exception when insufficient_privilege then if can_support then raise;end if;
 end;
 end loop;
 -- Every enabled sector can read a private attachment, but disabled accounts cannot.
 for i in 0..7 loop
 uid=('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid::text,'role','authenticated')::text,true);
 select count(*) into seen from storage.objects where bucket_id='dgsci-support' and name like 'permission-test/%';
 if (i=7 and seen<>0) or (i<>7 and seen<>4) then raise exception 'Leitura de anexo incorreta %',i;end if;
 end loop;
end$$;
reset role; set local role anon;
do $$begin begin perform count(*) from public.support_documents;raise exception 'Anônimo acessou conteúdo';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='dgsci-support') then raise exception 'Anônimo acessou anexo';end if;end$$;
reset role;
rollback;
select 'Permissões dos seis setores, superadministrador, conta desabilitada e anônimo validadas; testes revertidos' as resultado;
