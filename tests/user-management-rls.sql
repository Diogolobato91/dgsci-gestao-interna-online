-- Execute after supabase/user_management.sql; all fixtures are rolled back.
begin;
-- Isolated fixtures; no real account is modified or confirmed.
insert into private.login_allowlist(email,display_name,role,sectors,enabled) values
 ('manager-test@example.invalid','Teste gestor','administrator',array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'],true),
 ('regular-test@example.invalid','Teste comum','editor',array['Diretoria'],true);
insert into auth.users(id,email,aud,role) values
 ('30000000-0000-4000-8000-000000000001','manager-test@example.invalid','authenticated','authenticated'),
 ('30000000-0000-4000-8000-000000000002','regular-test@example.invalid','authenticated','authenticated');
insert into public.app_members(user_id,display_name,role,sectors,enabled)
 select u.id,a.display_name,a.role,a.sectors,a.enabled from auth.users u
 join private.login_allowlist a on a.email=u.email where u.email in ('manager-test@example.invalid','regular-test@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 begin perform public.admin_list_users();raise exception 'Usuário comum acessou a lista';exception when insufficient_privilege then null;end;
 begin perform public.admin_save_user('unauthorized@example.invalid','Teste',array['Diretoria'],true,false,null);raise exception 'Usuário comum escalou privilégio';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare row_data jsonb;begin
 perform public.admin_save_user('  NEW-TEST@example.invalid ','Teste criado',array['Secretaria','Secretaria'],true,false,null);
 select value into row_data from jsonb_array_elements(public.admin_list_users()) where value->>'email'='new-test@example.invalid';
 if row_data->>'status'<>'pending_registration' or row_data->>'role'<>'editor' or row_data->'sectors'<>'["Secretaria"]'::jsonb then raise exception 'Cadastro inválido';end if;
 begin perform public.admin_save_user('new-test@example.invalid','Duplicado',array['Secretaria'],true,false,null);raise exception 'Duplicidade aceita';exception when unique_violation then null;end;
 perform public.admin_save_user('new-test@example.invalid','Bloqueado',array['Análise'],false,false,1);
 begin perform public.admin_save_user('new-test@example.invalid','Obsoleto',array['Multas'],true,false,1);raise exception 'Versão obsoleta aceita';exception when serialization_failure then null;end;
 perform public.admin_save_user('new-test@example.invalid','Liberado',array['Multas'],true,false,2);
 begin perform public.admin_save_user('manager-test@example.invalid','Gestor',array['Diretoria'],false,false,1);raise exception 'Autobloqueio permitido';exception when invalid_parameter_value then null;end;
 begin perform public.admin_save_user('bad-email','Inválido',array['Secretaria'],true,false,null);raise exception 'Email inválido aceito';exception when invalid_parameter_value then null;end;
 begin perform public.admin_save_user('bad-sector@example.invalid','Inválido',array['Setor inexistente'],true,false,null);raise exception 'Setor inválido aceito';exception when invalid_parameter_value then null;end;
 perform public.admin_save_user('regular-test@example.invalid','Bloqueado',array['Diretoria'],false,false,1);
end$$;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.sat_commands) then raise exception 'Bloqueio não retirou acesso';end if;
 begin perform public.admin_list_users();raise exception 'Bloqueado acessou lista';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- A disabled former manager must lose access even with old JWT claims.
update public.app_members set enabled=false where user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin begin perform public.admin_list_users();raise exception 'Gestor bloqueado acessou';exception when insufficient_privilege then null;end;end$$;
reset role;
do $$begin
 if (select count(*) from private.user_access_audit where target_email in ('new-test@example.invalid','regular-test@example.invalid'))<>4 then raise exception 'Auditoria incompleta';end if;
 if exists(select 1 from auth.users where email='new-test@example.invalid') then raise exception 'Fluxo criou conta Auth indevidamente';end if;
end$$;
set local role anon;
do $$begin begin perform public.admin_list_users();raise exception 'Anônimo acessou lista';exception when insufficient_privilege then null;end;
 begin perform public.admin_save_user('anon@example.invalid','Anon',array['Multas'],true,false,null);raise exception 'Anônimo alterou';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
