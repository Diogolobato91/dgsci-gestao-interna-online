# Central de notificações, Minha conta e PDF do plantão

## Central de notificações

O sininho está no topo do portal para todos os usuários habilitados. O contador indica publicações sem recibo do usuário atual. A central contém filtros Todos/Novos, prévias de títulos/textos longos e paginação de 20 avisos. Abrir um comunicado marca o recebimento e disponibiliza o conteúdo completo e seus anexos. Avisos dispensados no pop-up continuam acessíveis em Todos, identificados como Recebido. O histórico é de publicações institucionais geradas desde a instalação dos avisos, sem criar publicações retroativas dos comunicados antigos.

O pop-up anterior permanece ativo e respeita janelas de edição/consulta já abertas; também adia a abertura enquanto o foco está em um campo de formulário. A consulta é atualizada a cada 30 segundos com a página visível e ao retornar à janela. Não há envio de mensagens ou notificações fora do portal.

`get_my_notices` usa SECURITY INVOKER e as políticas RLS existentes. Cada usuário acessa somente seus recibos. Dados de outros usuários e relatórios administrativos de leitura não são expostos.

## Minha conta

Disponível em `/minha-conta`, no menu e no ícone de usuário do topo. Exibe nome, e-mail, posto/graduação, matrícula, CPF, nascimento e setores do próprio cadastro. Somente o telefone é editável. Os demais campos continuam sob gestão do superadministrador.

As RPCs `get_my_account` e `update_my_contact` não recebem identificador de outra conta. As funções privadas verificam sessão, membro habilitado com setor e cadastro aprovado. A atualização valida o telefone, exige versão vigente e registra auditoria privada. O contato da escala é sincronizado somente quando CPF e matrícula coincidem com o efetivo; nomes não geram associações. Remover o telefone limpa também o contato desse vínculo na escala. Não altera graduação, identificação, situação, papel, setores, e-mail de autenticação ou senha.

## PDF do plantão

Em Escala mensal → Plantão → Baixar PDF, os setores que já consultam a escala completa escolhem dia, semana ou mês. A semana começa na segunda e termina no domingo, incluindo datas de outros meses/anos quando necessário. O documento A4 paisagem apresenta data, três funções, nomes, contatos e observações. Ausências geram alerta genérico de revisão, sem expor motivos pessoais. Vínculos não confirmados com o efetivo também recebem aviso de conferência. Dias sem cadastro são identificados, sem copiar a equipe de outro dia.

Os dados são consultados novamente ao exportar, sob as permissões existentes, para incluir alterações recentes e a semana completa. O arquivo é gerado no navegador e não é publicado em armazenamento público.

## Instalação e validação

Aplicar `supabase/account_and_notification_center.sql`. Testes em `tests/account-notification-center-rls.sql` cobrem isolamento, pendentes/bloqueados/anônimos, paginação, recibos, contato próprio e sincronização por vínculo verificado. O arquivo participa da suíte PostgreSQL/PGlite. `tests/roster-export.test.mjs` confere dias, meses bissextos e semanas atravessando o ano.
