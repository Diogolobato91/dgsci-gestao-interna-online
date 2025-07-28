import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  ClipboardList, 
  FileText, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const DashboardGeral: React.FC = () => {
  const indicadores = [
    {
      titulo: 'Projetos Analisados',
      valor: '156',
      variacao: '+15%',
      tendencia: 'up',
      icon: FileText,
      cor: 'text-blue-500'
    },
    {
      titulo: 'Análises Pendentes',
      valor: '23',
      variacao: '-8%',
      tendencia: 'down',
      icon: Clock,
      cor: 'text-yellow-500'
    },
    {
      titulo: 'Arrecadação (Taxas)',
      valor: 'R$ 89.450',
      variacao: '+18%',
      tendencia: 'up',
      icon: DollarSign,
      cor: 'text-green-500'
    },
    {
      titulo: 'Autorizações Emitidas',
      valor: '34',
      variacao: '+5%',
      tendencia: 'up',
      icon: CheckCircle,
      cor: 'text-green-500'
    },
    {
      titulo: 'Autos Lavrados',
      valor: '18',
      variacao: '-12%',
      tendencia: 'down',
      icon: AlertTriangle,
      cor: 'text-red-500'
    },
    {
      titulo: 'Militares Ativos',
      valor: '45',
      variacao: '0%',
      tendencia: 'stable',
      icon: Users,
      cor: 'text-purple-500'
    }
  ];

  const atividades = [
    {
      tipo: 'Análise de Projeto',
      local: 'Edifício Comercial Centro',
      responsavel: 'Cap. Silva',
      status: 'Em andamento',
      horario: '14:30'
    },
    {
      tipo: 'Autorização',
      local: 'Evento Temporário - Arena',
      responsavel: 'Ten. Santos',
      status: 'Aprovada',
      horario: '13:45'
    },
    {
      tipo: 'Auto de Infração',
      local: 'Indústria Metalúrgica XYZ',
      responsavel: 'Maj. Costa',
      status: 'Lavrado',
      horario: '12:15'
    },
    {
      tipo: 'Parecer Técnico',
      local: 'Hospital São Lucas',
      responsavel: 'Cap. Lima',
      status: 'Finalizado',
      horario: '16:00'
    }
  ];

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return '↗️';
    if (tendencia === 'down') return '↘️';
    return '➡️';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Em andamento': 'bg-blue-500',
      'Aprovada': 'bg-green-500',
      'Finalizado': 'bg-green-500',
      'Lavrado': 'bg-red-500',
      'Agendada': 'bg-yellow-500'
    } as const;
    
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Dashboard Geral - Diretoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Visão geral das operações e indicadores do DGSCI
          </p>
        </CardContent>
      </Card>

      {/* Grid de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {indicadores.map((indicador, index) => {
          const Icon = indicador.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-8 w-8 ${indicador.cor}`} />
                  <div className="flex items-center gap-1 text-sm">
                    <span>{getTendenciaIcon(indicador.tendencia)}</span>
                    <span className={
                      indicador.tendencia === 'up' ? 'text-green-500' :
                      indicador.tendencia === 'down' ? 'text-red-500' :
                      'text-gray-500'
                    }>
                      {indicador.variacao}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {indicador.valor}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {indicador.titulo}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Seção Atividades em Tempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividades em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atividades.map((atividade, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{atividade.tipo}</span>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(atividade.status)}`}></span>
                    </div>
                    <p className="text-sm text-muted-foreground">{atividade.local}</p>
                    <p className="text-xs text-muted-foreground">
                      {atividade.responsavel} • {atividade.horario}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {atividade.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Exemplo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projetos Analisados por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Gráfico Simulado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Semana 1</span>
                  <div className="flex-1 mx-4 bg-muted rounded h-2">
                    <div className="bg-primary rounded h-2" style={{width: '85%'}}></div>
                  </div>
                  <span className="text-sm font-medium">42</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Semana 2</span>
                  <div className="flex-1 mx-4 bg-muted rounded h-2">
                    <div className="bg-primary rounded h-2" style={{width: '70%'}}></div>
                  </div>
                  <span className="text-sm font-medium">35</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Semana 3</span>
                  <div className="flex-1 mx-4 bg-muted rounded h-2">
                    <div className="bg-primary rounded h-2" style={{width: '95%'}}></div>
                  </div>
                  <span className="text-sm font-medium">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Semana 4</span>
                  <div className="flex-1 mx-4 bg-muted rounded h-2">
                    <div className="bg-primary rounded h-2" style={{width: '80%'}}></div>
                  </div>
                  <span className="text-sm font-medium">40</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Mês - Janeiro 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">98.5%</p>
              <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">24h</p>
              <p className="text-sm text-muted-foreground">Tempo Médio de Análise</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">156</p>
              <p className="text-sm text-muted-foreground">Projetos Processados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">95%</p>
              <p className="text-sm text-muted-foreground">Satisfação do Usuário</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardGeral;