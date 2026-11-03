# Controle de Autorizações | Diárias

## Operação

Cadastre processos SAT / UBM ou DGSCI com protocolo, unidade, referência, destino, efetivo, início e fim do serviço, situação, despesas, arrecadação e observações. Não há campo de competência no formulário. As datas são obrigatórias para novos processos e para completar os históricos no editor. A unidade identifica o processo, mas não é exigida para definir o saldo geral.

Somente Subdiretoria e superadministrador com acesso completo alteram. Diretoria e Secretaria consultam e baixam documentos. As regras de RLS continuam protegendo processos, saldos, auditoria e arquivos.

Situações: Aguardando, Autorizado, Pago e Cancelado. Descrições e períodos textuais da origem continuam preservados; a situação operacional não realiza pagamentos externos.

## Consulta e saldo anual

O saldo é único por exercício e compartilhado entre SAT / UBM e DGSCI. Selecione o ano no cartão de saldo e cadastre o saldo inicial anual. O formulário grava o intervalo canônico de 1º de janeiro a 31 de dezembro; editar o mesmo ano atualiza o cadastro existente com controle de versão. Não há campo de unidade nem datas nesse formulário.

O saldo disponível anual é **saldo inicial + arrecadações − despesas** do exercício, excluindo cancelados. Cada processo é contado integralmente pelo início do serviço; não há rateio automático. O valor inicial salvo fica visível mesmo enquanto o cálculo final estiver pendente.

Os filtros de datas, unidade, situação, busca e a aba da listagem afetam apenas a consulta e seus gráficos. Não substituem o ano do cartão, não exigem outro saldo inicial e não recortam o saldo anual. A série mensal agrupa automaticamente pelo mês de início do serviço.

Registros antigos sem datas estruturadas continuam visíveis quando não há filtro de data. **Revisar processos sem datas completas** facilita localizá-los. Não inferimos datas de textos ambíguos. Processos ativos sem início impedem confirmar o saldo disponível, pois ainda não é possível determinar o exercício correspondente. Valores financeiros ausentes nos processos do ano também impedem confirmar o saldo. Campo vazio não equivale a zero.

## Preservação e banco

`supabase/authorization_date_ranges.sql` adiciona `data_inicio` e `data_fim` às autorizações e aos saldos. Saldos mensais anteriores conservam seu intervalo do primeiro ao último dia do mês. Protocolos e valores históricos não são apagados. `competencia` continua apenas como compatibilidade interna derivada do início para novos dados estruturados; não orienta os filtros atuais.

Validações no banco rejeitam intervalos incompletos, invertidos ou fora dos limites, valores negativos/não finitos e alterações indevidas dos dados de origem. A autorização de importações documentais permanece restrita ao proprietário, preservando a origem. RLS e privilégios não são ampliados. Datas e valores alterados continuam auditados; versões protegem edições simultâneas.

Saldos antigos da fonte, quando existentes, são referências separadas e não são recalculados automaticamente.

## Documentos e validação

Após salvar, use **Consultar** para anexar PDF, Word, Excel, PNG ou JPEG (até 20 MB). O bucket é privado; o download usa a sessão autenticada. Histórico registra autor, horário e alterações, sem registrar simples navegação.

Testes PostgreSQL/PGlite e transação com rollback no Supabase verificam cadastro por datas, passagem de ano, intervalos inválidos, duplicidade de saldo, snapshot, auditoria e restrições por setor. Testes de cálculo cobrem limites inclusivos, cancelados, dados ausentes e preservação de centavos. TypeScript e build de produção também foram verificados. A validação interativa na Netlify não está incluída nesses testes.
