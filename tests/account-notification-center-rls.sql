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
reset role;
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$begin
 perform public.save_staff_member(null,null,'Cadastro vinculado de teste','SD','903/1','22233344405','1980-01-01','91999990003');
 insert into public.support_documents(id,type,title,description,is_demo)
 select 'test-center-'||n,'notice','Aviso de teste '||n,'Texto completo de teste',false from generate_series(1,25)n;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare data jsonb;v int;cnt int;pub uuid;begin
 data:=public.get_my_account();
 if data->>'cpf'<>'22233344405' or data->>'email'<>'staff-reader@example.invalid' then raise exception 'Dados próprios incorretos';end if;
 v:=(data->>'version')::int;
 perform public.update_my_contact('91 99999-0008',v);
 if public.get_my_account()->>'contato'<>'91999990008' then raise exception 'Contato não atualizado';end if;
 begin perform public.update_my_contact('91999990009',v);raise exception 'Versão obsoleta aceita';exception when serialization_failure then null;end;
 begin perform public.update_my_contact('abc',v+1);raise exception 'Contato inválido aceito';exception when invalid_parameter_value then null;end;
 if exists(select 1 from public.staff) then raise exception 'Minha conta liberou acesso ao efetivo completo';end if;
 data:=public.get_my_notices(0,false);
 if jsonb_array_length(data->'items')<>20 then raise exception 'Paginação inicial inválida';end if;
 if (data->>'unseen_count')::int<25 then raise exception 'Contagem de avisos incorreta';end if;
 cnt:=(data->>'unseen_count')::int;
 pub:=(data->'items'->0->>'publication_id')::uuid;
 insert into public.notice_receipts(user_id,publication_id)values(auth.uid(),pub) on conflict do nothing;
 data:=public.get_my_notices(0,true);
 if (data->>'unseen_count')::int<>cnt-1 then raise exception 'Contador não refletiu recibo';end if;
 if exists(select 1 from jsonb_array_elements(data->'items')x where x->>'publication_id'=pub::text) then raise exception 'Filtro novos incluiu recebido';end if;
 if jsonb_array_length(public.get_my_notices(20,false)->'items')<5 then raise exception 'Segunda página inválida';end if;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.roster_people p join public.staff s on s.id=p.staff_id where s.cpf='22233344405' and p.contato='91999990008') then raise exception 'Contato não sincronizado no vínculo verificado';end if;
 if not exists(select 1 from public.app_members m join public.user_registrations r on r.user_id=m.user_id where m.user_id='91000000-0000-4000-8000-000000000003' and m.role='reader' and m.sectors=array['Vistoriador'] and r.cpf='22233344405' and r.matricula='903/1' and r.status='approved') then raise exception 'Contato alterou privilégios ou identificação';end if;
 if not exists(select 1 from private.user_access_audit where actor_id='91000000-0000-4000-8000-000000000003' and notes='Atualização do próprio contato em Minha conta') then raise exception 'Contato não auditado';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.get_my_account();raise exception 'Pendente consultou Minha conta';exception when insufficient_privilege then null;end;
 begin perform public.update_my_contact('91999990000',1);raise exception 'Pendente alterou contato';exception when insufficient_privilege then null;end;
 if public.get_my_notices()->>'total'<>'0' then raise exception 'Pendente consultou notificações';end if;
end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.get_my_account();raise exception 'Bloqueado consultou Minha conta';exception when insufficient_privilege then null;end;
 if public.get_my_notices()->>'total'<>'0' then raise exception 'Bloqueado consultou notificações';end if;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.get_my_account();raise exception 'Anônimo consultou conta';exception when insufficient_privilege then null;end;
 begin perform public.get_my_notices();raise exception 'Anônimo consultou avisos';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
