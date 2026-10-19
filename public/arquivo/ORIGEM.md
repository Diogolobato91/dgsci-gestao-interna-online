# Arquivo DGSCI incorporado

Origem: https://github.com/Diogolobato91/arquivo-dgsci
Commit de origem: 57e038aacc989cdbf02b683ebeafee08093c613e

Módulo local reaproveitado para a primeira integração, mantendo Google Sheets como fonte e Mapbox como motor do mapa. O componente React incorpora esta versão local, sem depender da interface hospedada no Netlify.

Adaptações: caminhos relativos das coordenadas; navegação coordenada com o React; tema claro/laranja; mensagens de atualização; preservação da última consulta completa quando alguma aba falhar; sanitização das saídas HTML com DOMPurify; aviso quando WebGL não estiver disponível. As classificações existentes são mantidas e deverão ser revisadas com o setor antes de orientar decisões administrativas.

Não inclui integração com SISGAT, edição dos cadastros, banco compartilhado ou autorização real por setor. A seleção do setor é uma demonstração visual. O acesso à prévia é restringido pela hospedagem privada.
