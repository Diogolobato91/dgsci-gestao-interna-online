# Primeira integração DGSCI

Esta branch reúne a interface do portal de apoio, as rotas do sistema interno e uma cópia local adaptada do Arquivo DGSCI. O ponto de entrada é `/dashboard`; `/estabelecimentos` e `/mapa` acessam o mesmo módulo incorporado.

## Escopo entregue

- Biblioteca React com os 12 exemplos do portal, busca, filtros por tipo/área, ordenação, favoritos, checklists, conteúdos relacionados e quatro downloads DOCX.
- Identidade laranja, preto e branco, navegação por setor e layout responsivo.
- Consulta das planilhas, filtros, indicadores, fichas, exportações e Mapbox reaproveitados do Arquivo, com caminhos locais para os arquivos geográficos.
- Ponte de navegação React–Arquivo com validação de origem e janela emissora, sanitização de HTML com DOMPurify e tratamento da ausência de WebGL.
- Cache preservado quando alguma aba falha. A data exibida é a da última consulta completa. A consulta continua dependendo da disponibilidade e das permissões atuais das planilhas.
- Rotinas legadas identificadas como demonstração; módulos que antes apontavam ao painel genérico agora indicam sua implementação pendente.
- Redirecionamento SPA para acesso direto a rotas na futura hospedagem Netlify.

## Acesso e dados

A escolha de setor é uma simulação da navegação, não uma autenticação ou autorização. A publicação de revisão deve permanecer privada, restrita ao proprietário. A hospedagem privada controla o acesso a esta revisão; o código do frontend não protege registros na origem. Os repositórios de origem e a consulta das planilhas têm as condições de acesso que já possuíam.

Nenhuma credencial ou consulta ao SISGAT foi adicionada. Não há gravação nas planilhas. Favoritos e checklists usam o armazenamento deste navegador. As telas administrativas do projeto anterior continuam locais e sem persistência compartilhada.

## Próxima etapa

1. Definir operações e permissões com cada setor.
2. Implementar contas pessoais, vínculos a um ou mais setores e regras de acesso no banco.
3. Cadastrar modelos/comunicados oficiais e disponibilizar os arquivos privados.
4. Preparar a importação revisada dos estabelecimentos, com identificador permanente do banco e vínculo à origem. Os identificadores por linha do Arquivo não devem ser utilizados como chave permanente de processos, multas ou documentos.
5. Separar situação de licença, autos/multas e pendência de vistoria; revisar as classificações legadas com os responsáveis. Não inferir sanções de texto livre da planilha.

## Validação

`npm test` verifica busca, filtros, modelos/relacionamentos, indisponibilidade do armazenamento, cache/sincronização, mensagens entre módulos e fallback sem WebGL. `npm run typecheck` confere TypeScript; `npm run build` gera a distribuição. A validação visual autenticada e o GPS em um aparelho físico continuam necessários; os testes de integração simulam as respostas de rede e não certificam os dados institucionais.

O código de revisão fica em uma branch própria. A publicação privada em Sites usa uma cópia da mesma implementação e não configura automaticamente o deploy do GitHub para Netlify. A branch principal e o site público existente permanecem na versão anterior até revisão e integração das alterações.

`netlify.toml` interrompe os builds de branch/deploy-preview para que a revisão desta integração aconteça apenas no endereço privado. A configuração de produção só terá efeito se a alteração for revisada e incorporada à branch principal.

## Atualização de 19/10/2026

A logo foi substituída pela fornecida pelo usuário. A relação do efetivo agora consulta uma cópia privada do pecúlio de outubro, com 71 pessoas. O Controle de Autorizações | Diárias usa uma cópia única de 80 registros SAT, 7 DGSCI e 2 linhas distintas de saldo. Esses dados não estão incluídos na branch pública. As telas novas mostram erros de disponibilidade em vez de dados simulados.

O projeto DGSCI no Supabase armazena o efetivo e o controle de diárias, com autenticação real, confirmação de e-mail e políticas por setor. `.env.local` e os dados reais não são versionados no GitHub. Não há sincronização automática das diárias. Consulte SUPABASE_PREPARACAO.md para primeiro acesso e configuração.
