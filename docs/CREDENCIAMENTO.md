# Credenciamento

## Perfis e permissões

O setor Credenciamento foi adicionado aos seis setores existentes. O superadministrador atribui o novo setor pela Gestão de Usuários, tanto na aprovação quanto na edição. O critério institucional anterior de identificação do superadmin é preservado; criar o novo setor não desabilita administradores existentes nem concede a ele gestão de usuários.

Todos os usuários aprovados consultam a relação. Somente contas habilitadas com o setor Credenciamento ou superadministradores podem cadastrar e alterar. Não existe exclusão direta pelo cliente. As políticas do banco repetem as regras da interface, inclusive em chamadas diretas à API. Modelos, SATs, financeiro e os demais controles mantêm suas permissões.

## Relações e indicadores

Empresas e profissionais possuem navegação própria. Os seis campos de negócio são modalidade, empresa/profissional, contato, região, protocolo e validade. A consulta começa nos credenciamentos vigentes; a validade inclui o próprio dia e usa a data institucional de Belém. Busca, modalidade e validade filtram a tabela e o gráfico juntos. Os indicadores contam registros de credenciamento por modalidade, não pessoas ou empresas distintas entre modalidades.

A tabela usa paginação de 20 registros, e a consulta ao banco busca todas as páginas da API antes de calcular os indicadores. O resumo identifica a última atualização da relação e cada registro mostra seu autor, dia e hora. O servidor define esses campos com a sessão autenticada. Não confia em nomes ou datas enviados pelo formulário. Edições concorrentes usam versão e devem atualizar a consulta antes de sobrescrever dados.

## Origem e importação

Foram utilizadas somente as duas relações solicitadas da planilha compartilhada. A aba adicional não foi importada. CNPJ/CPF foi excluído do conjunto de dados persistido: apenas os seis campos autorizados foram copiados. O conteúdo institucional não integra o repositório Git.

A cópia remove apenas repetições idênticas dos seis campos com o mesmo tipo. Dados divergentes sob um mesmo nome/modalidade/protocolo são preservados e sinalizados para conferência, sem escolher arbitrariamente contato, região ou data de validade. O índice de duplicidade inclui os seis campos. A comparação entre o arquivo normalizado e o banco usa a assinatura de todos os campos de todas as linhas, além dos totais por relação.

A informação do cabeçalho da planilha (responsável e data) permanece em `accreditation_imports`. Como a fonte não fornece hora, a interface informa essa ausência. A autoria técnica da cópia é “Importação institucional”, com o horário real da gravação; não é atribuída falsamente ao responsável da origem. Alterações futuras no portal mostram a conta responsável. Não há sincronização automática que substitua as edições locais.

## Estrutura e auditoria

`supabase/accreditation.sql` cria registros, RLS, autoria e auditoria, e amplia a lista de setores aceitos pelas RPCs existentes. `supabase/accreditation_source_import.sql` ajusta a identidade de duplicidade e cria os metadados da origem. INSERT/UPDATE/DELETE alimentam a auditoria geral existente. Não são gravados eventos de navegação.

A matriz SQL testa aprovação/edição com o novo setor, consulta dos demais, negação de escrita aos seis setores anteriores, superadmin, bloqueado e anônimo, autoria forjada, concorrência e duplicidade. Testes de interface conferem colunas, identificação da última atualização e visibilidade dos botões. A validação de dados considera validade inclusiva, separação de relações, agrupamento por modalidade e sinalização das divergências.
