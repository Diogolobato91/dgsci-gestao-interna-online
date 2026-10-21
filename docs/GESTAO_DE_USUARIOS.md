# Gestão de Usuários e Cadastro Aberto com Aprovação

Módulo exclusivo do superadministrador (função `administrator` e todos os seis setores institucionais: Diretoria, Subdiretoria, Secretaria, Vistoriador, Análise e Multas).

## Novo Fluxo de Cadastro e Aprovação

1. **Solicitação Aberta de Cadastro**:
   - O interessado acessa a tela de acesso e seleciona **Solicitar cadastro**.
   - Informa:
     - Nome completo (entre 2 e 160 caracteres);
     - Posto/graduação em seleção (`CEL`, `TCEL`, `MAJ`, `CAP`, `1º TEN`, `2º TEN`, `SUB TEN RR`, `SUB TEN`, `1º SGT`, `2º SGT`, `3º SGT`, `CB`, `SD`, `VC`);
     - Matrícula funcional;
     - CPF (com máscara e validação algorítmica módulo 11);
     - Data de nascimento (validada, no passado, idade mínima de 16 anos);
     - E-mail institucional ou pessoal;
     - Senha e confirmação de senha (mínimo de 8 caracteres).
   - Validações de duplicidade no backend para e-mail, CPF e matrícula, com mensagens seguras que não expõem dados de terceiros.
   - Senhas são gerenciadas exclusivamente pelo Supabase Auth.
   - Mensagem após o envio:
     > “Cadastro recebido. Aguarde a aprovação do administrador para acessar o sistema.”

2. **Situação do Usuário Pendente / Rejeitado / Bloqueado**:
   - Usuário com cadastro pendente não possui nenhum setor nem permissão ativa (`app_members.enabled = false`).
   - Sessão autenticada do Supabase Auth **NÃO** libera dados por si só: RLS em todas as tabelas (`staff`, `authorizations`, `sat_commands`, `sat_regions`, `support_documents`) e no Storage (`dgsci-support`) exige `m.enabled = true`.
   - Na interface, o usuário pendente visualiza unicamente o cartão de situação cadastral e o botão de **Sair**.
   - Em caso de rejeição, visualiza a justificativa informada pelo administrador.

3. **Gestão pelo Superadministrador (`/gestao-usuarios`)**:
   - **Contadores e Filtros**: contadores em tempo real para *Aguardando aprovação*, *Usuários ativos*, *Acessos bloqueados* e *Cadastros rejeitados*.
   - **Consulta de Dados**: modal de detalhes cadastrais exibindo nome, posto/graduação, matrícula, CPF formatado, nascimento, data da solicitação e e-mail.
   - **Aprovação**: atribuição obrigatória de um ou mais setores (`Diretoria`, `Subdiretoria`, `Secretaria`, `Vistoriador`, `Análise`, `Multas`), com opção de superadministrador.
   - **Rejeição**: justificativa textual obrigatória gravada na auditoria e visível ao usuário.
   - **Bloqueio e Desbloqueio**: controle imediato de acesso preservando proteção contra autobloqueio e perda do último superadministrador ativo.
   - **Histórico de Auditoria**: rastreamento completo de eventos (`register`, `approve`, `reject`, `block`, `unblock`, `update`) com autor, data/hora e observações.

## Proteção de Dados Pessoais

- CPF, matrícula e data de nascimento são restritos ao próprio usuário autenticado e aos superadministradores.
- Não são expostos em endpoints públicos, funções de listagem geral ou relatórios abertos.
- Nenhuma chave privilegiada (`service_role` ou senhas de banco) é exposta no frontend, variáveis `VITE_*` ou repositório.

## Configuração do Supabase Auth

O novo fluxo dispensa a exigência de confirmação manual de e-mail pelo usuário.
A migration SQL aplica a confirmação automática no momento do cadastro via trigger seguro. No painel administrativo do Supabase (Dashboard):
1. Acesse **Authentication** → **Providers** → **Email**.
2. Desmarque a opção **Confirm email** caso ainda esteja ativa.
3. As contas existentes preservam seus acessos e senhas sem alterações em massa.

## Arquivos e Migrations

- `supabase/open_registration_and_approval.sql`: migration versionada com tabela `public.user_registrations`, triggers de cadastro e funções de aprovação/rejeição/auditoria.
- `tests/open-registration-rls.sql`: suíte SQL com transações isoladas e rollback automático testando RLS, aprovação, rejeição, bloqueio e negação de acesso a pendentes.
- `src/lib/rankHierarchy.ts`: centralização da hierarquia e normalização de postos e graduações.
- `src/lib/userValidation.ts`: validações de CPF, máscaras, datas e regras de cadastro.
- `tests/rank-hierarchy.test.mjs`: testes unitários da ordenação do efetivo e tolerância a grafias.
- `tests/user-validation.test.mjs`: testes unitários de máscaras, CPF e formulário.
- `tests/user-management.test.mjs`: testes de renderização de segurança e bloqueio de senhas.
