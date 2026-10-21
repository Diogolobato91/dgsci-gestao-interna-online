import type { SupportContent } from './catalog';
export const TYPE_LABELS = { model: 'Modelo padronizado', guide: 'Ajuda rápida', notice: 'Comunicado' };
export const CONTENT: SupportContent[] = [
  {
    id: 'relatorio-vistoria', type: 'model', area: 'Vistoria', date: '2026-10-08', format: 'DOCX', version: 'Exemplo v1.0',
    title: 'Relatório de vistoria', description: 'Estrutura editável para organizar a identificação, os registros e as observações da vistoria.',
    tags: ['relatório', 'inspeção', 'registro', 'documento'], featured: true,
    sections: [
      { title: 'Quando consultar', text: 'Exemplo de organização de um relatório. A estrutura e os campos devem ser adaptados e aprovados pelo departamento antes de qualquer uso institucional.' },
      { title: 'Campos do modelo', items: ['Identificação do processo e da edificação', 'Data e responsável pelo registro', 'Documentos consultados e versão das referências', 'Observações e evidências', 'Pendências para conferência', 'Encaminhamento e revisão'] },
      { title: 'Antes de preencher', text: 'Confirme o modelo oficial, os campos exigidos e o fluxo de revisão aplicável. O arquivo para download está identificado como demonstração em todas as páginas.' }
    ], related: ['preparacao-vistoria', 'registro-fotografico']
  },
  {
    id: 'preparacao-vistoria', type: 'guide', area: 'Vistoria', date: '2026-10-08', format: 'CHECKLIST',
    title: 'Antes de iniciar a vistoria', description: 'Checklist ilustrativo para organizar a consulta ao processo e o registro das informações.',
    tags: ['checklist', 'preparação', 'vistoria', 'documentação'], featured: true,
    sections: [{ title: 'Uma consulta organizada', text: 'Este checklist demonstra a interação do portal. Não define requisitos, prazos ou critérios de aprovação de uma vistoria.' }],
    checklist: ['Localizar o processo e conferir sua identificação', 'Separar os documentos disponíveis para consulta', 'Identificar a versão das referências oficiais aplicáveis', 'Preparar o modelo oficial de registro', 'Anotar dúvidas para confirmação com a área responsável'], related: ['relatorio-vistoria', 'conferencia-documentos']
  },
  {
    id: 'biblioteca-organizada', type: 'notice', area: 'Geral', date: '2026-10-08', format: 'LEITURA',
    title: 'Uma nova organização para os modelos', description: 'Exemplo de comunicado sobre a centralização dos modelos e o acesso pela busca do portal.',
    tags: ['comunicado', 'modelos', 'biblioteca', 'atualização'],
    sections: [{ title: 'Comunicado de exemplo', text: 'Nesta demonstração, os modelos foram reunidos em uma biblioteca com filtros por tipo de conteúdo e área. Use a busca para localizar um assunto e abra um item para consultar sua descrição.' }, { title: 'O que você pode testar', items: ['Pesquisar por relatório ou documento', 'Filtrar a biblioteca por Modelos', 'Abrir e baixar um arquivo demonstrativo', 'Salvar um conteúdo nos favoritos deste navegador'] }, { title: 'Publicação oficial pendente', text: 'Este texto não comunica uma mudança real no departamento. A inclusão de modelos e comunicados oficiais depende do envio e da revisão dos conteúdos pelo DGSCI.' }], related: ['relatorio-vistoria']
  },
  {
    id: 'registro-fotografico', type: 'guide', area: 'Vistoria', date: '2026-10-07', format: 'ORIENTAÇÃO',
    title: 'Organização do registro fotográfico', description: 'Exemplo de roteiro para associar imagens, locais e observações ao registro da vistoria.',
    tags: ['fotos', 'evidências', 'relatório', 'imagens'],
    sections: [{ title: 'Organizar antes de anexar', text: 'Exemplo de organização: agrupar os registros por local e manter uma descrição que permita relacionar cada imagem à observação correspondente.' }, { title: 'Roteiro de conferência ilustrativo', items: ['Identificação do ambiente ou ponto registrado', 'Descrição objetiva da observação', 'Referência ao item do relatório correspondente', 'Revisão das informações antes de qualquer compartilhamento'] }, { title: 'Referência oficial', text: 'O procedimento de captura, armazenamento e envio de imagens deverá ser substituído pela orientação institucional vigente.' }], related: ['relatorio-vistoria', 'registro-pendencias']
  },
  {
    id: 'auto-infracao', type: 'model', area: 'Administrativo', date: '2026-10-06', format: 'DOCX', version: 'Exemplo v1.0',
    title: 'Estrutura de auto de infração', description: 'Esqueleto demonstrativo de documento, com campos em branco e sem fundamentação legal.',
    tags: ['auto', 'infração', 'multas', 'documento'],
    sections: [{ title: 'Modelo de estrutura', text: 'Este arquivo serve apenas para demonstrar a consulta e o download de modelos no portal. Não é um auto de infração válido e não deve ser utilizado para autuação.' }, { title: 'Campos de exemplo', items: ['Identificação e número do documento', 'Dados do processo', 'Descrição dos fatos — a preencher', 'Fundamentação — a inserir pela área competente', 'Encaminhamento — a validar', 'Revisão e assinaturas — a definir'] }, { title: 'Revisão necessária', text: 'A redação, o enquadramento, a competência e os demais elementos deverão seguir o documento oficial aprovado. Nenhuma base legal é presumida neste exemplo.' }], related: ['registro-pendencias']
  },
  {
    id: 'conferencia-documentos', type: 'guide', area: 'Análise', date: '2026-10-05', format: 'CHECKLIST',
    title: 'Conferência inicial de documentos', description: 'Lista ilustrativa para organizar os documentos recebidos e identificar pontos a esclarecer.',
    tags: ['checklist', 'análise', 'projeto', 'documentação'],
    sections: [{ title: 'Antes da análise', text: 'Exemplo de conferência de organização documental. Esta lista não substitui os documentos ou critérios exigidos pelas normas e pelo processo oficial.' }],
    checklist: ['Conferir a identificação dos arquivos recebidos', 'Relacionar os documentos ao processo correspondente', 'Verificar se a versão de cada documento está identificada', 'Separar dúvidas e arquivos que precisem de esclarecimento', 'Consultar a lista oficial de documentos aplicável ao caso'], related: ['parecer-analise', 'preparacao-vistoria']
  },
  {
    id: 'revisao-conteudos', type: 'notice', area: 'Geral', date: '2026-10-05', format: 'LEITURA',
    title: 'Revisão dos conteúdos de apoio', description: 'Comunicado demonstrativo sobre a conferência de versões e das referências da biblioteca.',
    tags: ['comunicado', 'revisão', 'versão', 'orientação'],
    sections: [{ title: 'Atualização de exemplo', text: 'Uma biblioteca de apoio pode registrar a data, a versão e a área responsável por cada conteúdo. Nesta primeira versão, as datas e os textos são demonstrativos.' }, { title: 'Ao consultar um conteúdo', items: ['Confira sua identificação e sua versão', 'Consulte as referências oficiais aplicáveis', 'Confirme informações pendentes com a área responsável'] }, { title: 'Situação desta versão', text: 'Não foi efetuada nenhuma alteração em procedimentos do departamento. A biblioteca aguarda os conteúdos reais para revisão e inclusão.' }], related: ['consulta-medidas']
  },
  {
    id: 'parecer-analise', type: 'model', area: 'Análise', date: '2026-10-04', format: 'DOCX', version: 'Exemplo v1.0',
    title: 'Estrutura de parecer de análise', description: 'Modelo editável de organização dos documentos consultados, observações e encaminhamento.',
    tags: ['parecer', 'análise', 'projeto', 'modelo'],
    sections: [{ title: 'Finalidade do exemplo', text: 'Demonstrar um modelo estruturado de registro de análise. Nenhum resultado técnico, enquadramento ou conclusão é fornecido neste arquivo.' }, { title: 'Estrutura de exemplo', items: ['Identificação do processo', 'Documentos e referências consultadas', 'Descrição dos pontos analisados', 'Observações para conferência', 'Conclusão — a elaborar pela área competente', 'Encaminhamento e revisão'] }], related: ['conferencia-documentos', 'consulta-medidas']
  },
  {
    id: 'registro-pendencias', type: 'guide', area: 'Vistoria', date: '2026-10-03', format: 'ORIENTAÇÃO',
    title: 'Como organizar o registro de pendências', description: 'Exemplo de organização de observações, referências e pontos que precisam de confirmação.',
    tags: ['pendência', 'relatório', 'registro', 'não conformidade'],
    sections: [{ title: 'Descrever com clareza', text: 'Exemplo de registro: identificar o local, descrever a observação e separar aquilo que foi verificado dos pontos que ainda precisam de confirmação.' }, { title: 'Campos para organizar a consulta', items: ['Local ou documento relacionado', 'Descrição da observação', 'Referência oficial a consultar', 'Evidência ou registro associado', 'Ponto a esclarecer com a área responsável'] }, { title: 'Sem enquadramento automático', text: 'Este conteúdo não classifica infrações nem recomenda medidas administrativas. Utilize as orientações institucionais para avaliar o caso real.' }], related: ['relatorio-vistoria', 'auto-infracao']
  },
  {
    id: 'encaminhamento', type: 'model', area: 'Administrativo', date: '2026-10-02', format: 'DOCX', version: 'Exemplo v1.0',
    title: 'Registro de encaminhamento interno', description: 'Estrutura simples para identificar o assunto, os documentos associados e a área de destino.',
    tags: ['encaminhamento', 'administrativo', 'processo', 'modelo'],
    sections: [{ title: 'Uso demonstrativo', text: 'Exemplo de estrutura de comunicação interna. Não representa um fluxo aprovado e não envia nenhuma informação a outras pessoas.' }, { title: 'Campos do modelo', items: ['Identificação do processo', 'Assunto do encaminhamento', 'Área de origem e área de destino', 'Documentos associados', 'Observações', 'Data e responsável — a preencher'] }], related: ['parecer-analise']
  },
  {
    id: 'consulta-medidas', type: 'guide', area: 'Vistoria', date: '2026-10-01', format: 'ORIENTAÇÃO',
    title: 'Consulta às medidas de segurança', description: 'Roteiro ilustrativo para localizar referências oficiais e registrar dúvidas de interpretação.',
    tags: ['medidas', 'extintores', 'saídas', 'sinalização', 'instrução técnica', 'IT'],
    sections: [{ title: 'Localizar a referência aplicável', text: 'Este roteiro mostra como uma ajuda rápida pode organizar links e referências. As instruções técnicas e os documentos oficiais ainda não foram cadastrados nesta demonstração.' }, { title: 'O que registrar na consulta', items: ['Identificação da instrução ou documento oficial', 'Versão e data da referência consultada', 'Trecho ou assunto relacionado à dúvida', 'Condições do caso que precisam ser confirmadas'] }, { title: 'Limites desta demonstração', text: 'Não há critérios técnicos, medidas, limites, prazos ou equivalências neste conteúdo. As orientações oficiais deverão ser inseridas e validadas pelo departamento.' }], related: ['preparacao-vistoria', 'parecer-analise']
  },
  {
    id: 'sugestoes-portal', type: 'notice', area: 'Administrativo', date: '2026-10-01', format: 'LEITURA',
    title: 'Sugestões para a biblioteca de apoio', description: 'Exemplo de comunicado com informações úteis para propor novos conteúdos ao portal.',
    tags: ['comunicado', 'sugestão', 'biblioteca', 'melhoria'],
    sections: [{ title: 'Comunicado demonstrativo', text: 'O portal pode reunir sugestões de novos modelos e assuntos de ajuda rápida. O canal oficial de envio deverá ser definido pelo DGSCI.' }, { title: 'Informações que ajudam na proposta', items: ['Título e assunto sugerido', 'Área que utilizará o conteúdo', 'Dúvida ou necessidade que o conteúdo resolve', 'Referência ou arquivo oficial a revisar'] }, { title: 'Canal ainda não definido', text: 'Esta versão não coleta ou envia sugestões. O canal e os responsáveis devem ser informados pelo departamento antes da ativação desse fluxo.' }], related: ['biblioteca-organizada']
  }
];
