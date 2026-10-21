# Consultas, documentos e escala mensal

## Alterações
- SATs: CAT primeiro, depois unidades numeradas (GBM/GPA) em ordem natural. Mantidos os nomes da base: a unidade 1 está cadastrada como 1ºGPA, sem transformação presumida em 1ºGBM. Coluna Situação removida. PDF A4 com cabeçalhos repetidos, quebras de linha, rodapés e paginação; respeita a busca atual.
- Modelos: seis PDFs originais enviados pelo usuário, armazenados no bucket privado dgsci-support e conferidos por SHA-256 após download. Aba Notificação e Autos. Quatro modelos demonstrativos removidos do banco e seus arquivos públicos excluídos do repositório. Os arquivos anexados não foram alterados, achatados ou convertidos.
- Editor contextual: nome, descrição e anexos, sem seletor de tipo, área, checklist ou demonstração. Tipo definido pela área e imutável no banco. Documentos de modelos exigem anexo.
- Diretoria/Subdiretoria alteram modelos; usuários habilitados consultam/baixam. Secretaria mantém comunicados. Regras aplicadas em RLS e uploads do Storage; modelo não pode ser convertido em comunicado para contornar autorização.
- Ajuda ao vistoriador removida da navegação e biblioteca, rota antiga redireciona para modelos. Guias antigos permanecem no banco, sem exposição pela política de leitura.
- Estabelecimentos: altura do iframe informada pelo conteúdo, uma rolagem vertical, remoção da moldura duplicada, zoom da roda desativado no mapa embutido, modais posicionados na área visível. Pendências de endereço apresentadas em tabela legível, sem presumir bairros ou completar dados não existentes na planilha. Correções factuais continuam na origem.
- Escala: calendário mensal real, navegação por mês/ano, seleção do dia, agenda lateral, serviços por integrante do efetivo e turno. Secretaria/Diretoria/Subdiretoria cadastram, editam e retiram serviços no Supabase. Sem nomes, datas ou telefones fictícios; começa vazia. Duplicidade de pessoa/dia/turno bloqueada e versão protege alterações concorrentes.
- Relação do efetivo e escala agrupadas em Administração.

## Validação
TypeScript, 30 testes automatizados e build. Testes transacionais no Supabase com rollback: Secretaria não insere/edita modelos, mantém comunicados, Diretoria insere modelos, pendentes não consultam biblioteca/escala, edição concorrente da escala é protegida. Nenhuma fixture persistida.

PDF gerado com as 27 unidades atuais e as duas páginas renderizadas e inspecionadas. A abrangência ainda corresponde aos registros herdados em validação; a coluna de situação não é exibida. PDF inclui nota de validação institucional.

Validação visual interativa do portal não concluída: o navegador remoto não alcançou o servidor local, retornando 404. Não foi afirmada validação mobile ou de rolagem em navegador real. O código aplica pontos de quebra para celular.

## Backend
Migration library_models_and_monthly_roster aplicada ao projeto DGSCI. Importação feita pelas APIs autenticadas existentes, sem criar endpoint público de importação e sem chave privilegiada no cliente. Sessão temporária encerrada após o envio.
