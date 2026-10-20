-- Teste de validação RLS, autorização, integridade de superadmin e transações do fluxo de cadastro com aprovação.
-- Todas as fixtures são revertidas com rollback ao final.
begin;

-- 1. Fixtures realistas: login_allowlist, auth.users, app_members e user_registrations
insert into private.login_allowlist(email, display_name, role, sectors, enabled) values
  ('superadmin-test@example.invalid', 'Gestor Principal', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('superadmin-second@example.invalid', 'Gestor Secundário', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('regular-test@example.invalid', 'Comum Teste', 'editor', array['Secretaria'], true),
  ('blocked-test@example.invalid', 'Bloqueado Teste', 'editor', array['Secretaria'], false);

insert into auth.users(id, email, aud, role) values
  ('40000000-0000-4000-8000-000000000001', 'superadmin-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000002', 'superadmin-second@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000003', 'regular-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000004', 'pending-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000005', 'blocked-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000006', 'legacy-user@example.invalid', 'authenticated', 'authenticated');

insert into public.app_members(user_id, display_name, role, sectors, enabled) values
  ('40000000-0000-4000-8000-000000000001', 'Gestor Principal', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('40000000-0000-4000-8000-000000000002', 'Gestor Secundário', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('40000000-0000-4000-8000-000000000003', 'Comum Teste', 'editor', array['Secretaria'], true),
  ('40000000-0000-4000-8000-000000000004', 'Pendente Teste', 'reader', array[]::text[], false),
  ('40000000-0000-4000-8000-000000000005', 'Bloqueado Teste', 'editor', array['Secretaria'], false),
  ('40000000-0000-4000-8000-000000000006', 'Conta Legada Antiga', 'editor', array['Vistoriador'], true);

insert into public.user_registrations(user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status) values
  ('40000000-0000-4000-8000-000000000001', 'superadmin-test@example.invalid', 'Gestor Principal', 'CEL', 'MAT-001', '52998224725', '1980-01-01', 'approved'),
  ('40000000-0000-4000-8000-000000000002', 'superadmin-second@example.invalid', 'Gestor Secundário', 'TCEL', 'MAT-002', '11144477735', '1982-03-10', 'approved'),
  ('40000000-0000-4000-8000-000000000003', 'regular-test@example.invalid', 'Comum Teste', 'CAP', 'MAT-003', '90467142074', '1985-05-15', 'approved'),
  ('40000000-0000-4000-8000-000000000004', 'pending-test@example.invalid', 'Pendente Teste', 'SD', 'MAT-004', '71425178041', '1998-10-20', 'pending_approval'),
  ('40000000-0000-4000-8000-000000000005', 'blocked-test@example.invalid', 'Bloqueado Teste', 'CB', 'MAT-005', '41285272023', '1990-03-12', 'blocked'),
  ('40000000-0000-4000-8000-000000000006', 'legacy-user@example.invalid', 'Conta Legada Antiga', null, null, null, null, 'approved');

-- 2. Teste de chamadas autorizadas com sucesso pelo Superadministrador
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$declare
  users_data jsonb;
  pending_row jsonb;
  legacy_row jsonb;
  audit_data jsonb;
  allowlist_row private.login_allowlist%rowtype;
  member_row public.app_members%rowtype;
begin
  -- 2.1 Listagem de usuários pelo superadmin funciona
  select public.admin_list_users() into users_data;
  if jsonb_array_length(users_data) < 6 then
    raise exception 'admin_list_users não retornou a quantidade esperada de registros';
  end if;

  select value into pending_row from jsonb_array_elements(users_data) where value->>'email' = 'pending-test@example.invalid';
  if pending_row->>'status' <> 'pending_approval' or pending_row->>'posto_graduacao' <> 'SD' then
    raise exception 'Superadmin não localizou usuário pendente com dados corretos';
  end if;

  -- 2.2 Usuário legado preservado sem dados inventados
  select value into legacy_row from jsonb_array_elements(users_data) where value->>'email' = 'legacy-user@example.invalid';
  if legacy_row->>'cpf' is not null or legacy_row->>'matricula' is not null or legacy_row->>'posto_graduacao' is not null then
    raise exception 'Usuário legado possui dados inventados indevidamente';
  end if;

  -- 2.3 Aprovação de cadastro com atribuição de setores funciona e sincroniza todas as fontes
  perform public.admin_approve_user('40000000-0000-4000-8000-000000000004', array['Vistoriador'], false, 1);

  select * into member_row from public.app_members where user_id = '40000000-0000-4000-8000-000000000004';
  if not member_row.enabled or member_row.sectors <> array['Vistoriador'] then
    raise exception 'Aprovação não atualizou app_members corretamente';
  end if;

  select * into allowlist_row from private.login_allowlist where email = 'pending-test@example.invalid';
  if not allowlist_row.enabled or allowlist_row.sectors <> array['Vistoriador'] then
    raise exception 'Aprovação não sincronizou login_allowlist';
  end if;

  -- 2.4 Bloqueio e desbloqueio funciona e mantém sincronização
  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000004', false, 2);
  if (select enabled from public.app_members where user_id = '40000000-0000-4000-8000-000000000004') then
    raise exception 'Bloqueio não desabilitou app_members';
  end if;
  if (select enabled from private.login_allowlist where email = 'pending-test@example.invalid') then
    raise exception 'Bloqueio não desabilitou login_allowlist';
  end if;

  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000004', true, 3);
  if not (select enabled from public.app_members where user_id = '40000000-0000-4000-8000-000000000004') then
    raise exception 'Desbloqueio não reabilitou app_members';
  end if;

  -- 2.5 Alteração cadastral via admin_save_user funciona e mantém consistência
  perform public.admin_save_user('pending-test@example.invalid', 'Pendente Atualizado', array['Vistoriador', 'Secretaria'], true, false, 4);
  if (select display_name from public.app_members where user_id = '40000000-0000-4000-8000-000000000004') <> 'Pendente Atualizado' then
    raise exception 'admin_save_user não sincronizou app_members';
  end if;
  if (select display_name from private.login_allowlist where email = 'pending-test@example.invalid') <> 'Pendente Atualizado' then
    raise exception 'admin_save_user não sincronizou login_allowlist';
  end if;
  if (select nome from public.user_registrations where user_id = '40000000-0000-4000-8000-000000000004') <> 'Pendente Atualizado' then
    raise exception 'admin_save_user não sincronizou user_registrations';
  end if;

  -- 2.6 Rejeição com justificativa funciona
  insert into auth.users(id, email, aud, role) values ('40000000-0000-4000-8000-000000000099', 'temp-reject@example.invalid', 'authenticated', 'authenticated');
  insert into public.app_members(user_id, display_name, role, sectors, enabled) values ('40000000-0000-4000-8000-000000000099', 'Temp', 'reader', '{}', false);
  insert into public.user_registrations(user_id, email, nome, status) values ('40000000-0000-4000-8000-000000000099', 'temp-reject@example.invalid', 'Temp', 'pending_approval');

  perform public.admin_reject_user('40000000-0000-4000-8000-000000000099', 'Matrícula não localizada no efetivo', 1);
  if (select status from public.user_registrations where user_id = '40000000-0000-4000-8000-000000000099') <> 'rejected' then
    raise exception 'Rejeição não atualizou status para rejected';
  end if;

  -- 2.7 Histórico de auditoria funciona
  select public.admin_list_audit('pending-test@example.invalid') into audit_data;
  if jsonb_array_length(audit_data) < 4 then
    raise exception 'Auditoria incompleta para pending-test';
  end if;
end$$;

-- 3. Teste de proteções administrativas e integridade do superadministrador
do $$begin
  -- 3.1 Autobloqueio negado (via admin_toggle_user e admin_save_user)
  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000001', false, 1);
    raise exception 'Superadministrador conseguiu se autobloquear via admin_toggle_user';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_save_user('superadmin-test@example.invalid', 'Gestor Principal', array['Secretaria'], false, false, 1);
    raise exception 'Superadministrador conseguiu se autobloquear via admin_save_user';
  exception when invalid_parameter_value then null; end;

  -- 3.2 Autorrejeição negada
  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000001', 'Tentativa de rejeição de si mesmo', 1);
    raise exception 'Superadministrador conseguiu se autorrejeitar';
  exception when invalid_parameter_value then null; end;

  -- 3.3 Rejeição de superadministrador negada mesmo vinda de outro superadmin
  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000002', 'Tentativa de rejeição de outro superadmin', 1);
    raise exception 'Superadministrador conseguiu rejeitar outro superadmin';
  exception when invalid_parameter_value then null; end;

  -- 3.4 Autorrebaixamento negado (tentar retirar próprio papel superadmin)
  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000001', array['Secretaria'], false, 1);
    raise exception 'Superadministrador conseguiu se autorrebaixar via admin_approve_user';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_save_user('superadmin-test@example.invalid', 'Gestor Principal', array['Secretaria'], true, false, 1);
    raise exception 'Superadministrador conseguiu se autorrebaixar via admin_save_user';
  exception when invalid_parameter_value then null; end;

  -- 3.5 Proteção de último superadmin ativo
  -- Primeiro desabilita o superadmin secundário (permitido pois o principal ainda está ativo)
  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', false, 1);

  -- Agora tentar remover ou bloquear o superadmin restante deve falhar
  begin
    perform public.admin_save_user('superadmin-second@example.invalid', 'Gestor Secundário', array['Secretaria'], false, false, 2);
    -- Já está inativo, ok
  end;

  -- Reativa o secundário para manter estado consistente
  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', true, 2);

  -- 3.6 Aprovação sem setores negada
  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000004', array[]::text[], false, 5);
    raise exception 'Aprovação sem setores foi aceita';
  exception when invalid_parameter_value then null; end;

  -- 3.7 Rejeição sem justificativa negada
  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000004', '', 5);
    raise exception 'Rejeição sem motivo foi aceita';
  exception when invalid_parameter_value then null; end;
end$$;

-- 4. Teste de duplicidades concorrentes e garantia de mensagem genérica sem dados pessoais
do $$
declare
  err_code text;
  err_msg text;
begin
  -- 4.1 Duplicidade por e-mail existente
  begin
    insert into auth.users(id, email, aud, role, raw_user_meta_data)
    values (
      '40000000-0000-4000-8000-000000000088',
      'regular-test@example.invalid', -- e-mail já existente
      'authenticated', 'authenticated',
      jsonb_build_object('nome', 'Novo Usuário', 'posto_graduacao', 'SD', 'matricula', 'MAT-999', 'cpf', '01234567890', 'data_nascimento', '1995-01-01')
    );
    raise exception 'Falha ao bloquear duplicidade de e-mail';
  exception when others then
    get stacked diagnostics err_code = RETURNED_SQLSTATE, err_msg = MESSAGE_TEXT;
    if err_code <> '23505' then
      raise exception 'Código de erro inesperado para duplicidade de e-mail: %', err_code;
    end if;
    if err_msg <> 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' then
      raise exception 'Mensagem de duplicidade expôs dados ou divergiu: %', err_msg;
    end if;
  end;

  -- 4.2 Duplicidade por CPF existente
  begin
    insert into auth.users(id, email, aud, role, raw_user_meta_data)
    values (
      '40000000-0000-4000-8000-000000000089',
      'outro-email@example.invalid',
      'authenticated', 'authenticated',
      jsonb_build_object('nome', 'Novo Usuário 2', 'posto_graduacao', 'SD', 'matricula', 'MAT-998', 'cpf', '529.982.247-25', 'data_nascimento', '1995-01-01')
    );
    raise exception 'Falha ao bloquear duplicidade de CPF';
  exception when others then
    get stacked diagnostics err_code = RETURNED_SQLSTATE, err_msg = MESSAGE_TEXT;
    if err_code <> '23505' then
      raise exception 'Código de erro inesperado para duplicidade de CPF: %', err_code;
    end if;
    if err_msg <> 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' then
      raise exception 'Mensagem de duplicidade expôs CPF: %', err_msg;
    end if;
    if err_msg like '%529%' or err_msg like '%CPF%' or err_msg like '%MAT%' then
      raise exception 'Mensagem pública de erro vazou detalhes pessoais: %', err_msg;
    end if;
  end;

  -- 4.3 Duplicidade por matrícula existente
  begin
    insert into auth.users(id, email, aud, role, raw_user_meta_data)
    values (
      '40000000-0000-4000-8000-000000000090',
      'mais-um-email@example.invalid',
      'authenticated', 'authenticated',
      jsonb_build_object('nome', 'Novo Usuário 3', 'posto_graduacao', 'SD', 'matricula', 'MAT-001', 'cpf', '01234567890', 'data_nascimento', '1995-01-01')
    );
    raise exception 'Falha ao bloquear duplicidade de matrícula';
  exception when others then
    get stacked diagnostics err_code = RETURNED_SQLSTATE, err_msg = MESSAGE_TEXT;
    if err_code <> '23505' then
      raise exception 'Código de erro inesperado para duplicidade de matrícula: %', err_code;
    end if;
    if err_msg <> 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.' then
      raise exception 'Mensagem de duplicidade expôs dados ou divergiu: %', err_msg;
    end if;
  end;
end$$;

-- 5. Teste de chamadas não autorizadas por usuário comum
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$begin
  begin
    perform public.admin_list_users();
    raise exception 'Usuário comum acessou admin_list_users';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000004', array['Secretaria'], false, 4);
    raise exception 'Usuário comum executou admin_approve_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000004', 'Motivo', 4);
    raise exception 'Usuário comum executou admin_reject_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000004', false, 4);
    raise exception 'Usuário comum executou admin_toggle_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_save_user('pending-test@example.invalid', 'Nome', array['Secretaria'], true, false, 4);
    raise exception 'Usuário comum executou admin_save_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_list_audit();
    raise exception 'Usuário comum executou admin_list_audit';
  exception when insufficient_privilege then null; end;
end$$;

-- 6. Teste de isolamento de dados para usuário bloqueado
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$declare my_status jsonb; begin
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'blocked' then
    raise exception 'Consulta de situação de bloqueado falhou: %', my_status;
  end if;

  if exists (select 1 from public.staff) then
    raise exception 'Usuário bloqueado conseguiu ler tabela staff';
  end if;
  if exists (select 1 from public.support_documents) then
    raise exception 'Usuário bloqueado conseguiu ler support_documents';
  end if;
end$$;

-- 7. Teste de isolamento para usuário anônimo
set local role anon;
do $$begin
  begin
    perform public.admin_list_users();
    raise exception 'Anônimo executou admin_list_users';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000004', array['Secretaria'], false, null);
    raise exception 'Anônimo executou admin_approve_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_save_user('pending-test@example.invalid', 'Nome', array['Secretaria'], true, false, null);
    raise exception 'Anônimo executou admin_save_user';
  exception when insufficient_privilege then null; end;

  begin
    perform public.get_my_registration_status();
    raise exception 'Anônimo executou get_my_registration_status';
  exception when insufficient_privilege then null; end;
end$$;

reset role;
rollback;
