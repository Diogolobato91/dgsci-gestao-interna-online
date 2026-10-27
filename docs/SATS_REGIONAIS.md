# SATs Regionais

A consulta inclui CRB, RISP, unidade, SAT e municípios/bairros atendidos. Todos os usuários habilitados consultam e baixam a relação; Diretoria/Subdiretoria cadastram e editam, incluindo as novas classificações. A ordenação coloca DGSCI (ou CAT em registros legados) antes dos GBMs em ordem numérica. A busca consulta também CRB e RISP.

A migration `supabase/sat_regions_crb_risp.sql` acrescenta os campos, limitados a 40 caracteres, sem modificar as políticas de acesso existentes. A tabela privada de backups guarda a situação anterior às substituições institucionais e não pode ser consultada pelo portal. O conteúdo de documentos institucionais é copiado somente ao banco; não integra o código-fonte.

A atualização de referência foi conferida contra as linhas preenchidas do documento enviado: não são criadas unidades para lacunas da numeração nem inventadas regiões onde a fonte está em branco. Quebras de linha são unificadas, e separadores vazios repetidos são removidos. Dados desconhecidos continuam vazios no banco e aparecem identificados na consulta.

A exportação utiliza o cabeçalho institucional e formato A4 retrato, com CRB, RISP, unidade, SAT e atendimento. Tenta uma diagramação compacta de 8, 7,5 e 7 pontos, sem truncar células. O conjunto de referência com 34 unidades foi gerado e inspecionado em uma página. Caso a relação cresça além desse espaço, o gerador volta a um relatório paginado de 8 pontos; não corta conteúdo nem diminui indefinidamente a fonte.

Validações: comparação dos campos com o banco remoto, inspeção visual do PDF real, testes de ordenação e de exportação compacta/paginada, matriz RLS dos seis setores e superadministrador, TypeScript e build. A cópia de segurança e o histórico do banco preservam a situação anterior.
