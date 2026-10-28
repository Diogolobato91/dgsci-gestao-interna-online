# Arquivo DGSCI incorporado

Origem: https://github.com/Diogolobato91/arquivo-dgsci
Commit de origem: 57e038aacc989cdbf02b683ebeafee08093c613e

Interface local reaproveitada para indicadores, consulta e mapa. O motor do mapa
continua sendo Mapbox, com rolagem cooperativa no portal. Saídas HTML são sanitizadas
com DOMPurify e existe orientação para navegadores sem WebGL.

No portal, a rota React autenticada consulta o Supabase e entrega os dados em memória
ao iframe local, conferindo origem e janela nas mensagens. `embedded=1&database=1`
desliga consultas Google Sheets, cache legado e sincronização automática. Cadastro
e edição são feitos no React e protegidos por RLS, autoria e versão no banco.
A interface independente mantém o comportamento legado com Google Sheets.

As classificações dos indicadores refletem o arquivo e precisam de conferência do
setor para decisões administrativas. Não há consulta direta nem integração com SISGAT.
Detalhes de migração e operação em `docs/ESTABELECIMENTOS.md` na raiz do projeto.
