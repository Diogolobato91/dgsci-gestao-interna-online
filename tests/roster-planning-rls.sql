begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('81000000-0000-4000-8000-000000000001','roster-secretary@example.invalid','{"nome":"Secretaria Escala","posto_graduacao":"CAP","matricula":"9011","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"(91) 99999-0001"}'),
 ('81000000-0000-4000-8000-000000000002','roster-pending@example.invalid','{"nome":"Pendente Escala","posto_graduacao":"SD","matricula":"9021","cpf":"11144477735","data_nascimento":"1980-01-01","contato":"91999990002"}'),
 ('81000000-0000-4000-8000-000000000003','roster-reader@example.invalid','{"nome":"Consulta Escala","posto_graduacao":"SD","matricula":"9031","cpf":"22233344405","data_nascimento":"1980-01-01","contato":"91999990003"}');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='81000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='81000000-0000-4000-8000-000000000003';
insert into public.staff(id,source_key,source_order,posto_graduacao,nome,mf,cpf,categoria) values
 ('82000000-0000-4000-8000-000000000001','roster-test-a',1,'CAP','Militar A','901/1','529.982.247-25','Militar'),
 ('82000000-0000-4000-8000-000000000002','roster-test-b',2,'SGT','Militar B','902/1','111.444.777-35','Militar'),
 ('82000000-0000-4000-8000-000000000003','roster-test-c',3,'TEN','Militar C',null,null,'Militar'),
 ('82000000-0000-4000-8000-000000000004','roster-test-vc',4,'VC','Voluntário Civil',null,null,'Voluntário civil');
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$declare p uuid[];v uuid;affected int;begin
 select array_agg(id order by nome) into p from public.roster_people where nome in ('Militar A','Militar B','Militar C');
 select id into v from public.roster_people where staff_id='82000000-0000-4000-8000-000000000004';
 if exists(select 1 from jsonb_array_elements(public.get_roster_people()) x where x->>'nome'='Militar A' and x->>'resolved_contact' is not null) then raise exception 'Contato pendente utilizado antes da aprovação';end if;
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values('2100-01-01',p[1],p[2],p[3]);
 begin
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values('2100-01-02',p[1],p[2],null);
 raise exception 'Plantão incompleto aceito';exception when not_null_violation or invalid_parameter_value then null;end;
 begin
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values('2100-01-02',p[1],p[1],p[3]);
 raise exception 'Militar duplicado aceito';exception when check_violation or invalid_parameter_value then null;end;
 begin
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values('2100-01-02',p[1],p[2],v);
 raise exception 'VC escalado no plantão';exception when invalid_parameter_value then null;end;
 update public.plantao_roster set notes='Editado' where service_date='2100-01-01' and version=1;
 update public.plantao_roster set notes='Obsoleto' where service_date='2100-01-01' and version=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Conflito de versão ignorado';end if;
 insert into public.roster_plans(month,notes) values('2100-01-01','Observações restritas');
 insert into public.roster_plan_rows(month,section,nome,posto_graduacao,cells) values
 ('2100-01-01','Chefe do Plantão','Militar A','CAP','{"2100-01-01":{"value":"0","status":"service_red","bg":"#ff0000","fg":"#ffffff"}}');
 begin
 insert into public.roster_plan_rows(month,section,nome,posto_graduacao,cells) values
 ('2100-01-01','Chefe do Plantão','Inválido','CAP','{"2100-04-01":{"value":"1","status":"service_red"}}');
 raise exception 'Data fora do mês aceita';exception when invalid_parameter_value then null;end;
end$$;
reset role;
update public.user_registrations set status='approved' where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$declare p uuid;ver integer;begin
 if not exists(select 1 from jsonb_array_elements(public.get_roster_people()) x where x->>'nome'='Militar A' and x->>'resolved_contact'='91999990001') then raise exception 'Contato aprovado não vinculado por CPF e matrícula';end if;
 select id,version into p,ver from public.roster_people where staff_id='82000000-0000-4000-8000-000000000001';
 perform public.set_roster_contact(p,'91999990009',ver);
 if not exists(select 1 from jsonb_array_elements(public.get_roster_people()) x where x->>'nome'='Militar A' and x->>'resolved_contact'='91999990009') then raise exception 'Contato atualizado não sincronizado';end if;
 begin perform public.set_roster_contact(p,'91999990000',ver);raise exception 'Conflito no contato ignorado';exception when serialization_failure then null;end;
end$$;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.plantao_roster) or exists(select 1 from public.roster_plan_rows) or exists(select 1 from public.roster_plans) or exists(select 1 from public.roster_people) then raise exception 'Pendente acessou escala';end if;
 begin perform public.get_roster_people();raise exception 'Pendente obteve contatos';exception when insufficient_privilege then null;end;
 begin perform public.set_roster_contact(gen_random_uuid(),'91999990000',1);raise exception 'Pendente editou contatos';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.roster_plans) then raise exception 'Setor não autorizado leu observações';end if;
 begin perform public.get_roster_people();raise exception 'Setor não autorizado obteve contatos';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if (select contato from public.user_registrations where user_id='81000000-0000-4000-8000-000000000001')<>'91999990009' then raise exception 'Cadastro não sincronizou contato';end if;
 begin
 insert into auth.users(id,email,raw_user_meta_data) values('81000000-0000-4000-8000-000000000004','roster-bad-phone@example.invalid','{"nome":"Contato Inválido","posto_graduacao":"SD","matricula":"9041","cpf":"12345678909","data_nascimento":"1980-01-01","contato":"123"}');
 raise exception 'Telefone inválido aceito';exception when invalid_parameter_value then null;end;
 if exists(select 1 from auth.users where id='81000000-0000-4000-8000-000000000004') then raise exception 'Cadastro parcial persistiu';end if;
end$$;
set local role anon;
do $$begin
 begin perform public.get_roster_people();raise exception 'Anônimo obteve contatos';exception when insufficient_privilege then null;end;
 begin perform * from public.plantao_roster;raise exception 'Anônimo leu escala';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
