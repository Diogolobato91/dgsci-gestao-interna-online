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

// Dados reais do sistema (mesmos do RelacaoEfetivo)
const servidoresIniciais: Servidor[] = [
  { id: '1', patente: 'CEL QOBM', nome: 'PABLO CRUZ DE OLIVEIRA', aniversario: '1977-08-04', telefone: '(85) 9 9999-0001', email: 'pablo.oliveira@cbm.ce.gov.br' },
  { id: '2', patente: '1º CEL QOBM', nome: 'RAIMUNDO NONATO MOURA DA SILVA FILHO', aniversario: '1961-08-19', telefone: '(85) 9 9999-0002', email: 'raimundo.silva@cbm.ce.gov.br' },
  { id: '3', patente: 'MAJ QOBM', nome: 'EDUARDO OLIVEIRA RIO BRANCO', aniversario: '1980-05-09', telefone: '(85) 9 9999-0003', email: 'eduardo.branco@cbm.ce.gov.br' },
  { id: '4', patente: 'CAP QOBM', nome: 'JOÃO SILVA SANTOS', aniversario: '1975-02-10', telefone: '(85) 9 9999-0004', email: 'joao.santos@cbm.ce.gov.br' },
  { id: '5', patente: 'TEN QOBM', nome: 'MARIA OLIVEIRA COSTA', aniversario: '1980-08-15', telefone: '(85) 9 9999-0005', email: 'maria.costa@cbm.ce.gov.br' },
  { id: '6', patente: '2º SGT', nome: 'CASSIO DIEGO NAZARENO OLIVEIRA DA SILVA', aniversario: '1984-04-20', telefone: '(85) 9 9999-0006', email: 'cassio.silva@cbm.ce.gov.br' },
  { id: '7', patente: '3º SGT', nome: 'SANDRO GONÇALVES DO NASCIMENTO', aniversario: '1987-04-24', telefone: '(85) 9 9999-0007', email: 'sandro.nascimento@cbm.ce.gov.br' },
  { id: '8', patente: 'CB', nome: 'NARDINY DIEGO SOUZA ALVES', aniversario: '1990-05-24', telefone: '(85) 9 9999-0008', email: 'nardiny.alves@cbm.ce.gov.br' },
  { id: '9', patente: 'VC', nome: 'VALERIA RUANA PEREIRA DA COSTA', aniversario: '2001-04-30', telefone: '(85) 9 9999-0009', email: 'valeria.costa@cbm.ce.gov.br' },
  { id: '10', patente: 'VC', nome: 'GABRIELA RODRIGUES MENDONÇA', aniversario: '2005-07-11', telefone: '(85) 9 9999-0010', email: 'gabriela.mendonca@cbm.ce.gov.br' }
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