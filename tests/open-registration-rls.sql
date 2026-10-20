-- Teste de validação RLS, autorização, integridade de superadmin e transações do fluxo de cadastro com aprovação.
-- As fixtures passam pelos gatilhos reais da aplicação e são revertidas com rollback ao final.
begin;

-- 1. Fixtures criadas pelo papel administrativo da conexão
-- 1.1 Configuração do superadministrador inicial
insert into private.login_allowlist(email, display_name, role, sectors, enabled) values
  ('superadmin-test@example.invalid', 'Gestor Principal', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('preauthorized@example.invalid', 'Pre-Autorizado Allowlist', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true);

-- Inserção do superadmin via auth.users passando pelos gatilhos reais
insert into auth.users(id, email, aud, role, raw_user_meta_data) values (
  '40000000-0000-4000-8000-000000000001',
  'superadmin-test@example.invalid',
  'authenticated', 'authenticated',
  jsonb_build_object(
    'nome', 'Gestor Principal',
    'posto_graduacao', 'CEL',
    'matricula', 'MAT-001',
    'cpf', '52998224725',
    'data_nascimento', '1980-01-01'
  )
);

-- Como papel administrativo, habilita o primeiro superadministrador para permitir operações administrativas subsequentes
update public.app_members set
  enabled = true,
  role = 'administrator',
  sectors = array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
where user_id = '40000000-0000-4000-8000-000000000001';

update private.login_allowlist set
  enabled = true,
  role = 'administrator',
  sectors = array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas']
where email = 'superadmin-test@example.invalid';

update public.user_registrations set
  status = 'approved',
  approved_at = now()
where user_id = '40000000-0000-4000-8000-000000000001';

-- 1.2 Criação de novos usuários passando exclusivamente pelos gatilhos reais de cadastro
-- A. Candidato comum padrão
insert into auth.users(id, email, aud, role, raw_user_meta_data) values (
  '40000000-0000-4000-8000-000000000002',
  'pending-test@example.invalid',
  'authenticated', 'authenticated',
  jsonb_build_object(
    'nome', 'Candidato Teste',
    'posto_graduacao', 'SD',
    'matricula', 'MAT-002',
    'cpf', '11144477735',
    'data_nascimento', '1998-10-20'
  )
);

-- B. Cadastro com e-mail previamente autorizado na allowlist (deve nascer desabilitado e pendente)
insert into auth.users(id, email, aud, role, raw_user_meta_data) values (
  '40000000-0000-4000-8000-000000000003',
  'preauthorized@example.invalid',
  'authenticated', 'authenticated',
  jsonb_build_object(
    'nome', 'Tentativa Allowlist',
    'posto_graduacao', 'CAP',
    'matricula', 'MAT-003',
    'cpf', '22233344405',
    'data_nascimento', '1985-05-15'
  )
);

-- C. Cadastro com metadados maliciosos tentando forçar superadmin e aprovação direta
insert into auth.users(id, email, aud, role, raw_user_meta_data) values (
  '40000000-0000-4000-8000-000000000004',
  'malicious-meta@example.invalid',
  'authenticated', 'authenticated',
  jsonb_build_object(
    'nome', 'Invasor Metadados',
    'posto_graduacao', '1º TEN',
    'matricula', 'MAT-004',
    'cpf', '33344455508',
    'data_nascimento', '1990-03-12',
    'role', 'administrator',
    'sectors', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'],
    'status', 'approved',
    'enabled', true,
    'is_superadmin', true
  )
);

-- D. Conta legada pré-existente preservada sem inventar dados
insert into auth.users(id, email, aud, role, raw_user_meta_data) values (
  '40000000-0000-4000-8000-000000000005',
  'legacy-user@example.invalid',
  'authenticated', 'authenticated',
  jsonb_build_object(
    'nome', 'Membro Antigo',
    'posto_graduacao', 'VC',
    'matricula', 'MAT-LEGACY',
    'cpf', '44455566619',
    'data_nascimento', '1975-01-01'
  )
);
-- Como papel administrativo, simula estado de conta legada migrada (campos desconhecidos ausentes/nulos)
update public.user_registrations set
  posto_graduacao = null,
  matricula = null,
  cpf = null,
  data_nascimento = null,
  status = 'approved',
  approved_at = now()
where user_id = '40000000-0000-4000-8000-000000000005';

update public.app_members set
  display_name = 'Membro Antigo',
  role = 'editor',
  sectors = array['Vistoriador'],
  enabled = true
where user_id = '40000000-0000-4000-8000-000000000005';

-- 2. Operações da aplicação executadas estritamente com o papel authenticated
set local role authenticated;

-- 2.1 Teste do usuário com e-mail previamente autorizado antes da aprovação
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
declare
  my_status jsonb;
  my_regs_count integer;
begin
  -- Consulta própria retorna status pending_approval mesmo com e-mail na allowlist
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'pending_approval' then
    raise exception 'Usuário pre-autorizado não nasceu pendente: %', my_status;
  end if;

  -- Consulta direta de user_registrations retorna APENAS o próprio registro (sem vazar terceiros)
  select count(*) into my_regs_count from public.user_registrations;
  if my_regs_count <> 1 then
    raise exception 'Consulta direta de user_registrations retornou registros de terceiros: %', my_regs_count;
  end if;

  -- Acesso a funções administrativas negado
  begin
    perform public.admin_list_users();
    raise exception 'Usuário pendente conseguiu executar admin_list_users';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000003', array['Secretaria'], false, null);
    raise exception 'Usuário pendente conseguiu executar admin_approve_user';
  exception when insufficient_privilege then null; end;

  -- Rejeição de p_superadmin IS NULL e p_enabled IS NULL com 22023 antes das verificações administrativas
  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000002', array['Secretaria'], null, 1);
    raise exception 'admin_approve_user aceitou p_superadmin nulo';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', null, 1);
    raise exception 'admin_toggle_user aceitou p_enabled nulo';
  exception when invalid_parameter_value then null; end;

  -- Acesso direto a tabelas privadas negado ao papel authenticated
  begin
    execute 'select count(*) from private.login_allowlist';
    raise exception 'authenticated conseguiu ler private.login_allowlist diretamente';
  exception when insufficient_privilege then null; end;
end$$;

-- 2.2 Teste do usuário com metadados maliciosos
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$
declare
  my_status jsonb;
  my_regs_count integer;
begin
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'pending_approval' then
    raise exception 'Metadados maliciosos alteraram o status inicial: %', my_status;
  end if;

  select count(*) into my_regs_count from public.user_registrations;
  if my_regs_count <> 1 then
    raise exception 'Invasor obteve leitura de outros usuários via user_registrations: %', my_regs_count;
  end if;

  begin
    perform public.admin_list_users();
    raise exception 'Invasor obteve acesso administrativo via metadados injetados';
  exception when insufficient_privilege then null; end;
end$$;

-- 2.3 Operações autorizadas pelo Superadministrador
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  total_regs_count integer;
  users_data jsonb;
  pending_row jsonb;
  legacy_row jsonb;
  audit_data jsonb;
begin
  -- Consulta direta de user_registrations pelo superadministrador retorna todos os registros
  select count(*) into total_regs_count from public.user_registrations;
  if total_regs_count < 5 then
    raise exception 'Superadministrador não conseguiu listar todos os cadastros via user_registrations: %', total_regs_count;
  end if;

  -- Listagem completa via RPC administrativo
  select public.admin_list_users() into users_data;
  select value into pending_row from jsonb_array_elements(users_data) where value->>'email' = 'pending-test@example.invalid';
  if pending_row->>'status' <> 'pending_approval' or pending_row->>'posto_graduacao' <> 'SD' then
    raise exception 'Superadmin não localizou candidato pendente: %', pending_row;
  end if;

  -- Conta legada preservada sem dados inventados
  select value into legacy_row from jsonb_array_elements(users_data) where value->>'email' = 'legacy-user@example.invalid';
  if legacy_row->>'cpf' is not null or legacy_row->>'matricula' is not null or legacy_row->>'posto_graduacao' is not null then
    raise exception 'Conta legada possui dados fictícios indevidos: %', legacy_row;
  end if;

  -- Teste de rejeição de p_superadmin IS NULL e p_enabled IS NULL com erro 22023 antes das checagens administrativas
  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000002', array['Secretaria'], null, 1);
    raise exception 'admin_approve_user aceitou p_superadmin nulo sob superadmin';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', null, 1);
    raise exception 'admin_toggle_user aceitou p_enabled nulo sob superadmin';
  exception when invalid_parameter_value then null; end;

  -- Confirma que nenhum papel, setor, status ou permissão foi alterado no usuário pendente
  select value into pending_row from jsonb_array_elements(public.admin_list_users()) where value->>'email' = 'pending-test@example.invalid';
  if pending_row->>'status' <> 'pending_approval' or
     pending_row->>'role' <> 'reader' or
     pending_row->'sectors' <> '[]'::jsonb or
     (pending_row->>'enabled')::boolean <> false or
     (pending_row->>'version')::integer <> 1 then
    raise exception 'Parâmetros nulos alteraram o estado do usuário pendente: %', pending_row;
  end if;

  if exists (
    select 1 from public.user_registrations
    where user_id = '40000000-0000-4000-8000-000000000002'
      and (status <> 'pending_approval' or approved_at is not null or approved_by is not null or version <> 1)
  ) then
    raise exception 'user_registrations foi modificado indevidamente após chamadas com parâmetros nulos';
  end if;

  -- Teste de rejeição de p_enabled IS NULL em usuário já habilitado/aprovado
  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000005', null, 1);
    raise exception 'admin_toggle_user aceitou p_enabled nulo em conta legada';
  exception when invalid_parameter_value then null; end;

  -- Confirma que nenhum papel, setor, status ou permissão foi alterado no usuário legado
  select value into legacy_row from jsonb_array_elements(public.admin_list_users()) where value->>'email' = 'legacy-user@example.invalid';
  if legacy_row->>'status' <> 'approved' or
     legacy_row->>'role' <> 'editor' or
     legacy_row->'sectors' <> '["Vistoriador"]'::jsonb or
     (legacy_row->>'enabled')::boolean <> true or
     (legacy_row->>'version')::integer <> 1 then
    raise exception 'Parâmetro p_enabled nulo alterou permissões da conta legada: %', legacy_row;
  end if;

  -- Aprovação autorizada do candidato pendente com atribuição de setor
  perform public.admin_approve_user('40000000-0000-4000-8000-000000000002', array['Secretaria'], false, 1);

  -- Bloqueio e desbloqueio autorizado
  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', false, 2);
  perform public.admin_toggle_user('40000000-0000-4000-8000-000000000002', true, 3);

  -- Alteração cadastral autorizada via admin_save_user
  perform public.admin_save_user('pending-test@example.invalid', 'Candidato Aprovado', array['Secretaria','Vistoriador'], true, false, 4);

  -- Rejeição justificada da tentativa com metadados maliciosos
  perform public.admin_reject_user('40000000-0000-4000-8000-000000000004', 'Metadados inválidos', 1);

  -- Consulta de auditoria
  select public.admin_list_audit('pending-test@example.invalid') into audit_data;
  if jsonb_array_length(audit_data) < 3 then
    raise exception 'Auditoria incompleta para candidato aprovado: %', audit_data;
  end if;

  -- Proteções contra autobloqueio, autorrejeição e autorrebaixamento
  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000001', false, 1);
    raise exception 'Superadministrador conseguiu se autobloquear';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000001', 'Rejeição própria', 1);
    raise exception 'Superadministrador conseguiu se autorrejeitar';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000001', array['Secretaria'], false, 1);
    raise exception 'Superadministrador conseguiu se autorrebaixar';
  exception when invalid_parameter_value then null; end;

  -- Acesso direto a tabelas privadas negado mesmo para superadministrador enquanto no papel authenticated
  begin
    execute 'select count(*) from private.login_allowlist';
    raise exception 'Superadmin authenticated conseguiu ler private.login_allowlist diretamente';
  exception when insufficient_privilege then null; end;
end$$;

-- 2.4 Teste do candidato recém-aprovado
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare
  my_status jsonb;
  my_regs_count integer;
begin
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'approved' then
    raise exception 'Situação do usuário recém-aprovado divergente: %', my_status;
  end if;

  select count(*) into my_regs_count from public.user_registrations;
  if my_regs_count <> 1 then
    raise exception 'Usuário aprovado obteve registros de outros usuários em consulta direta: %', my_regs_count;
  end if;

  -- Como editor em Secretaria, não possui acesso administrativo
  begin
    perform public.admin_list_users();
    raise exception 'Usuário aprovado como editor acessou admin_list_users';
  exception when insufficient_privilege then null; end;
end$$;

-- 2.5 Teste de isolamento para usuário anônimo
set local role anon;
do $$begin
  begin
    execute 'select * from public.user_registrations';
    raise exception 'Anônimo conseguiu ler public.user_registrations';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_list_users();
    raise exception 'Anônimo conseguiu executar admin_list_users';
  exception when insufficient_privilege then null; end;

  begin
    perform public.get_my_registration_status();
    raise exception 'Anônimo conseguiu executar get_my_registration_status';
  exception when insufficient_privilege then null; end;
end$$;

-- 3. Verificação de sincronização das tabelas privadas após reset role (sem conceder acesso direto a elas)
reset role;

do $$
declare
  allowlist_row private.login_allowlist%rowtype;
  member_row public.app_members%rowtype;
  reg_row public.user_registrations%rowtype;
  audit_count integer;
begin
  -- 3.1 Verificação do cadastro com e-mail previamente na allowlist
  select * into allowlist_row from private.login_allowlist where email = 'preauthorized@example.invalid';
  if allowlist_row.enabled then
    raise exception 'Allowlist prévia não foi desabilitada no cadastro de preauthorized@example.invalid';
  end if;

  select * into member_row from public.app_members where user_id = '40000000-0000-4000-8000-000000000003';
  if member_row.enabled or member_row.role <> 'reader' or member_row.sectors <> '{}' then
    raise exception 'Membro preauthorized não nasceu desabilitado sem setores: %', member_row;
  end if;

  select * into reg_row from public.user_registrations where user_id = '40000000-0000-4000-8000-000000000003';
  if reg_row.status <> 'pending_approval' then
    raise exception 'Registro preauthorized não está pending_approval: %', reg_row;
  end if;

  -- 3.2 Verificação do usuário aprovado e sincronizado
  select * into allowlist_row from private.login_allowlist where email = 'pending-test@example.invalid';
  if not allowlist_row.enabled or allowlist_row.display_name <> 'Candidato Aprovado' or allowlist_row.sectors <> array['Secretaria','Vistoriador'] then
    raise exception 'Sincronização da allowlist falhou para usuário aprovado: %', allowlist_row;
  end if;

  select * into member_row from public.app_members where user_id = '40000000-0000-4000-8000-000000000002';
  if not member_row.enabled or member_row.display_name <> 'Candidato Aprovado' or member_row.role <> 'editor' or member_row.sectors <> array['Secretaria','Vistoriador'] then
    raise exception 'Sincronização de app_members falhou para usuário aprovado: %', member_row;
  end if;

  select * into reg_row from public.user_registrations where user_id = '40000000-0000-4000-8000-000000000002';
  if reg_row.status <> 'approved' or reg_row.nome <> 'Candidato Aprovado' then
    raise exception 'Sincronização de user_registrations falhou para usuário aprovado: %', reg_row;
  end if;

  -- 3.3 Verificação da rejeição do usuário com metadados maliciosos
  select * into reg_row from public.user_registrations where user_id = '40000000-0000-4000-8000-000000000004';
  if reg_row.status <> 'rejected' or reg_row.rejection_reason <> 'Metadados inválidos' then
    raise exception 'Rejeição de metadados maliciosos falhou: %', reg_row;
  end if;

  -- 3.4 Verificação de registros de auditoria
  select count(*) into audit_count from private.user_access_audit;
  if audit_count < 5 then
    raise exception 'Quantidade insuficiente de eventos de auditoria registrados: %', audit_count;
  end if;
end$$;

rollback;
