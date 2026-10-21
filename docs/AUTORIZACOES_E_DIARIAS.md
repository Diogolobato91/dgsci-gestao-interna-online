# Controle de Autorizações | Diárias

## Operação

O controle permite cadastrar e editar processos SAT / UBM e DGSCI, com protocolo, unidade, referência, destino, efetivo, período de serviço, competência mensal, situação, despesas, arrecadações e observações.

As alterações ficam restritas à **Subdiretoria** e ao superadministrador com acesso completo. Diretoria e Secretaria consultam os registros e baixam documentos. Os demais setores, contas pendentes, bloqueadas e anônimos não acessam os dados financeiros.

As situações operacionais são **Aguardando**, **Autorizado**, **Pago** e **Cancelado**. As descrições originais da planilha permanecem preservadas e consultáveis. A situação operacional controla o painel e não representa uma execução de pagamento fora do sistema.

Processos novos exigem competência e unidade. Os processos importados sem competência continuam identificados como **Competência não informada**, sem atribuição automática de mês. A data da autorização e o período textual da origem também são preservados.

## Painel e saldo

Busca, competência, unidade e situação filtram os indicadores e gráficos. As despesas/arrecadações excluem processos cancelados. Valores desconhecidos permanecem distintos de zero. A série mensal considera as últimas 12 competências informadas nos filtros, sem inventar períodos para os registros antigos.

Para calcular o saldo de uma competência/unidade:

1. Selecione a competência e a unidade.
2. Use **Definir saldo inicial** e informe o valor de referência.
3. O controle calcula **saldo inicial + arrecadações − despesas** dos protocolos correspondentes, excluindo cancelados.

Se houver valores financeiros ausentes nos processos correspondentes, o saldo calculado fica pendente de preenchimento. Informe zero quando não houver despesa ou arrecadação, em vez de deixar um valor desconhecido. O cálculo do saldo usa todos os protocolos da competência/unidade; a busca e o filtro de situação não recortam esse saldo.

Os dois saldos legados permanecem separados na área **Saldos de referência**, com os valores e a identificação da origem. Não são somados nem transferidos automaticamente para competências/unidades sem confirmação do seu significado.

## Documentos e histórico

Após salvar o processo, use **Consultar** para anexar PDF, Word, Excel, PNG ou JPEG, com limite de 20 MB por arquivo. O bucket `dgsci-authorizations` é privado. O download usa a sessão autenticada e não gera links públicos permanentes. Os arquivos e metadados vinculados são preservados; a interface não oferece exclusão definitiva.

O histórico informa autor, data/hora e campos alterados, além dos anexos adicionados. A consulta mostra as últimas 100 ocorrências; as anteriores permanecem no banco. Processos importados começam a receber histórico nas próximas alterações. Datas de criação desconhecidas dos registros antigos permanecem nulas.

## Banco e validação

Migration criada pela CLI oficial: `supabase/migrations/20261021204342_authorization_workflow.sql`, aplicada como `authorization_workflow` ao projeto DGSCI.

Todas as novas tabelas têm RLS e privilégios explícitos. Validações do banco restringem valores negativos/não finitos, dados de origem, situações e vínculos de arquivos. Controle de versão protege edições simultâneas de processos e saldos iniciais. A auditoria é gerada por gatilhos e não pode ser apagada pelo cliente.

Testes executados em PostgreSQL/PGlite e no Supabase remoto com rollback: cadastro, edição, conflito de versões, saldo por competência/unidade, auditoria, vínculo e acesso aos documentos, bloqueio de alterações por leitores, isolamento de contas pendentes/bloqueadas e acesso anônimo. Os testes de Storage usam somente metadados transitórios e não enviam arquivos fictícios. A proteção do Supabase contra exclusão SQL direta é respeitada; operações reais de arquivos usam a Storage API.

A conferência da migração comparou os dados originais dos 87 processos e encontrou zero alterações nos campos anteriores, incluindo valores e datas de atualização. Competências, saldos iniciais e documentos reais novos continuam para preenchimento pela Subdiretoria. Não foram criados lançamentos fictícios no ambiente principal.

Também foram verificados cálculos e arredondamento em centavos, exclusão de cancelados, saldo ausente/incompleto, renderização da tela por perfil, TypeScript e build. A conferência interativa dos formulários e de uploads/downloads no endereço publicado da Netlify permanece necessária.
