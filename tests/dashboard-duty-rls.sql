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
do $$declare s uuid;a uuid;e uuid;p uuid;q uuid;r uuid;day date:=(now() at time zone 'America/Fortaleza')::date;begin
 s:=public.save_staff_member(null,null,'TESTE Painel Chefe','CAP','901/1','52998224725','1980-01-01','91999990004');
 a:=public.save_staff_member(null,null,'TESTE Painel Auxiliar','SD',null,null,null,null);
 e:=public.save_staff_member(null,null,'TESTE Painel Perito','MAJ',null,null,null,null);
 select id into p from public.roster_people where staff_id=s;
 select id into q from public.roster_people where staff_id=a;
 select id into r from public.roster_people where staff_id=e;
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values(day,p,q,r)
 on conflict(service_date) do update set chief_id=excluded.chief_id,assistant_id=excluded.assistant_id,expert_id=excluded.expert_id;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare result jsonb;begin
 result:=public.get_today_duty();
 if result->>'date'<>(now() at time zone 'America/Fortaleza')::date::text then raise exception 'Data incorreta';end if;
 if result->>'registered'<>'true' or jsonb_array_length(result->'team')<>3 then raise exception 'Equipe incompleta';end if;
 if result->'team'->0->>'role'<>'Chefe do Plantão' or result->'team'->0->>'contato'<>'91999990004' then raise exception 'Função ou contato incorreto';end if;
 if exists(select 1 from public.roster_people) then raise exception 'Leitura completa da escala liberada indevidamente';end if;
 if result::text like '%52998224725%' or result::text like '%1980-01-01%' then raise exception 'Dados pessoais expostos';end if;
 if result->>'needs_review'<>'false' then raise exception 'Conflito inexistente';end if;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.get_today_duty();raise exception 'Pendente consultou plantão';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.get_today_duty();raise exception 'Bloqueado consultou plantão';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.get_today_duty();raise exception 'Anônimo consultou plantão';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
