import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, isAfter, isBefore, startOfDay, addMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface Servidor {
  id: string;
  patente: string;
  nome: string;
  aniversario?: string;
  telefone?: string;
  email?: string;
  dataInicioFerias?: string;
  dataFimFerias?: string;
}

export interface Escala {
  id: string;
  data: string;
  servidor: string;
  tipo: 'diario' | 'sobreaviso';
  periodo?: 'manha' | 'tarde' | 'noite';
}

export interface Comunicado {
  id: string;
  titulo: string;
  resumo: string;
  tipo: 'informativo' | 'urgente' | 'normal';
  data: string;
  autor: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface IndicadorFinanceiro {
  arrecadacaoMensal: number;
  arrecadacaoAnual: number;
  multasEmitidas: number;
  processosAndamento: number;
}

interface DataContextType {
  // Data e hora atuais
  currentDateTime: Date;
  
  // Servidores
  servidores: Servidor[];
  addServidor: (servidor: Omit<Servidor, 'id'>) => void;
  updateServidor: (id: string, servidor: Partial<Servidor>) => void;
  deleteServidor: (id: string) => void;
  
  // Escalas
  escalas: Escala[];
  getEscalaByDate: (date: Date) => Escala[];
  
  // Comunicados
  comunicados: Comunicado[];
  
  // Cálculos dinâmicos
  proximoAniversariante: any;
  proximosAniversariantes: any[];
  proximasFerias: any[];
  
  // Indicadores
  indicadores: IndicadorFinanceiro;
  
  // Estatísticas
  totalMilitaresAtivos: number;
  totalAutorizacoesEmitidas: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Dados reais do sistema sincronizados com RelacaoEfetivo
const servidoresIniciais: Servidor[] = [
  { id: '1', patente: 'CEL QOBM', nome: 'PABLO CRUZ DE OLIVEIRA', aniversario: '1977-08-04', telefone: '(85) 9 9999-0001', email: 'pablo.oliveira@cbm.ce.gov.br' },
  { id: '2', patente: 'TCEL QOBM', nome: 'RAIMUNDO NONATO MOURA DA SILVA FILHO', aniversario: '1981-08-19', telefone: '(85) 9 9999-0002', email: 'raimundo.silva@cbm.ce.gov.br' },
  { id: '3', patente: 'MAJ QOBM', nome: 'EDUARDO OLIVEIRA RIO BRANCO', aniversario: '1980-05-09', telefone: '(85) 9 9999-0003', email: 'eduardo.branco@cbm.ce.gov.br' },
  { id: '4', patente: 'CAP QOABM', nome: 'RONALDO FEIO DA COSTA', aniversario: '1967-06-14', telefone: '(85) 9 9999-0004', email: 'ronaldo.costa@cbm.ce.gov.br' },
  { id: '5', patente: '1º TEN QOABM', nome: 'LUIS CLAUDIO PINTO DIAS', aniversario: '1970-05-30', telefone: '(85) 9 9999-0005', email: 'luis.dias@cbm.ce.gov.br' },
  { id: '6', patente: '1º TEN QOBM', nome: 'IARA FERREIRA SANTOS', aniversario: '1990-06-01', telefone: '(85) 9 9999-0006', email: 'iara.santos@cbm.ce.gov.br' },
  { id: '7', patente: '1º TEN QOBM', nome: 'ANA BEATRIZ MALHEIROS PIQUET SARGES', aniversario: '1995-05-30', telefone: '(85) 9 9999-0007', email: 'ana.sarges@cbm.ce.gov.br' },
  { id: '8', patente: '2º TEN QOABM', nome: 'JOSÉ EDUARDO CARREIRA ARAUJO', aniversario: '1981-11-25', telefone: '(85) 9 9999-0008', email: 'jose.araujo@cbm.ce.gov.br' },
  { id: '9', patente: '2º TEN QOABM', nome: 'DANIEL SILVA CORREA', aniversario: '1979-05-20', telefone: '(85) 9 9999-0009', email: 'daniel.correa@cbm.ce.gov.br' },
  { id: '10', patente: '2º TEN QOABM', nome: 'FABIO MAGALHÃES DE DEUS', aniversario: '1976-10-20', telefone: '(85) 9 9999-0010', email: 'fabio.deus@cbm.ce.gov.br' },
  { id: '11', patente: 'SUB TEN RR', nome: 'LUCIVALDO DOS REIS FERREIRA', aniversario: '1968-11-10', telefone: '(85) 9 9999-0011', email: 'lucivaldo.ferreira@cbm.ce.gov.br' },
  { id: '12', patente: 'SUB TEN RR', nome: 'MARCO ANTONIO DA SILVA COSTA', aniversario: '1967-07-22', telefone: '(85) 9 9999-0012', email: 'marco.costa@cbm.ce.gov.br' },
  { id: '13', patente: 'SUB TEN RR', nome: 'CARLOS ALBERTO CARDOSO DOS REIS', aniversario: '1965-10-30', telefone: '(85) 9 9999-0013', email: 'carlos.reis@cbm.ce.gov.br' },
  { id: '14', patente: 'SUB TEN RR', nome: 'JORGE EDUARDO LOBO DA SILVA', aniversario: '1968-05-20', telefone: '(85) 9 9999-0014', email: 'jorge.silva@cbm.ce.gov.br' },
  { id: '15', patente: '1º SGT', nome: 'LUIZ AUGUSTO SANTOS BAENA', aniversario: '1969-05-23', telefone: '(85) 9 9999-0015', email: 'luiz.baena@cbm.ce.gov.br' },
  { id: '16', patente: '1º SGT', nome: 'ICLANDO SARAIVA DAS CHAGAS', aniversario: '1967-10-28', telefone: '(85) 9 9999-0016', email: 'iclando.chagas@cbm.ce.gov.br' },
  { id: '17', patente: '2º SGT', nome: 'CASSIO DIEGO NAZARENO OLIVEIRA DA SILVA', aniversario: '1984-04-20', telefone: '(85) 9 9999-0017', email: 'cassio.silva@cbm.ce.gov.br' },
  { id: '18', patente: '3º SGT', nome: 'LEONORA PENNA BAIA', aniversario: '1981-06-19', telefone: '(85) 9 9999-0018', email: 'leonora.baia@cbm.ce.gov.br' },
  { id: '19', patente: '3º SGT', nome: 'EBER BESSA JUNIOR', aniversario: '1978-08-09', telefone: '(85) 9 9999-0019', email: 'eber.junior@cbm.ce.gov.br' },
  { id: '20', patente: '3º SGT', nome: 'CARLOS AUGUSTO DE LIMA SANTOS', aniversario: '1983-06-03', telefone: '(85) 9 9999-0020', email: 'carlos.santos@cbm.ce.gov.br' },
  { id: '21', patente: '3º SGT', nome: 'ADERSON MARTINS SOUZA', aniversario: '1981-09-02', telefone: '(85) 9 9999-0021', email: 'aderson.souza@cbm.ce.gov.br' },
  { id: '22', patente: '3º SGT', nome: 'GERSON TEIXEIRA DE OLIVEIRA', aniversario: '1985-11-02', telefone: '(85) 9 9999-0022', email: 'gerson.oliveira@cbm.ce.gov.br' },
  { id: '23', patente: '3º SGT', nome: 'JAIRO RODRIGO DA SILVA PEREIRA', aniversario: '1983-01-18', telefone: '(85) 9 9999-0023', email: 'jairo.pereira@cbm.ce.gov.br' },
  { id: '24', patente: '3º SGT', nome: 'SANDRO GONÇALVES DO NASCIMENTO', aniversario: '1987-04-24', telefone: '(85) 9 9999-0024', email: 'sandro.nascimento@cbm.ce.gov.br' },
  { id: '25', patente: '3º SGT', nome: 'CLEBERSON PEREIRA DO NASCIMENTO', aniversario: '1979-01-28', telefone: '(85) 9 9999-0025', email: 'cleberson.nascimento@cbm.ce.gov.br' },
  { id: '26', patente: '3º SGT', nome: 'VALDIR DE SOUZA PACHECO', aniversario: '1979-07-15', telefone: '(85) 9 9999-0026', email: 'valdir.pacheco@cbm.ce.gov.br' },
  { id: '27', patente: '3º SGT', nome: 'MARIA JOSE ROCHA DO NASCIMENTO', aniversario: '1980-12-02', telefone: '(85) 9 9999-0027', email: 'maria.nascimento@cbm.ce.gov.br' },
  { id: '28', patente: '3º SGT', nome: 'PAULA DANIELLE VILHENA DIAS DE OLIVEIRA', aniversario: '1983-11-09', telefone: '(85) 9 9999-0028', email: 'paula.oliveira@cbm.ce.gov.br' },
  { id: '29', patente: '3º SGT', nome: 'VANESSA BORGES DE JESUS SILVA', aniversario: '1981-04-06', telefone: '(85) 9 9999-0029', email: 'vanessa.silva@cbm.ce.gov.br' },
  { id: '30', patente: '3º SGT', nome: 'MARCIO RODRIGUES', aniversario: '1982-03-26', telefone: '(85) 9 9999-0030', email: 'marcio.rodrigues@cbm.ce.gov.br' },
  { id: '31', patente: '3º SGT', nome: 'HERMANO MOREIRA COSTA', aniversario: '1980-10-28', telefone: '(85) 9 9999-0031', email: 'hermano.costa@cbm.ce.gov.br' },
  { id: '32', patente: '3º SGT', nome: 'MICHELLE MAIA CARNEIRO RABELO', aniversario: '1982-08-14', telefone: '(85) 9 9999-0032', email: 'michelle.rabelo@cbm.ce.gov.br' },
  { id: '33', patente: '3º SGT', nome: 'ODETE MESQUITA DE ANDRADE', aniversario: '1982-02-09', telefone: '(85) 9 9999-0033', email: 'odete.andrade@cbm.ce.gov.br' },
  { id: '34', patente: '3º SGT', nome: 'FABRICIO PEREIRA DA SILVA', aniversario: '1984-07-03', telefone: '(85) 9 9999-0034', email: 'fabricio.silva@cbm.ce.gov.br' },
  { id: '35', patente: '3º SGT', nome: 'KAROLINE AURINETH SILVA CAMPOS', aniversario: '1987-10-19', telefone: '(85) 9 9999-0035', email: 'karoline.campos@cbm.ce.gov.br' },
  { id: '36', patente: '3º SGT', nome: 'ADRIANA NAZARE COSTA DE ASSUNÇÃO', aniversario: '1980-12-26', telefone: '(85) 9 9999-0036', email: 'adriana.assuncao@cbm.ce.gov.br' },
  { id: '37', patente: '3º SGT', nome: 'JULIANA CAROLINA DE SOUZA COSTA', aniversario: '1986-10-03', telefone: '(85) 9 9999-0037', email: 'juliana.costa@cbm.ce.gov.br' },
  { id: '38', patente: '3º SGT', nome: 'WANDER LUIZ FERREIRA DA SILVA', aniversario: '1980-09-25', telefone: '(85) 9 9999-0038', email: 'wander.silva@cbm.ce.gov.br' },
  { id: '39', patente: '3º SGT', nome: 'ROGERIO VALDIVINO CORREA DA SILVA', aniversario: '1981-08-07', telefone: '(85) 9 9999-0039', email: 'rogerio.silva@cbm.ce.gov.br' },
  { id: '40', patente: '3º SGT', nome: 'WARLEY RAFAEL SILVEIRA TEIXEIRA', aniversario: '1989-11-24', telefone: '(85) 9 9999-0040', email: 'warley.teixeira@cbm.ce.gov.br' },
  { id: '41', patente: '3º SGT', nome: 'GEDERSON DA SILVA RIBEIRO', aniversario: '1982-06-02', telefone: '(85) 9 9999-0041', email: 'gederson.ribeiro@cbm.ce.gov.br' },
  { id: '42', patente: '3º SGT', nome: 'ARLEY RAFAEL BARBOSA RODRIGUES', aniversario: '1990-03-07', telefone: '(85) 9 9999-0042', email: 'arley.rodrigues@cbm.ce.gov.br' },
  { id: '43', patente: 'CB', nome: 'NARDINY DIEGO SOUZA ALVES', aniversario: '1990-05-24', telefone: '(85) 9 9999-0043', email: 'nardiny.alves@cbm.ce.gov.br' },
  { id: '44', patente: 'CB', nome: 'NAYARA FERNANDA FREITAS DE SOUSA', aniversario: '1994-03-21', telefone: '(85) 9 9999-0044', email: 'nayara.sousa@cbm.ce.gov.br' },
  { id: '45', patente: 'CB', nome: 'RAIANA PAMPOLHA BRAZZDE OLIVEIRA', aniversario: '1993-05-29', telefone: '(85) 9 9999-0045', email: 'raiana.oliveira@cbm.ce.gov.br' },
  { id: '46', patente: 'CB', nome: 'FELIPE LOPES CARDOSO', aniversario: '1990-03-29', telefone: '(85) 9 9999-0046', email: 'felipe.cardoso@cbm.ce.gov.br' },
  { id: '47', patente: 'CB', nome: 'RAFAEL LUIS DA SILVA SENA', aniversario: '1996-10-04', telefone: '(85) 9 9999-0047', email: 'rafael.sena@cbm.ce.gov.br' },
  { id: '48', patente: 'CB', nome: 'GISLAINE DAIANE DOS SANTOS REIS', aniversario: '1993-07-08', telefone: '(85) 9 9999-0048', email: 'gislaine.reis@cbm.ce.gov.br' },
  
  { id: '50', patente: 'VC', nome: 'DAVI SOUSA CARVALHO', aniversario: '2002-07-13', telefone: '(85) 9 9999-0050', email: 'davi.carvalho@cbm.ce.gov.br' },
  { id: '51', patente: 'VC', nome: 'DERIK MATHEUS FERREIRA DE ASSIS', aniversario: '2003-03-09', telefone: '(85) 9 9999-0051', email: 'derik.assis@cbm.ce.gov.br' },
  { id: '52', patente: 'VC', nome: 'GABRIELA RODRIGUES MENDONÇA', aniversario: '2005-07-11', telefone: '(85) 9 9999-0052', email: 'gabriela.mendonca@cbm.ce.gov.br' },
  { id: '53', patente: 'VC', nome: 'TAYNA DOS SANTOS MACHADO', aniversario: '2005-04-21', telefone: '(85) 9 9999-0053', email: 'tayna.machado@cbm.ce.gov.br' },
  { id: '54', patente: 'VC', nome: 'JHENNIFER CRISTINA DE QUEIROZ FERREIRA', aniversario: '2005-05-10', telefone: '(85) 9 9999-0054', email: 'jhennifer.ferreira@cbm.ce.gov.br' },
  { id: '55', patente: 'VC', nome: 'DANIELA CONCEIÇÃO DOS SANTOS', aniversario: '2006-01-20', telefone: '(85) 9 9999-0055', email: 'daniela.santos@cbm.ce.gov.br' },
  { id: '56', patente: 'VC', nome: 'ISADORA SOUZA MENDES', aniversario: '2006-05-07', telefone: '(85) 9 9999-0056', email: 'isadora.mendes@cbm.ce.gov.br' },
  { id: '57', patente: 'VC', nome: 'DIOGO FERREIRA LOBATO', aniversario: '2004-01-20', telefone: '(85) 9 9999-0057', email: 'diogo.lobato@cbm.ce.gov.br' },
  { id: '58', patente: 'VC', nome: 'EMMANUELLE GHISLANE SOUZA PIRES', aniversario: '2003-08-29', telefone: '(85) 9 9999-0058', email: 'emmanuelle.pires@cbm.ce.gov.br' },
  { id: '59', patente: 'VC', nome: 'REBECA DE PAULA', aniversario: '2004-05-06', telefone: '(85) 9 9999-0059', email: 'rebeca.paula@cbm.ce.gov.br' },
  { id: '60', patente: 'VC', nome: 'JAMILLY TAVARES ALVES DA SILVA GARCIA', aniversario: '2004-12-08', telefone: '(85) 9 9999-0060', email: 'jamilly.garcia@cbm.ce.gov.br' },
  { id: '61', patente: 'VC', nome: 'GLAUCE CARVALHO MOURÃO', aniversario: '2004-09-17', telefone: '(85) 9 9999-0061', email: 'glauce.mourao@cbm.ce.gov.br' }
];

const comunicadosIniciais: Comunicado[] = [
  {
    id: '1',
    titulo: 'Reunião Mensal da Diretoria',
    resumo: 'Reunião para discussão dos indicadores do mês e planejamento das atividades.',
    tipo: 'informativo',
    data: new Date().toISOString(),
    autor: 'Diretoria DGSCI',
    prioridade: 'alta'
  },
  {
    id: '2',
    titulo: 'Atualização dos Modelos de Auto de Infração',
    resumo: 'Novos modelos disponíveis para download na seção correspondente.',
    tipo: 'normal',
    data: addDays(new Date(), -2).toISOString(),
    autor: 'Setor Jurídico',
    prioridade: 'media'
  },
  {
    id: '3',
    titulo: 'Manutenção Programada do Sistema',
    resumo: 'Sistema ficará indisponível das 02:00 às 06:00 para manutenção.',
    tipo: 'urgente',
    data: addDays(new Date(), -1).toISOString(),
    autor: 'TI DGSCI',
    prioridade: 'alta'
  }
];

// Gerar escalas automáticas para o mês atual
const gerarEscalasDoMes = (servidores: Servidor[]): Escala[] => {
  const escalas: Escala[] = [];
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  let dataAtual = inicioMes;
  let indiceServidor = 0;
  
  while (isBefore(dataAtual, fimMes) || dataAtual.getTime() === fimMes.getTime()) {
    const servidor = servidores[indiceServidor % servidores.length];
    
    escalas.push({
      id: `escala-${format(dataAtual, 'yyyy-MM-dd')}`,
      data: format(dataAtual, 'yyyy-MM-dd'),
      servidor: servidor.nome,
      tipo: 'diario',
      periodo: 'manha'
    });
    
    dataAtual = addDays(dataAtual, 1);
    indiceServidor++;
  }
  
  return escalas;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [servidores, setServidores] = useState<Servidor[]>(servidoresIniciais);
  const [comunicados] = useState<Comunicado[]>(comunicadosIniciais);
  
  // Atualizar data/hora a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Atualiza a cada minuto
    
    return () => clearInterval(interval);
  }, []);
  
  // Gerar escalas baseadas nos servidores atuais
  const escalas = useMemo(() => gerarEscalasDoMes(servidores), [servidores]);
  
  // Calcular próximos aniversariantes
  const proximosAniversariantes = useMemo(() => {
    const hoje = startOfDay(new Date());
    
    return servidores
      .filter(servidor => servidor.aniversario)
      .map(servidor => {
        const [ano, mes, dia] = servidor.aniversario!.split('-');
        const aniversarioEsteAno = new Date(hoje.getFullYear(), parseInt(mes) - 1, parseInt(dia));
        const aniversarioProximoAno = new Date(hoje.getFullYear() + 1, parseInt(mes) - 1, parseInt(dia));
        
        const proximoAniversario = isAfter(aniversarioEsteAno, hoje) ? aniversarioEsteAno : aniversarioProximoAno;
        const diasParaAniversario = differenceInDays(proximoAniversario, hoje);
        
        return {
          ...servidor,
          diasParaAniversario,
          proximoAniversario
        };
      })
      .filter(servidor => servidor.diasParaAniversario <= 60)
      .sort((a, b) => a.diasParaAniversario - b.diasParaAniversario);
  }, [servidores]);
  
  // Próximo aniversariante
  const proximoAniversariante = proximosAniversariantes[0] || null;
  
  // Próximas férias
  const proximasFerias = useMemo(() => {
    const hoje = startOfDay(new Date());
    const proximosTresMeses = addMonths(hoje, 3);
    
    return servidores
      .filter(servidor => servidor.dataInicioFerias)
      .map(servidor => {
        const inicioFerias = new Date(servidor.dataInicioFerias!);
        const diasParaFerias = differenceInDays(inicioFerias, hoje);
        
        return {
          ...servidor,
          diasParaFerias
        };
      })
      .filter(servidor => {
        const inicioFerias = new Date(servidor.dataInicioFerias!);
        return isAfter(inicioFerias, hoje) && isBefore(inicioFerias, proximosTresMeses);
      })
      .sort((a, b) => a.diasParaFerias - b.diasParaFerias);
  }, [servidores]);
  
  // Indicadores simulados mas dinâmicos
  const indicadores = useMemo(() => {
    const baseArrecadacao = 1250000;
    const variacao = Math.sin(currentDateTime.getMonth()) * 0.1;
    
    return {
      arrecadacaoMensal: Math.round(baseArrecadacao * (1 + variacao)),
      arrecadacaoAnual: Math.round(baseArrecadacao * 12 * (1 + variacao * 0.5)),
      multasEmitidas: Math.round(450 + (currentDateTime.getDate() * 15)),
      processosAndamento: Math.round(89 + Math.sin(currentDateTime.getTime() / 1000000) * 10)
    };
  }, [currentDateTime]);
  
  // Funções para manipular servidores
  const addServidor = (novoServidor: Omit<Servidor, 'id'>) => {
    const id = Date.now().toString();
    setServidores(prev => [...prev, { ...novoServidor, id }]);
  };
  
  const updateServidor = (id: string, dadosAtualizados: Partial<Servidor>) => {
    setServidores(prev => prev.map(servidor => 
      servidor.id === id ? { ...servidor, ...dadosAtualizados } : servidor
    ));
  };
  
  const deleteServidor = (id: string) => {
    setServidores(prev => prev.filter(servidor => servidor.id !== id));
  };
  
  const getEscalaByDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return escalas.filter(escala => escala.data === dateString);
  };
  
  const totalMilitaresAtivos = servidores.length;
  const totalAutorizacoesEmitidas = Math.round(125 + (currentDateTime.getDate() * 3));
  
  const value: DataContextType = {
    currentDateTime,
    servidores,
    addServidor,
    updateServidor,
    deleteServidor,
    escalas,
    getEscalaByDate,
    comunicados,
    proximoAniversariante,
    proximosAniversariantes,
    proximasFerias,
    indicadores,
    totalMilitaresAtivos,
    totalAutorizacoesEmitidas
  };
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};