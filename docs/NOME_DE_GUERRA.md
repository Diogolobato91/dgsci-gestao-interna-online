# Nome de guerra e identificação no plantão

O cadastro público solicita o nome de guerra dos militares, separadamente do nome completo. Para VC o campo é opcional. A interface exige 2 a 80 caracteres, e o banco valida o conteúdo informado e armazena em maiúsculas. Cadastros legados/clientes anteriores sem o campo continuam compatíveis: não são inventados nomes nem bloqueadas contas por falta desse dado. A aprovação permanece obrigatória.

O superadministrador consulta e corrige o campo em Gestão de Usuários → Editar. A correção é transacional, verifica versão e deixa auditoria, sem conceder permissões a quem ainda está pendente. A Administração também pode preencher o nome de guerra na edição do efetivo.

A escala busca o nome aprovado por vínculo exato de CPF e matrícula entre usuário e efetivo. Não vincula pessoas por nome. Um nome explicitamente corrigido no efetivo tem prioridade; em seguida é usado o nome do cadastro aprovado. Contas pendentes ou bloqueadas não fornecem os dados resolvidos para a escala. Identidades antigas sem o campo usam o nome completo, preservando os IDs e designações existentes.

Ao montar ou editar o plantão, cada função tem busca por nome completo ou nome de guerra, sem diferenciar maiúsculas e acentos. O seletor mantém o militar já escolhido e identifica homônimos pelo nome completo. Escolher exige selecionar o cadastro; digitar não cria nomes soltos. Regras de três militares distintos, exclusão de VC e afastamentos continuam validadas no banco.

Plantão da escala, painel principal e PDF usam posto/graduação e nome de guerra quando disponível. A previsão mensal da Administração é independente e continua com seus nomes e registros próprios.

`supabase/military_war_names.sql` adiciona os campos e atualiza consultas e operações existentes. As tabelas mantêm RLS. As funções privilegiadas permanecem no schema privado, com `search_path` vazio e autorização explícita; os wrappers públicos executam como invocador. Nenhum CPF ou matrícula adicional é exposto na consulta do plantão.

Testes cobrem coleta sem aprovação automática, resolução inclusive sem telefone cadastral, correção pelo superadministrador, isolamento por perfil, exibição no painel, busca e identificação de legados. Fixtures são revertidas por rollback.
