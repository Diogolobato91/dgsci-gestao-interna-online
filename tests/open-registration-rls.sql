-- Teste de validação RLS e transações do fluxo de cadastro com aprovação.
-- Todas as fixtures são revertidas com rollback ao final.
begin;

-- 1. Fixtures isoladas
insert into auth.users(id, email, aud, role) values
  ('40000000-0000-4000-8000-000000000001', 'superadmin-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000002', 'regular-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000003', 'pending-test@example.invalid', 'authenticated', 'authenticated'),
  ('40000000-0000-4000-8000-000000000004', 'blocked-test@example.invalid', 'authenticated', 'authenticated');

insert into public.app_members(user_id, display_name, role, sectors, enabled) values
  ('40000000-0000-4000-8000-000000000001', 'Gestor Teste', 'administrator', array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'], true),
  ('40000000-0000-4000-8000-000000000002', 'Comum Teste', 'editor', array['Secretaria'], true),
  ('40000000-0000-4000-8000-000000000003', 'Pendente Teste', 'reader', array[]::text[], false),
  ('40000000-0000-4000-8000-000000000004', 'Bloqueado Teste', 'editor', array['Secretaria'], false);

insert into public.user_registrations(user_id, email, nome, posto_graduacao, matricula, cpf, data_nascimento, status) values
  ('40000000-0000-4000-8000-000000000001', 'superadmin-test@example.invalid', 'Gestor Teste', 'CEL', 'MAT-001', '52998224725', '1980-01-01', 'approved'),
  ('40000000-0000-4000-8000-000000000002', 'regular-test@example.invalid', 'Comum Teste', 'CAP', 'MAT-002', '11144477735', '1985-05-15', 'approved'),
  ('40000000-0000-4000-8000-000000000003', 'pending-test@example.invalid', 'Pendente Teste', 'SD', 'MAT-003', '90467142074', '1998-10-20', 'pending_approval'),
  ('40000000-0000-4000-8000-000000000004', 'blocked-test@example.invalid', 'Bloqueado Teste', 'CB', 'MAT-004', '71425178041', '1990-03-12', 'blocked');

-- 2. Teste como usuário comum autenticado (não pode gerenciar nem ver cadastros de terceiros)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$begin
  begin
    perform public.admin_list_users();
    raise exception 'Usuário comum acessou a lista de usuários';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000003', array['Secretaria'], false, 1);
    raise exception 'Usuário comum aprovou cadastro';
  exception when insufficient_privilege then null; end;

  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000003', 'Motivo', 1);
    raise exception 'Usuário comum rejeitou cadastro';
  exception when insufficient_privilege then null; end;
end$$;

-- 3. Teste como usuário pendente (não tem acesso a dados internos nem a outros cadastros)
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$declare my_status jsonb; begin
  -- Pode consultar sua própria situação
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'pending_approval' or my_status->>'nome' <> 'Pendente Teste' then
    raise exception 'Consulta de situação do pendente falhou: %', my_status;
  end if;
  -- Não expõe CPF nem nascimento na função de consulta de situação
  if my_status ? 'cpf' or my_status ? 'data_nascimento' then
    raise exception 'Dados sensíveis expostos na consulta de situação';
  end if;

  -- Negação estrita de acesso a tabelas internas protegidas por RLS
  if exists (select 1 from public.staff) then
    raise exception 'Usuário pendente conseguiu ler tabela staff';
  end if;
  if exists (select 1 from public.authorizations) then
    raise exception 'Usuário pendente conseguiu ler tabela authorizations';
  end if;
  if exists (select 1 from public.support_documents) then
    raise exception 'Usuário pendente conseguiu ler documentos de apoio';
  end if;
  if exists (select 1 from public.sat_regions) then
    raise exception 'Usuário pendente conseguiu ler sat_regions';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'dgsci-support') then
    raise exception 'Usuário pendente conseguiu ler bucket de arquivos';
  end if;
end$$;

-- 4. Teste como usuário bloqueado (não tem acesso a dados internos)
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$declare my_status jsonb; begin
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'blocked' then
    raise exception 'Consulta de situação do bloqueado falhou: %', my_status;
  end if;

  if exists (select 1 from public.staff) then
    raise exception 'Usuário bloqueado conseguiu ler tabela staff';
  end if;
  if exists (select 1 from public.support_documents) then
    raise exception 'Usuário bloqueado conseguiu ler documentos de apoio';
  end if;
end$$;

-- 5. Teste como Superadministrador
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$declare
  users_data jsonb;
  pending_row jsonb;
  audit_data jsonb;
begin
  -- Pode consultar a lista completa
  select public.admin_list_users() into users_data;
  select value into pending_row from jsonb_array_elements(users_data) where value->>'email' = 'pending-test@example.invalid';
  if pending_row->>'status' <> 'pending_approval' or pending_row->>'posto_graduacao' <> 'SD' then
    raise exception 'Superadmin não localizou usuário pendente';
  end if;

  -- Aprovação exige setores
  begin
    perform public.admin_approve_user('40000000-0000-4000-8000-000000000003', array[]::text[], false, 1);
    raise exception 'Aprovação sem setores foi aceita';
  exception when invalid_parameter_value then null; end;

  -- Rejeição exige justificativa
  begin
    perform public.admin_reject_user('40000000-0000-4000-8000-000000000003', '', 1);
    raise exception 'Rejeição sem motivo foi aceita';
  exception when invalid_parameter_value then null; end;

  -- Rejeição válida
  perform public.admin_reject_user('40000000-0000-4000-8000-000000000003', 'Matrícula não localizada no efetivo', 1);

  -- Aprovação com setor
  perform public.admin_approve_user('40000000-0000-4000-8000-000000000003', array['Vistoriador'], false, 2);

  -- Proteção contra autobloqueio de superadministrador
  begin
    perform public.admin_toggle_user('40000000-0000-4000-8000-000000000001', false, 1);
    raise exception 'Superadministrador conseguiu se autobloquear';
  exception when invalid_parameter_value then null; end;

  -- Histórico de auditoria
  select public.admin_list_audit('pending-test@example.invalid') into audit_data;
  if jsonb_array_length(audit_data) < 2 then
    raise exception 'Auditoria não registrou aprovação e rejeição';
  end if;
end$$;

-- 6. Teste do usuário recém-aprovado (agora habilitado no setor Vistoriador)
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$declare my_status jsonb; begin
  select public.get_my_registration_status() into my_status;
  if my_status->>'status' <> 'approved' then
    raise exception 'Usuário aprovado não reflete status approved';
  end if;

  -- Pode ler dados gerais liberados para contas habilitadas
  if not exists(select 1 from public.app_members m where m.user_id = '40000000-0000-4000-8000-000000000003' and m.enabled) then
    raise exception 'Membro não foi habilitado após aprovação';
  end if;
end$$;

-- 7. Teste como Anônimo
set local role anon;
do $$begin
  begin
    perform public.admin_list_users();
    raise exception 'Anônimo acessou lista de usuários';
  exception when insufficient_privilege then null; end;

  begin
    perform public.get_my_registration_status();
    raise exception 'Anônimo executou status';
  exception when insufficient_privilege then null; end;
end$$;

reset role;
rollback;
