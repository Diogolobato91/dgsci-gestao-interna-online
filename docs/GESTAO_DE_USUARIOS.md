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

## Senhas e Minha conta

Minha conta permite consultar a identificação e o contato, sem editar dados cadastrais. A alteração de senha exige senha atual, nova senha (8 a 128 caracteres) e confirmação. A Edge Function `account-password` autentica o solicitante, autoriza a operação pelo banco, verifica a senha atual com um cliente Auth isolado e altera apenas a senha. Nenhuma credencial é armazenada em logs, metadados do usuário ou armazenamento local pelo formulário.

Na Gestão de Usuários, somente o superadministrador pode resetar contas já vinculadas ao Auth. O botão exige confirmação do e-mail, confere a versão cadastral e define `12345678` exclusivamente no servidor. Não altera aprovação, bloqueio, setores ou papéis. O usuário deve trocar a senha padrão em Minha conta. Para a própria conta do administrador, utiliza-se o formulário de alteração com senha atual, em vez do reset administrativo.

Solicitação e resultado são registrados na auditoria, sem valores de senha. O cliente não pode registrar uma conclusão: `finish_password_action` é exclusivo de `service_role`. Tentativas são limitadas a cinco solicitações por usuário em cinco minutos. A antiga RPC de edição do próprio contato foi revogada para usuários autenticados; o contato pode ser corrigido pelo gestor em Editar usuário.

Implantação: `supabase/password_management.sql` e função `supabase/functions/account-password` com verificação JWT habilitada. Segredos administrativos permanecem no ambiente da Edge Function. Os testes SQL usam transação e rollback; os testes do handler substituem o Auth por adaptadores, sem alterar senhas de usuários reais.
