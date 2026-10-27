begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare vc uuid;mil uuid;loc uuid;extended jsonb;items jsonb;d date:='2099-08-12';begin
 vc:=public.save_staff_member(null,null,'VC Teste Limpeza','VC',null,null,null,null);
 mil:=public.save_staff_member(null,null,'Militar Teste Limpeza','CAP',null,null,null,null);
 select jsonb_agg(jsonb_build_object('task',k,'staff_id',case when k='lixo' then vc else null end,'nome',case when k='lixo' then 'Nome adulterado' else '' end)) into items from unnest(array['lav_corredor','esc_fundos','corredor_frente','corredor_fundos','lixo','sala_coronel'])k;
 insert into public.cleaning_roster(service_date,assignments)values(d,items);
 if not exists(select 1 from public.cleaning_roster r,jsonb_array_elements(r.assignments)a where r.service_date=d and a->>'task'='lixo' and a->>'nome'='VC Teste Limpeza') then raise exception 'Nome canônico não aplicado';end if;
 begin insert into public.cleaning_roster(service_date,assignments)values(d+1,jsonb_set(items,'{4,staff_id}',to_jsonb(mil::text)));raise exception 'Militar aceito';exception when invalid_parameter_value then null;end;
 begin insert into public.cleaning_roster(service_date,assignments)values(d+1,jsonb_set(items,'{4,task}','"lav_corredor"'));raise exception 'Atividade duplicada';exception when invalid_parameter_value then null;end;
 insert into public.staff_absences(staff_id,kind,starts_on,ends_on)values(vc,'Férias',d+2,d+2);
 begin insert into public.cleaning_roster(service_date,assignments)values(d+2,items);raise exception 'VC afastado escalado';exception when invalid_parameter_value then null;end;
 update public.cleaning_roster set notes='Alteração válida' where service_date=d and version=1;
 if not exists(select 1 from public.cleaning_roster where service_date=d and version=2 and updated_by=auth.uid()) then raise exception 'Versão ou autoria incorreta';end if;
 begin update public.cleaning_roster set service_date=d+1 where service_date=d;raise exception 'Data alterada';exception when invalid_parameter_value then null;end;
 insert into public.cleaning_locations(label) values('Banheiro teste 2º andar') returning id into loc;
 extended:=items||jsonb_build_array(jsonb_build_object('task','local_'||loc::text,'label','Nome adulterado','staff_id',vc,'nome','Forjado'));
 insert into public.cleaning_roster(service_date,assignments)select d+20+n,extended from generate_series(0,6)n;
 if (select count(*) from public.cleaning_roster where service_date between d+20 and d+26)<>7 then raise exception 'Semana incompleta';end if;
 if not exists(select 1 from public.cleaning_roster r,jsonb_array_elements(r.assignments)a where r.service_date=d+20 and a->>'label'='Banheiro teste 2º andar' and a->>'nome'='VC Teste Limpeza')then raise exception 'Local/nome não canonizados';end if;
 begin
 insert into public.cleaning_roster(service_date,assignments)values(d+19,extended),(d+20,extended);
 raise exception 'Conflito aceito';exception when unique_violation then null;end;
 if exists(select 1 from public.cleaning_roster where service_date=d+19)then raise exception 'Lote parcialmente salvo';end if;
 begin insert into public.cleaning_roster(service_date,assignments)values(d+30,jsonb_set(extended,'{6,task}','"local_inexistente"'));raise exception 'Local inexistente aceito';exception when invalid_parameter_value then null;end;
 begin insert into public.cleaning_roster(service_date,assignments)values(d+31,extended-0);raise exception 'Base incompleta aceita';exception when invalid_parameter_value then null;end;
 begin insert into public.cleaning_roster(service_date,assignments)values(d+1,extended),(d+2,extended);raise exception 'Afastamento aceito no lote';exception when invalid_parameter_value then null;end;
 if exists(select 1 from public.cleaning_roster where service_date=d+1)then raise exception 'Afastamento deixou lote parcial';end if;
 perform public.get_cleaning_volunteers();
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 if not exists(select 1 from public.cleaning_roster where service_date='2099-08-12') then raise exception 'Usuário habilitado sem consulta';end if;
 if exists(select 1 from public.staff) then raise exception 'Efetivo completo exposto';end if;
 begin insert into public.cleaning_locations(label)values('Local indevido');raise exception 'Leitor criou local';exception when insufficient_privilege then null;end;
 begin perform public.get_cleaning_volunteers();raise exception 'Leitor acessou seleção administrativa';exception when insufficient_privilege then null;end;
 update public.cleaning_roster set notes='Alteração indevida' where service_date='2099-08-12';
 if exists(select 1 from public.cleaning_roster where notes='Alteração indevida') then raise exception 'Leitor alterou escala';end if;
 begin insert into public.cleaning_roster(service_date,assignments)select '2099-08-13',assignments from public.cleaning_roster where service_date='2099-08-12';raise exception 'Leitor inseriu escala';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.cleaning_roster)then raise exception 'Pendente consultou escala';end if;end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin if exists(select 1 from public.cleaning_roster)then raise exception 'Bloqueado consultou escala';end if;end$$;
reset role;
set local role anon;
do $$begin begin perform count(*) from public.cleaning_roster;raise exception 'Anônimo consultou escala';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
