# Migração Supabase pendente de destino

Não foi encontrado um projeto DGSCI entre os projetos conectados. Os projetos EFM e WR não são destinos desta importação. É necessário informar o projeto DGSCI existente ou escolher a organização em que será criado um novo projeto. Custos, se houver, serão apresentados antes da criação.

As cópias do pecúlio e do controle de diárias são servidas somente pela revisão privada. Os arquivos reais ficam fora do GitHub, em `public/private-data/` no checkout privado de Sites; a branch pública contém apenas código para consulta. O pecúlio original não deve ser incluído no repositório.

`.env.local` está ignorado, assim como `.env` e outras variantes. `.env.example` contém apenas nomes e campos vazios. A chave publicável do Supabase é configuração pública do cliente e será visível no bundle quando configurada; ela não concede acesso sem políticas adequadas. Senha de banco e `service_role` deverão ficar exclusivamente no ambiente de servidor, sem prefixo `VITE_`.

Antes da importação no banco: autenticação real, vínculo do usuário aos setores, RLS habilitada, permissões restritas, controle especial dos dados cadastrais do efetivo e teste de negação para usuário anônimo. A seleção de setor da prévia não autoriza consultas ao banco. Nenhum mock será importado como registro oficial.

O controle de diárias foi extraído uma única vez de uma cópia XLSX da planilha fornecida. As duas linhas de saldo foram mantidas separadas e sem agregação. Não existe conexão automática dessa tela à planilha.
