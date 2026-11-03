begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Subdiretoria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare rid uuid;bid uuid;begin
 insert into public.authorizations(category,protocolo,unidade,data_inicio,data_fim,valor_despesa,valor_arrecadado) values('sat','INTERVALO-TESTE','CAT','2026-12-31','2027-01-03',100,0) returning id into rid;
 if not exists(select 1 from public.authorizations where id=rid and competencia='2026-12-01' and data_inicio='2026-12-31' and data_fim='2027-01-03')then raise exception 'Datas ou mês interno inválidos';end if;
 begin insert into public.authorizations(category,protocolo,unidade,data_inicio,data_fim)values('sat','INVALIDO','CAT','2027-01-02','2027-01-01');raise exception 'Aceitou intervalo invertido';exception when invalid_parameter_value then null;end;
 begin insert into public.authorizations(category,protocolo,unidade)values('sat','INVALIDO','CAT');raise exception 'Aceitou processo novo sem datas';exception when invalid_parameter_value then null;end;
 begin update public.authorizations set data_fim=null where id=rid;raise exception 'Aceitou data incompleta';exception when invalid_parameter_value then null;end;
 insert into public.authorization_period_budgets(data_inicio,data_fim,unidade,saldo_inicial)values('2026-12-31','2027-01-03','GERAL',1000)returning id into bid;
 insert into public.authorization_period_budgets(data_inicio,data_fim,unidade,saldo_inicial)values('2026-12-01','2026-12-30','GERAL',500);
 begin insert into public.authorization_period_budgets(data_inicio,data_fim,unidade,saldo_inicial)values('2026-12-31','2027-01-03','GERAL',500);raise exception 'Aceitou saldo duplicado';exception when unique_violation then null;end;
 begin insert into public.authorization_period_budgets(data_inicio,data_fim,unidade,saldo_inicial)values('2027-01-03','2026-12-31','GERAL',500);raise exception 'Aceitou saldo invertido';exception when invalid_parameter_value then null;end;
 if not exists(select 1 from public.authorization_period_budgets where id=bid and competencia='2026-12-01' and version=1)then raise exception 'Saldo sem mês técnico';end if;
 if not exists(select 1 from jsonb_array_elements(public.get_diarias_snapshot()->'sat')r where r->>'id'=rid::text and r->>'dataInicio'='2026-12-31' and r->>'dataFim'='2027-01-03')then raise exception 'Snapshot perdeu datas';end if;
 if not exists(select 1 from public.authorization_events where authorization_id=rid and after_values->>'data_inicio'='2026-12-31')then raise exception 'Sem auditoria das datas';end if;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.authorizations)then raise exception 'Setor indevido leu processos';end if;
 begin insert into public.authorization_period_budgets(data_inicio,data_fim,unidade,saldo_inicial)values('2026-12-01','2026-12-31','GERAL',1);raise exception 'Setor indevido alterou saldo';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
