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
do $$declare v integer;begin
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000002';
 perform public.admin_approve_user('91000000-0000-4000-8000-000000000002',array['Credenciamento'],false,v);
 begin perform public.admin_save_user('staff-reader@example.invalid','Teste',array['Setor inventado'],true,false,null);raise exception 'Setor inválido aceito';exception when invalid_parameter_value then null;end;
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
insert into public.accreditations(id,kind,modality,name,contact,region,protocol,valid_until,updated_by_name)values('96000000-0000-4000-8000-000000000001','company','Modalidade de teste','Empresa teste','Contato teste','Região teste','PROTOCOLO TESTE','2099-12-31','Autor forjado');
do $$declare v integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001' and updated_by=auth.uid() and updated_by_name<>'Autor forjado' and version=1)then raise exception 'Autoria forjada ou versão incorreta';end if;
 update public.accreditations set valid_until='2099-11-30',updated_by_name='Outro autor',version=99 where id='96000000-0000-4000-8000-000000000001' and version=1;
 update public.accreditations set name='Obsoleto' where id='96000000-0000-4000-8000-000000000001' and version=1;
 get diagnostics v=row_count;if v<>0 then raise exception 'Edição obsoleta sobrescreveu registro';end if;
 begin insert into public.accreditations(kind,modality,name,contact,region,protocol,valid_until)values('company','modalidade de teste','empresa teste','Contato teste','Região teste','PROTOCOLO TESTE','2099-11-30');raise exception 'Credenciamento duplicado';exception when unique_violation then null;end;
 begin perform public.admin_list_users();raise exception 'Credenciamento acessou gestão';exception when insufficient_privilege then null;end;
 if private.is_superadmin(auth.uid())then raise exception 'Credenciamento virou superadmin';end if;
end$$;
reset role;
update public.app_members set sectors=array['Diretoria']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Subdiretoria']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Secretaria']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Vistoriador']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Análise']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.app_members set sectors=array['Multas']where user_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if not exists(select 1 from public.accreditations where id='96000000-0000-4000-8000-000000000001')then raise exception 'Consulta de credenciamento bloqueada';end if;
 update public.accreditations set name='Alteração indevida' where id='96000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Outro setor editou credenciamento';end if;
 begin insert into public.accreditations(kind,modality,name,valid_until)values('professional','Teste','Indevido','2099-01-01');raise exception 'Outro setor incluiu credenciamento';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
update public.accreditations set protocol='PROTOCOLO REVISTO' where id='96000000-0000-4000-8000-000000000001';
do $$declare v integer;begin
 select version into v from public.user_registrations where user_id='91000000-0000-4000-8000-000000000003';
 perform public.admin_save_user('staff-reader@example.invalid','Consulta Teste Efetivo',array['Credenciamento'],true,false,v);
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.app_members where user_id='91000000-0000-4000-8000-000000000003' and sectors=array['Credenciamento'])then raise exception 'Novo perfil não foi salvo';end if;
 if not exists(select 1 from private.audit_events where resource='accreditations' and actor_id='91000000-0000-4000-8000-000000000001' and action='update')then raise exception 'Alteração não auditada';end if;
end$$;
update public.app_members set enabled=false where user_id='91000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.accreditations)then raise exception 'Bloqueado consultou credenciamentos';end if;end$$;
reset role;
set local role anon;
do $$begin begin perform count(*)from public.accreditations;raise exception 'Anônimo consultou credenciamentos';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
