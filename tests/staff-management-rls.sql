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
do $$declare s uuid;a uuid;e uuid;v uuid;p uuid;q uuid;r uuid;absence_id uuid;roster_id uuid;ver int;affected int;begin
 s:=public.save_staff_member(null,null,'TESTE Efetivo A','CAP','901/1','52998224725','1980-01-01','91999990004');
 a:=public.save_staff_member(null,null,'TESTE Efetivo B','2º SGT','902/1',null,null,null);
 e:=public.save_staff_member(null,null,'TESTE Efetivo C','1º TEN','903/1',null,null,null);
 v:=public.save_staff_member(null,null,'TESTE Efetivo VC','VC',null,null,null,null);
 if not exists(select 1 from jsonb_array_elements(public.get_staff_snapshot()->'registros')x where x->>'id'=s::text and x->>'contato'='91999990004') then raise exception 'Cadastro não retornou contato';end if;
 select version into ver from public.staff where id=s;
 perform public.save_staff_member(s,ver,'TESTE Efetivo A Atualizado','MAJ','901/1','52998224725','1980-01-01','91999990005');
 begin perform public.save_staff_member(s,ver,'Sobrescrita','MAJ','901/1','52998224725','1980-01-01',null);raise exception 'Cadastro obsoleto aceito';exception when serialization_failure then null;end;
 if not exists(select 1 from public.roster_people where staff_id=s and nome='TESTE Efetivo A Atualizado' and posto_graduacao='MAJ') then raise exception 'Efetivo não sincronizou com escala';end if;
 begin perform public.save_staff_member(null,null,'Duplicado','CAP','9011',null,null,null);raise exception 'Matrícula duplicada aceita';exception when unique_violation then null;end;
 begin perform public.save_staff_member(null,null,'CPF Inválido','CAP',null,'11111111111',null,null);raise exception 'CPF inválido aceito';exception when invalid_parameter_value then null;end;
 begin perform public.save_staff_member(null,null,'Data Inválida','CAP',null,null,current_date+1,null);raise exception 'Nascimento futuro aceito';exception when invalid_parameter_value then null;end;
 begin update public.staff set nome='Bypass' where id=s;raise exception 'Edição direta de efetivo permitida';exception when insufficient_privilege then null;end;
 begin update public.roster_people set staff_id=a where staff_id=s;raise exception 'Vínculo da escala alterado diretamente';exception when insufficient_privilege then null;end;
 select id into p from public.roster_people where staff_id=s;
 select id into q from public.roster_people where staff_id=a;
 select id into r from public.roster_people where staff_id=e;
 insert into public.plantao_roster(service_date,chief_id,assistant_id,expert_id) values('2100-01-01',p,q,r) returning id into roster_id;
 select version into ver from public.staff where id=s;
 begin perform public.save_staff_member(s,ver,'TESTE Efetivo A Atualizado','VC','901/1','52998224725','1980-01-01',null);raise exception 'Militar com plantão futuro convertido em VC';exception when invalid_parameter_value then null;end;
 insert into public.staff_absences(staff_id,kind,starts_on,ends_on,reason) values(s,'Férias','2100-01-01','2100-01-01','Referência de teste') returning id into absence_id;
 if jsonb_array_length(public.get_absence_roster_conflicts(s,'2100-01-01','2100-01-01'))<>1 then raise exception 'Plantão existente não sinalizado';end if;
 if not exists(select 1 from public.plantao_roster where id=roster_id) then raise exception 'Afastamento apagou plantão';end if;
 begin update public.plantao_roster set notes='Conflito' where id=roster_id;raise exception 'Militar afastado escalado no dia inicial/final';exception when invalid_parameter_value then null;end;
 begin insert into public.staff_absences(staff_id,kind,starts_on,ends_on) values(s,'Licença','2099-12-31','2100-01-01');raise exception 'Sobreposição aceita';exception when invalid_parameter_value then null;end;
 begin insert into public.staff_absences(staff_id,kind,starts_on,ends_on) values(a,'Licença','2100-01-02','2100-01-01');raise exception 'Período invertido aceito';exception when check_violation then null;end;
 insert into public.staff_absences(staff_id,kind,starts_on,ends_on) values(s,'Afastamento','2100-01-02','2100-01-02');
 update public.staff_absences set reason='Editado' where id=absence_id and version=1;
 update public.staff_absences set reason='Obsoleto' where id=absence_id and version=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Afastamento obsoleto sobrescreveu registro';end if;
 begin update public.staff_absences set staff_id=a where id=absence_id;raise exception 'Titular do afastamento alterado';exception when invalid_parameter_value then null;end;
 begin update public.staff_absences set cancelled_at=now(),cancellation_reason='' where id=absence_id;raise exception 'Cancelamento sem motivo aceito';exception when invalid_parameter_value then null;end;
 update public.staff_absences set cancelled_at=now(),cancellation_reason='Retificação de teste' where id=absence_id;
 if not exists(select 1 from public.staff_absences where id=absence_id and cancelled_at is not null and cancelled_by=auth.uid()) then raise exception 'Cancelamento não preservado';end if;
 begin update public.staff_absences set cancelled_at=null where id=absence_id;raise exception 'Registro cancelado reativado por edição';exception when invalid_parameter_value then null;end;
 update public.plantao_roster set notes='Disponível após cancelamento' where id=roster_id;
 begin delete from public.staff_absences where id=absence_id;raise exception 'Histórico apagado';exception when insufficient_privilege then null;end;
 select version into ver from public.staff where id=s;
 perform public.save_staff_member(s,ver,'TESTE Efetivo A Atualizado','MAJ','901/1','52998224725','1980-01-01',null);
 if exists(select 1 from jsonb_array_elements(public.get_staff_snapshot()->'registros')x where x->>'id'=s::text and x->>'contato' is not null) then raise exception 'Contato removido ainda aparece';end if;
end$$;
-- Os três setores de Administração usam a mesma autorização, sem conceder papéis no Auth.
reset role;
update public.app_members set sectors=array['Subdiretoria'] where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin perform public.save_staff_member(null,null,'TESTE Subdiretoria','SD',null,null,null,null);end$$;
reset role;
update public.app_members set sectors=array['Diretoria'] where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin perform public.save_staff_member(null,null,'TESTE Diretoria','SD',null,null,null,null);end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.staff_absences) then raise exception 'Pendente leu afastamentos';end if;
 begin perform public.save_staff_member(null,null,'Tentativa','CAP',null,null,null,null);raise exception 'Pendente editou efetivo';exception when insufficient_privilege then null;end;
 begin perform public.get_absence_roster_conflicts(gen_random_uuid(),'2100-01-01','2100-01-02');raise exception 'Pendente consultou conflitos';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.staff_absences) then raise exception 'Outro setor leu afastamentos';end if;
 begin perform public.save_staff_member(null,null,'Tentativa','CAP',null,null,null,null);raise exception 'Outro setor editou efetivo';exception when insufficient_privilege then null;end;
 begin insert into public.staff_absences(staff_id,kind,starts_on,ends_on) values(gen_random_uuid(),'Férias','2100-01-01','2100-01-02');raise exception 'Outro setor cadastrou afastamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$begin
 if exists(select 1 from public.staff_absences) then raise exception 'Gestor bloqueado leu afastamentos';end if;
 begin perform public.save_staff_member(null,null,'Tentativa','CAP',null,null,null,null);raise exception 'Gestor bloqueado editou efetivo';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform * from public.staff_absences;raise exception 'Anônimo leu afastamentos';exception when insufficient_privilege then null;end;
 begin perform public.save_staff_member(null,null,'Tentativa','CAP',null,null,null,null);raise exception 'Anônimo editou efetivo';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
