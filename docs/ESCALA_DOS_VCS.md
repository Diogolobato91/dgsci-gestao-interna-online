# Escala dos voluntários civis

O painel exibe **Conservação e limpeza**, abaixo dos comunicados e do plantão, somente com os responsáveis da data de Belém. Atualiza a cada minuto e ao retornar à janela.

Em **Escala mensal → Escala dos VCs** (`/escala-mensal?aba=vc`), todos os usuários habilitados podem consultar os dias cadastrados e baixar PDF. Secretaria, Diretoria e Subdiretoria podem cadastrar, editar e copiar um dia para outra data. A cópia nunca sobrescreve automaticamente um dia existente. Atualizações usam versão para impedir perda de alterações concorrentes.

As seis atividades são LAV. CORREDOR, ESC. FUNDOS, corredor da frente, corredor dos fundos, retirada do lixo e sala do coronel. As abreviações da fonte permanecem sem interpretação adicional. Uma pessoa pode receber mais de uma atividade no dia. Campos sem responsável mostram **A definir**.

A seleção usa apenas os VCs cadastrados no efetivo. O banco valida a graduação, substitui o nome recebido pelo nome cadastrado e recusa designações com afastamento ativo na data. Nomes abreviados importados são mantidos como nomes de origem, sem vínculo automático com o efetivo, até conferência pela Administração. Os responsáveis são retratos do nome no momento da edição; mudanças posteriores no efetivo não reescrevem escalas históricas.

A escala não se repete automaticamente. Dias sem registro mostram **Escala de hoje ainda não cadastrada**. Nenhuma regra de segunda a sexta cria designações futuras. A importação inicial foi limitada às datas presentes no documento fornecido; dados reais não fazem parte do código público.

## Banco

Aplicar `supabase/cleaning_roster.sql` via migration. `public.cleaning_roster` tem RLS e grants explícitos: leitura de membros habilitados com setor, escrita somente dos três setores gestores; sem exclusão via cliente. A RPC de seleção de VCs retorna apenas identificador e nome para os gestores, sem ampliar a leitura do efetivo.

A suíte `tests/cleaning-roster-rls.sql` roda em transação com rollback e cobre permissões, graduação, afastamento, atividades duplicadas, nome canônico, versão e autoria. Está incluída no teste PostgreSQL/PGlite.
