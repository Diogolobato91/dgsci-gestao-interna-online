# Escala dos voluntários civis

Em Escala mensal → Escala dos VCs, **Cadastrar dia ou semana** abre o formulário.
Escolha uma data. Para preencher a semana de segunda a domingo que contém essa data,
marque **Semana inteira** e selecione os dias desejados, incluindo fins de semana.
Os responsáveis e observações informados são repetidos nos dias selecionados;
cada dia pode ser editado posteriormente. Não há repetição automática futura.
Uma semana pode atravessar competências; os registros aparecem no mês correspondente.

O salvamento é um único INSERT em lote. Uma data existente ou um afastamento em
qualquer data impede o lote inteiro, sem substituir escalas já cadastradas.
As regras de disponibilidade, autoria, versão e auditoria continuam no banco.

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

Banco: `supabase/cleaning_week_and_locations.sql`.
Validação: testes de limites de semana, locais dinâmicos e suíte SQL com rollback,
incluindo lote de sete dias, conflito, afastamento, autoria e negação a leitores.
