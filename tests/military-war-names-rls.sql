begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','staff-secretary@example.invalid','{"nome_guerra":"teixeira","nome":"Gestor Teste Efetivo","posto_graduacao":"CAP","matricula":"901/1","cpf":"52998224725","data_nascimento":"1980-01-01","contato":"91999990001"}'),
 ('91000000-0000-4000-8000-000000000002','staff-pending@example.invalid','{"nome":"Pendente Teste Efetivo","posto_graduacao":"SD","matricula":"902/1","cpf":"11144477735","data_nascimento":"1980-01-01"}'),
 ('91000000-0000-4000-8000-000000000003','staff-reader@example.invalid','{"nome":"Consulta Teste Efetivo","posto_graduacao":"SD","matricula":"903/1","cpf":"22233344405","data_nascimento":"1980-01-01"}');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='91000000-0000-4000-8000-000000000001';
update public.user_registrations set status='approved' where user_id='91000000-0000-4000-8000-000000000001';
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='91000000-0000-4000-8000-000000000003';
update public.app_members set role='administrator',sectors=array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'] where user_id='91000000-0000-4000-8000-000000000001';
insert into private.login_allowlist(email,display_name,enabled,role,sectors) values('staff-secretary@example.invalid','Gestor Teste Efetivo',true,'administrator',array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']) on conflict(email) do update set enabled=excluded.enabled,role=excluded.role,sectors=excluded.sectors;
do $$begin
 if not exists(select 1 from public.user_registrations where user_id='91000000-0000-4000-8000-000000000001' and nome_guerra='TEIXEIRA')then raise exception 'Nome de guerra não coletado';end if;
 if not exists(select 1 from public.app_members where user_id='91000000-0000-4000-8000-000000000002' and not enabled and cardinality(sectors)=0)then raise exception 'Coleta alterou aprovação';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare s uuid;a uuid;e uuid;p uuid;q uuid;r uuid;ver integer;begin
 s:=public.save_staff_member(null,null,'Nome Completo Teste A','2º SGT','901/1','52998224725','1980-01-01',null,null);
 a:=public.save_staff_member(null,null,'Nome Completo Teste B','CAP',null,null,null,null,'OLIVEIRA');
 e:=public.save_staff_member(null,null,'Nome Completo Teste C','MAJ',null,null,null,null,null);
 if not exists(select 1 from jsonb_array_elements(public.get_roster_people())x where x->>'staff_id'=s::text and x->>'nome_guerra'='TEIXEIRA')then raise exception 'Nome aprovado sem contato não disponível na escala';end if;
 if not exists(select 1 from jsonb_array_elements(public.get_staff_snapshot()->'registros')x where x->>'id'=a::text and x->>'nomeGuerra'='OLIVEIRA')then raise exception 'Efetivo sem nome de guerra';end if;
 select id into p from public.roster_people where staff_id=s;select id into q from public.roster_people where staff_id=a;select id into r from public.roster_people where staff_id=e;
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id)values((now()at time zone 'America/Fortaleza')::date,p,q,r);
 if not exists(select 1 from jsonb_array_elements(public.get_today_duty()->'team')x where x->>'nome'='TEIXEIRA')then raise exception 'Dashboard perdeu nome de guerra';end if;
 select version into ver from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002';
 perform public.admin_save_user_full('91000000-0000-4000-8000-000000000002',ver,jsonb_build_object('nome','Pendente Teste','nome_guerra','alves'),array[]::text[],false,false);
 if not exists(select 1 from jsonb_array_elements(public.admin_list_users())x where x->>'user_id'='91000000-0000-4000-8000-000000000002' and x->>'nome_guerra'='ALVES' and x->>'status'='pending_approval')then raise exception 'Edição não preservou nome/situação';end if;
 begin perform public.save_staff_member(null,null,'Nome inválido','CAP',null,null,null,null,'<script>');raise exception 'Aceitou marcação inválida';exception when invalid_parameter_value then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.save_staff_member(null,null,'Não autorizado','CAP',null,null,null,null,'SILVA');raise exception 'Leitor alterou efetivo';exception when insufficient_privilege then null;end;
 begin perform public.get_roster_people();raise exception 'Leitor consultou efetivo';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
