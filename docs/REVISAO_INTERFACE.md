# Revisão da interface operacional

Um padrão compartilhado de cabeçalho, ações, busca, painéis de dados, estados vazios e paginação foi aplicado às consultas de efetivo, comando SAT, SATs regionais, portarias e diárias. A biblioteca e a consulta de estabelecimentos seguem o mesmo cabeçalho.

Ação principal no topo à direita; busca e filtros no painel; ações de cada registro na última coluna. As listas exibem 15 registros por página. Filtros reiniciam a paginação. Textos extensos de portarias e campos complementares de diárias estão disponíveis na consulta de detalhes, sem perder os dados de origem.

Editores têm grupos de campos, cabeçalho estável e rodapé de salvar/cancelar. Comandante e subcomandante permanecem distintos por títulos e cores. A biblioteca diferencia consulta de edição, agrupa seções editáveis e permite retirar arquivos selecionados antes de salvar. Modais, tabelas e navegação têm ajustes para telas pequenas.

Identidade: vermelho institucional, branco, grafite e superfícies cinza claras. Nenhuma mudança de permissão ou esquema do banco nesta revisão.

Validação: TypeScript, testes existentes e renderização inicial das telas. Sem navegador de QA disponível nesta sessão. Os quatro prints anexados não estavam nos caminhos locais fornecidos, portanto a revisão não afirma comparação visual com eles.
