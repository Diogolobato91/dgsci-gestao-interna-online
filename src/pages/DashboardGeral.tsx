
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle
} from 'lucide-react';

const DashboardGeral: React.FC = () => {
  const indicadores = [
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
      titulo: 'Militares Ativos',
      valor: '45',
      variacao: '0%',
      tendencia: 'stable',
      icon: Users,
      cor: 'text-purple-500'
    }
  ];

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return '↗️';
    if (tendencia === 'down') return '↘️';
    return '➡️';
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
              <p className="text-3xl font-bold text-blue-500">R$ 245.380</p>
              <p className="text-sm text-muted-foreground">Arrecadação Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">95%</p>
              <p className="text-sm text-muted-foreground">Satisfação do Usuário</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Operacionais */}
      <Card>
        <CardHeader>
          <CardTitle>Indicadores Operacionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary mb-2">156</p>
              <p className="text-sm text-muted-foreground">Processos em Andamento</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-500 mb-2">89</p>
              <p className="text-sm text-muted-foreground">Documentos Emitidos</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-500 mb-2">12</p>
              <p className="text-sm text-muted-foreground">Comissões Ativas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardGeral;
