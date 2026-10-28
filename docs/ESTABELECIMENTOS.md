# Estabelecimentos no banco da DGSCI

A rota Estabelecimentos usa `get_establishments_snapshot` no Supabase, com uma
consulta consistente para indicadores, mapa e lista. Não faz 58 consultas ao Google
nem usa o cache persistente da planilha. O botão Atualizar cadastros consulta o banco.
O snapshot JSON único evita que a limitação de linhas da API corte a base em 1.000.
Os filtros e a paginação visível continuam operando sobre a base completa recebida.

A interface do arquivo foi preservada, com uma ponte entre o React autenticado e
o iframe local. A ponte confere origem e janela nas duas direções. Nenhuma chave de
serviço ou token é enviado ao iframe. A versão independente do arquivo conserva seu
comportamento anterior; no portal, `database=1` desliga Sheets, upload local e autosync.
Os dados recebidos ficam somente na memória da página; o cache legado é descartado.
A busca de CNPJ aceita pontuação ou apenas dígitos.

## Importação inicial

A base foi copiada das 58 abas de ocupação do Controle de Processos da DGSCI.
Abas de relatórios, totais e vistorias não são cadastros de estabelecimentos e não
participam da importação. Linhas vazias pré-numeradas não geram registros.
Não foi aplicada unicidade por CNPJ: um mesmo documento pode estar em mais de uma
pasta, endereço ou divisão. Cada linha tem chave de origem por aba e número de linha.

O cabeçalho é identificado pela presença das colunas reais; anotações no título
não são cabeçalhos. Área, pavimentos, carga, situação e observações são localizados
pelo nome, respeitando posições diferentes nas abas. Valores desconhecidos não são
inventados. A classificação nos indicadores mantém a interpretação do arquivo,
sem certificar validade atual de licença nem consultar SISGAT.

`private.establishment_sources` preserva cabeçalhos e células da origem, com hash do
arquivo capturado, sem leitura para clientes. `public.establishment_import` guarda
quantidades por aba e data de importação. Os cadastros e o arquivo fonte não devem
ser incluídos no repositório. Alterações posteriores na planilha não substituem os
dados editados no banco: não existe sincronização automática nem escrita de volta.

## Operação

- Todos os usuários habilitados com setor autorizado podem consultar.
- Secretaria, Diretoria, Subdiretoria e superadministradores com setores institucionais
  podem cadastrar e editar, com RLS no banco.
- Cadastrar estabelecimento abre o formulário no portal. Na ficha completa de um
  estabelecimento, Editar estabelecimento carrega os dados atuais.
- Campos vazios podem ser complementados posteriormente. Divisão e razão social são
  necessárias. A classificação do indicador é explícita, separada da situação textual.
- Versão e filtro no UPDATE impedem a edição da interface de sobrescrever silenciosamente
  uma alteração concorrente. O erro preserva o preenchimento para conferência.
- Autor, data/hora e versão são preenchidos pelo servidor. Ações ficam na auditoria.
  Não há exclusão definitiva de cadastros pela interface.

Banco: `supabase/establishments.sql`. Testes: migração e RLS com rollback,
ponte de dados sem Google/cache, leitura de colunas variáveis e preparação do editor.
