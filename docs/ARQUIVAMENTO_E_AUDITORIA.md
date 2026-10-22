# Arquivamento, histórico das escalas e auditoria

## Arquivar e restaurar

Comunicados e Modelos padronizados têm filtros Ativos/Arquivados. Arquivar exige motivo e confirmação; preserva conteúdo, anexos e recibos. Restaurar devolve o conteúdo à consulta ativa. Secretaria gerencia comunicados; Diretoria/Subdiretoria gerenciam também modelos. Os usuários de consulta não acessam registros arquivados via tabela/API. O armazenamento privado dos anexos mantém suas permissões existentes: arquivar é organização do acervo, não revogação de arquivos já acessados.

Os pop-ups e a central de notificações excluem publicações arquivadas para todos. Restaurar não cria publicação duplicada nem apaga recibos anteriores. Cada alteração é protegida por versão concorrente, e autor/data do arquivamento são definidos no servidor, inclusive numa chamada direta à API.

## Histórico das escalas

Em Escala mensal → Histórico das escalas, Secretaria/Diretoria/Subdiretoria consultam mudanças do plantão, previsão mensal, contatos de escala e faxina dos VCs. O histórico do plantão guarda os nomes das três funções no momento de cada evento, permitindo identificar substituições mesmo após mudanças de cadastro. Alterações e exclusões preservam o estado anterior.

## Auditoria geral

Auditoria do sistema é exclusiva do superadministrador, com filtros de módulo, usuário, ação e período, paginação e comparação Antes/Depois. Os eventos são anexados em `private.audit_events`, sem escrita direta concedida ao cliente e com bloqueio de UPDATE/DELETE. Nem o superadministrador da aplicação tem controles para adulterar ou apagar eventos. Administradores técnicos com privilégios de proprietário do banco continuam sendo uma fronteira de confiança; não se trata de uma garantia contra o proprietário do PostgreSQL.

### Fontes

- **Banco:** gatilhos AFTER INSERT/UPDATE/DELETE registram alterações efetivamente concluídas nas tabelas de negócio públicas presentes na implantação, exceto tabelas derivadas de auditoria/publicações (`authorization_events`, `notice_publications`). Incluem usuários/permissões, efetivo/afastamentos, escalas, SATs, portarias, documentos, diárias/saldos/anexos e recibos de comunicados. Também há gatilhos em `private.login_allowlist` e `private.user_access_audit`. A identidade vem de `auth.uid()`, não de `updated_by` enviado pelo usuário. Operações técnicas sem sessão são identificadas como Sistema/banco. CPF/nascimento são protegidos nos snapshots gerais; credenciais e tokens não são campos auditados.
- **Portal:** acesso à sessão validada, saída solicitada, navegação entre páginas e solicitações de download/exportação. A identidade é obtida da sessão no servidor. A tela distingue estes eventos dos confirmados pelo banco; não provam leitura ou conclusão do download e podem faltar quando o navegador ou a conexão falha. O evento de sessão é deduplicado pelo `session_id` assinado no JWT. Não há captura de senha, digitação, tela ou mensagens de WhatsApp. O botão WhatsApp apenas abre um link.

Uma transação que falha é revertida com seus eventos. Tentativas recusadas e falhas de autenticação não são gravadas por este diário de alterações; exigem consulta aos logs técnicos do Supabase. Alterações feitas fora do portal, diretamente nas planilhas/SISGAT, não são capturadas. A integração pública dos estabelecimentos informa solicitações de exportação apenas quando utilizada dentro do portal.

Os eventos novos começam na implantação. Históricos antigos de usuários e processos continuam nas respectivas telas, sem inventar autores para registros anteriores. Tabelas novas criadas futuramente precisam receber o gatilho de captura. A consulta de cobertura técnica pode conferir `pg_trigger` com o nome `capture_audit_event`.

## Instalação e testes

O arquivo `supabase/archive_and_audit.sql` é a fonte consolidada. No remoto, a implantação foi separada em três migrations atômicas: `archive_document_lifecycle`, `audit_database_capture` e `audit_query_portal_activity`, correspondentes aos três blocos do arquivo. A migration `audit_action_labels` acrescenta os rótulos das ações administrativas e aproveita a identidade já verificada do histórico privado nas finalizações executadas pelo serviço de exclusão de contas; a fonte consolidada já contém esse ajuste.

`tests/archive-audit-rls.sql` executa fixtures com rollback e verifica arquivamento/restauração, permissões por tipo, histórico de substituições por nome, acesso restrito à auditoria, bloqueio de adulteração/exclusão, recibos de notificações e identidade dos eventos informados pelo portal. A suíte PostgreSQL/PGlite carrega a migration completa.
