# Revisão de cadastros, acesso, celular e indicadores

## Cadastros

SATs validam campos vazios e tamanho dos textos no formulário e no banco. A trigger `validate_sat_region_quality` rejeita inclusões/renomeações que repitam a mesma unidade + SAT, ignorando caixa e espaços repetidos. Uma trava transacional por identificação protege inclusões concorrentes. Não elimina nem renomeia registros anteriores. Alterações dos municípios continuam permitidas em cadastros legados.

Autorizações consultam protocolos existentes antes da inclusão ou mudança do protocolo e exigem confirmação quando há repetição. É um alerta de interface, não unicidade: um protocolo pode conter lançamentos legítimos em períodos diferentes. Identificação, origem, competência, situação e valores financeiros editados exigem conferência explícita; mudar novamente os campos invalida a confirmação. Versões concorrentes continuam protegendo a gravação no banco.

Modelos e comunicados informam erros de duplicidade/permissão sem expor detalhes técnicos; comunicados novos/editados exigem texto e o formulário limita a dez anexos. Modelos continuam exigindo documento no formulário. Essas regras de preenchimento não alteram permissões de publicação.

## Permissões

A matriz transacional `tests/permissions-matrix-rls.sql` usa o papel `authenticated` e os seis setores: Diretoria, Subdiretoria, Secretaria, Vistoriador, Análise e Multas. Verifica consulta compartilhada, edição de SATs/comando/modelos/comunicados, leitura de efetivo e financeiro, escrita financeira, portarias, auditoria das escalas, auditoria geral e gestão de usuários. Também verifica superadmin, bloqueado com JWT ainda existente, pendente e anônimo. Todos os testes terminam em rollback.

Permissões mantidas: modelos e SATs são geridos por Diretoria/Subdiretoria; comunicados e escalas incluem Secretaria; financeiro é consultado pelos três setores administrativos, com edição na Subdiretoria; portarias são restritas à Subdiretoria; gestão de usuários e auditoria geral são exclusivas do superadmin. Os testes anteriores de arquivos, contatos, aprovação e validação de efetivo continuam na suíte.

Advisors do Supabase: dois informes de RLS sem políticas nas tabelas privadas `login_allowlist` e `user_access_audit` são intencionais (nenhum acesso direto do cliente, somente funções controladas). Permanece o aviso de proteção contra senhas vazadas desativada no Auth; não foi alterada a configuração de autenticação nem o plano do projeto. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Celular

Tabelas de efetivo, SATs e diárias recebem região focável para teclado e orientação de rolagem horizontal em telas estreitas. Filtros e ações quebram linha, campos usam fonte legível sem zoom automático, botões têm alvo mínimo de 44 px e rodapés de formulários respeitam a área segura do aparelho. A previsão mensal deixa de ter um painel com rolagem vertical própria no celular; a página rola verticalmente e a matriz mantém a rolagem horizontal.

Conferência visual autenticada em celular não foi concluída neste ambiente: o navegador remoto não alcançou o servidor local e o site publicado exigiu login. Validação disponível: TypeScript, build, renderização automática das páginas e revisão das regras responsivas. Não equivale a teste em aparelho real.

## Indicadores

Os totais e as situações usam a situação operacional, excluindo cancelados dos valores. Despesa/arrecadação ausentes em processos ativos deixam o respectivo cartão como subtotal informado, com contagem e aviso; vazio não é zero. Uma seção expansível permite conferir os valores dos gráficos por origem e competência em tabelas. O saldo calculado continua exigindo saldo inicial e valores completos por unidade/competência, separado das referências herdadas.

Despesas e arrecadação do snapshot usado pelo painel foram conciliadas com as somas diretas do banco remoto, sem alterar valores reais. Os testes verificam centavos, exclusão de cancelados, ausência versus zero, filtros de saldo e partição dos indicadores de estabelecimentos. O arquivo de estabelecimentos continua sendo consulta às planilhas, sem integração ao SISGAT.
