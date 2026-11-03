# Controle de Autorizações | Diárias

## Operação

Cadastre processos SAT / UBM ou DGSCI com protocolo, unidade, referência, destino, efetivo, início e fim do serviço, situação, despesas, arrecadação e observações. Não há campo de competência no formulário. As datas são obrigatórias para novos processos e para completar os históricos no editor. A unidade identifica o processo, mas não é exigida para definir o saldo geral.

Somente Subdiretoria e superadministrador com acesso completo alteram. Diretoria e Secretaria consultam e baixam documentos. As regras de RLS continuam protegendo processos, saldos, auditoria e arquivos.

Situações: Aguardando, Autorizado, Pago e Cancelado. Descrições e períodos textuais da origem continuam preservados; a situação operacional não realiza pagamentos externos.

## Consulta e saldo geral

1. Escolha data inicial e final no painel. O intervalo pode atravessar meses e anos e inclui os dois limites.
2. Use **Definir saldo inicial**. As datas da consulta já vêm preenchidas; informe o valor compartilhado entre SAT / UBM e DGSCI.
3. O saldo corresponde a **saldo inicial + arrecadações − despesas**, excluindo cancelados.
4. Cada processo entra integralmente pela data de início do serviço. Um serviço iniciado em 31/12 e encerrado em 03/01 entra na consulta que inclui 31/12; não é rateado ou contado novamente por terminar em janeiro.

O saldo geral considera todas as unidades e as duas origens, independentemente de busca, unidade, situação e aba da listagem. Indicadores e gráficos seguem os filtros da consulta. Períodos com saldo podem ser recuperados no seletor; o mesmo intervalo pode ser editado com controle de versão. Intervalos diferentes representam consultas independentes, não transferências de saldo nem fechamento contábil automático.

Registros antigos sem datas estruturadas continuam visíveis quando não há filtro de data. **Revisar processos sem datas completas** facilita localizá-los. Não inferimos datas de textos ambíguos. Se houver processos ativos sem data de início, o saldo final permanece pendente, pois não é possível determinar a qual intervalo pertencem. Valores financeiros ausentes nos processos do intervalo também impedem confirmar o saldo. Campo vazio não equivale a zero.

A série mensal agrupa automaticamente pelos últimos 12 meses de início dos serviços encontrados na consulta; não exige cadastro de mês separado.

Sem filtro de datas, o cartão de saldo mostra o último período geral cadastrado e seu saldo inicial, sem limitar a lista de processos. Pendências de cálculo não escondem o saldo inicial salvo. O botão Editar saldo inicial recupera as datas e o valor desse período.

## Preservação e banco

`supabase/authorization_date_ranges.sql` adiciona `data_inicio` e `data_fim` às autorizações e aos saldos. Saldos mensais anteriores conservam seu intervalo do primeiro ao último dia do mês. Protocolos e valores históricos não são apagados. `competencia` continua apenas como compatibilidade interna derivada do início para novos dados estruturados; não orienta os filtros atuais.

Validações no banco rejeitam intervalos incompletos, invertidos ou fora dos limites, valores negativos/não finitos e alterações indevidas dos dados de origem. A autorização de importações documentais permanece restrita ao proprietário, preservando a origem. RLS e privilégios não são ampliados. Datas e valores alterados continuam auditados; versões protegem edições simultâneas.

Saldos antigos da fonte, quando existentes, são referências separadas e não são recalculados automaticamente.

## Documentos e validação

Após salvar, use **Consultar** para anexar PDF, Word, Excel, PNG ou JPEG (até 20 MB). O bucket é privado; o download usa a sessão autenticada. Histórico registra autor, horário e alterações, sem registrar simples navegação.

Testes PostgreSQL/PGlite e transação com rollback no Supabase verificam cadastro por datas, passagem de ano, intervalos inválidos, duplicidade de saldo, snapshot, auditoria e restrições por setor. Testes de cálculo cobrem limites inclusivos, cancelados, dados ausentes e preservação de centavos. TypeScript e build de produção também foram verificados. A validação interativa na Netlify não está incluída nesses testes.
