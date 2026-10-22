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
do $$declare v int;details jsonb:=jsonb_build_object('nome','Edição Unificada','posto','CAP','matricula','903/2','cpf','22233344405','nascimento','1990-01-01','contato','91999990009');begin
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000003';
 perform public.admin_save_user_full('91000000-0000-4000-8000-000000000003',v,details,array['Análise'],true,false);
 if not exists(select 1 from public.user_registrations where user_id='91000000-0000-4000-8000-000000000003' and nome='Edição Unificada' and posto_graduacao='CAP' and contato='91999990009') then raise exception 'Dados não salvos';end if;
 if not exists(select 1 from jsonb_array_elements(public.admin_list_users()) x where x->>'user_id'='91000000-0000-4000-8000-000000000003' and x->'sectors'='["Análise"]'::jsonb and x->>'enabled'='true') then raise exception 'Setores não salvos';end if;
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000003';
 begin perform public.admin_save_user_full('91000000-0000-4000-8000-000000000003',v,jsonb_set(details,'{nome}','"Não Deve Persistir"'),array['Inválido'],true,false);raise exception 'Setor inválido aceito';exception when invalid_parameter_value then null;end;
 if not exists(select 1 from public.user_registrations where user_id='91000000-0000-4000-8000-000000000003' and nome='Edição Unificada' and version=v) then raise exception 'Falha deixou alteração parcial';end if;
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002';
 perform public.admin_save_user_full('91000000-0000-4000-8000-000000000002',v,jsonb_build_object('nome','Pendente Corrigido'),array[]::text[],false,false);
 if not exists(select 1 from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002' and status='pending_approval' and nome='Pendente Corrigido') then raise exception 'Pendente aprovado por edição';end if;
 begin perform public.admin_save_user_full('91000000-0000-4000-8000-000000000002',v+1,jsonb_build_object('nome','Tentativa'),array['Análise'],true,false);raise exception 'Aprovação pela edição permitida';exception when invalid_parameter_value then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.admin_save_user_full(auth.uid(),1,'{}',array['Análise'],true,false);raise exception 'Leitor editou';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
