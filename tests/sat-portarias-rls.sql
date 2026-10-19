begin;
insert into private.login_allowlist values
('test-sub@example.invalid','Teste','reader',array['Subdiretoria'],true),
('test-dir@example.invalid','Teste','administrator',array['Diretoria'],true),
('test-super@example.invalid','Teste','administrator',array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'],true);
insert into auth.users(id,email,aud,role) values
('10000000-0000-4000-8000-000000000001','test-sub@example.invalid','authenticated','authenticated'),
('10000000-0000-4000-8000-000000000002','test-dir@example.invalid','authenticated','authenticated'),
('10000000-0000-4000-8000-000000000003','test-super@example.invalid','authenticated','authenticated');
insert into public.app_members(user_id,display_name,role,sectors)
select u.id,a.display_name,a.role,a.sectors from auth.users u join private.login_allowlist a on a.email=u.email where u.email in ('test-sub@example.invalid','test-dir@example.invalid','test-super@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare i uuid; v integer;begin
 if (select count(*) from public.ordinances)<>50 or (select count(*) from public.ordinance_years)<>10 or (select count(*) from public.sat_commands)<>33 then raise exception 'Contagem incorreta';end if;
 insert into public.ordinance_years(year) values(2099);
 insert into public.ordinances(year,numero) values(2099,'TESTE') returning id into i;
 update public.ordinances set assunto='Alterado' where id=i and version=1;
 select version into v from public.ordinances where id=i;
 if v<>2 then raise exception 'Versão incorreta';end if;
 update public.ordinances set assunto='Obsoleto' where id=i and version=1;
 if found then raise exception 'Concorrência falhou';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.ordinances) or exists(select 1 from public.ordinance_years) then raise exception 'Diretoria acessou portarias';end if;
 if (select count(*) from public.sat_commands)<>33 then raise exception 'Consulta compartilhada bloqueada';end if;
 begin insert into public.ordinance_years(year) values(2098);raise exception 'Ano indevido';exception when insufficient_privilege then null;end;
 begin insert into public.ordinances(year,numero) values(2099,'INDEVIDA');raise exception 'Escrita indevida';exception when insufficient_privilege then null;end;
 update public.ordinances set numero='INDEVIDA';
 if found then raise exception 'Alteração indevida';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin if (select count(*) from public.ordinances)<>51 then raise exception 'Superadministrador sem acesso';end if;end$$;
reset role;
update public.app_members set enabled=false where user_id='10000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$begin if exists(select 1 from public.ordinances) or exists(select 1 from public.sat_commands) then raise exception 'Conta desabilitada acessou';end if;end$$;
reset role;set local role anon;
do $$begin begin perform count(*) from public.ordinances;raise exception 'Anônimo acessou';exception when insufficient_privilege then null;end;begin perform count(*) from public.sat_commands;raise exception 'Anônimo consultou SAT';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
select (select count(*) from public.sat_commands) commands,(select count(*) from public.ordinances) ordinances,(select jsonb_object_agg(year,total) from (select year,count(*) total from public.ordinances group by year) t) by_year;