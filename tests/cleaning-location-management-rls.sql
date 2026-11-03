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
do $$declare l public.cleaning_locations%rowtype;result jsonb;items jsonb;begin
 select * into l from public.cleaning_locations where task_key='lav_corredor';
 items:=jsonb_build_array(jsonb_build_object('task',l.task_key,'staff_id',null,'nome',''));
 insert into public.cleaning_roster(service_date,assignments)values('2098-05-01',items);
 result:=public.change_cleaning_location(l.id,l.version,'Local editado teste',false);
 if result->>'label'<>'Local editado teste' or (result->>'version')::int<>l.version+1 then raise exception 'Edição incorreta';end if;
 if (select assignments->0->>'label' from public.cleaning_roster where service_date='2098-05-01')<>l.label then raise exception 'Histórico alterado';end if;
 begin perform public.change_cleaning_location(l.id,l.version,'Outra edição',false);raise exception 'Versão antiga aceita';exception when serialization_failure then null;end;
 result:=public.change_cleaning_location(l.id,(result->>'version')::int,null,true);
 if result->>'deleted_at' is null then raise exception 'Local não excluído';end if;
 begin insert into public.cleaning_roster(service_date,assignments)values('2098-05-02',items);raise exception 'Local excluído reutilizado';exception when invalid_parameter_value then null;end;
 update public.cleaning_roster set notes='Preservado' where service_date='2098-05-01';
 if (select assignments->0->>'label' from public.cleaning_roster where service_date='2098-05-01')<>l.label then raise exception 'Nome histórico perdido';end if;
 select jsonb_build_array(jsonb_build_object('task',task_key,'staff_id',null,'nome',''))into items from public.cleaning_locations where deleted_at is null limit 1;
 insert into public.cleaning_roster(service_date,assignments)values('2098-05-03',items);
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin begin perform public.change_cleaning_location((select id from public.cleaning_locations limit 1),1,'Não permitido',false);raise exception 'Leitor editou local';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
