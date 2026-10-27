# Escala dos voluntários civis

Em Escala mensal → Escala dos VCs, **Montar/editar semana** abre uma tabela de
setores (linhas) por dias (colunas). Escolha uma data e use **Carregar semana**.
Cada célula tem seu próprio responsável e cada dia tem suas próprias observações.
Os responsáveis não são repetidos automaticamente. No celular, botões de segunda
a domingo alternam o dia exibido, preservando os demais preenchimentos.

Dias existentes são carregados com suas versões e podem ser ajustados; dias novos
ficam sem designação até você escolher os responsáveis. Desmarque os dias que não
deseja salvar. Somente dias novos selecionados ou dias existentes alterados são
enviados ao banco. Uma semana pode atravessar meses e anos.
O botão **Cadastrar dia** permanece para ajustes pontuais e cópias de um único dia.

O salvamento usa `save_cleaning_week`, uma transação para até sete dias da mesma
semana. A RPC é SECURITY INVOKER e mantém RLS, autoria, versões, auditoria e as
validações de afastamento. Uma versão desatualizada, cadastro simultâneo ou
indisponibilidade de responsável impede o lote inteiro, sem gravar parte da semana.
Datas repetidas e semanas misturadas são rejeitadas. Não é um upsert incondicional.

**Adicionar setor/local** salva um local reutilizável e inclui seu campo de responsável
na edição atual. Exemplo: Banheiro do 2º andar. O local fica disponível nos próximos
cadastros mesmo se a edição do dia for cancelada. Nomes repetidos, ignorando espaços
nas extremidades e caixa, são impedidos. O limite é de 40 atividades por dia,
incluindo as seis originais, que permanecem obrigatórias na estrutura.

Locais adicionais são exibidos no painel do dia e na consulta mensal. O PDF mantém
a tabela das seis atividades originais e acrescenta uma seção Data / Setor ou local /
Responsável, com o mesmo cabeçalho institucional, sem comprimir indefinidamente a tabela.

Permissões mantidas: Secretaria, Diretoria e Subdiretoria (incluindo superadministradores
com os setores institucionais) cadastram locais e escalas. Usuários habilitados consultam.
A criação dos locais e alterações das escalas são registradas na auditoria.

Banco: `supabase/cleaning_week_and_locations.sql` e `supabase/cleaning_week_editor.sql`.
Validação: testes de limites de semana, locais dinâmicos e suíte SQL com rollback,
incluindo lote de sete dias, conflito, afastamento, autoria e negação a leitores.
