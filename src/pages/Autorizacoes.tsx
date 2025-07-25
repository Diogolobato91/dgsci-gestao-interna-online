import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, BarChart3, DollarSign, TrendingUp, Calendar, Edit, PieChart, LineChart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PieChart as RechartsPie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart as RechartsLine, Line, Area, AreaChart } from 'recharts';

interface AutorizacaoGBM {
  id: number;
  protocoloPAE: string;
  gbm: string;
  referencia: string;
  destino: string;
  qtdEfetivo: number;
  periodo: string;
  valorDespesa: number;
  status: 'Autorizado' | 'Não Autorizado' | 'GAB CMDO' | 'Correção SAT';
  dataAutorizacao: string;
  valorArrecadado: number;
  observacao: string;
}

interface AutorizacaoDGSCI {
  id: number;
  protocolo: string;
  referencia: string;
  destino: string;
  qtdEfetivo: number;
  periodo: string;
  valorDespesa: number;
  valorArrecadado: number;
}

interface ControleSaldo {
  id: number;
  saldoDF: number;
  informadoEm: string;
  despesaSAT: number;
  totalDespesaDGSCI: number;
  saldoAtual: number;
}

const Autorizacoes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGBM, setEditingGBM] = useState<AutorizacaoGBM | null>(null);
  const [editingDGSCI, setEditingDGSCI] = useState<AutorizacaoDGSCI | null>(null);
  const [editingSaldo, setEditingSaldo] = useState<ControleSaldo | null>(null);

  const canManage = user?.profile === 'Subdiretoria' || user?.profile === 'Diretoria' || user?.profile === 'ADM';

  // Dados baseados nas imagens fornecidas
  const [autorizacoesGBM, setAutorizacoesGBM] = useState<AutorizacaoGBM[]>([
    {
      id: 1,
      protocoloPAE: 'E-2025/2065782',
      gbm: '9º GBM - ALT',
      referencia: 'OS 002',
      destino: 'URUARÁ - SOLICITAÇÃO MP',
      qtdEfetivo: 2,
      periodo: '21 A 23/01',
      valorDespesa: 1468.70,
      status: 'GAB CMDO',
      dataAutorizacao: '17/01/2025',
      valorArrecadado: 17155.30,
      observacao: 'NÃO PAGO'
    },
    {
      id: 2,
      protocoloPAE: 'E-2025/2015812',
      gbm: '4º GBM - SAN',
      referencia: 'NS 001',
      destino: 'ÓBIDOS - CARNAVAL',
      qtdEfetivo: 2,
      periodo: '25 A 26/02',
      valorDespesa: 2181.13,
      status: 'GAB CMDO',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 3,
      protocoloPAE: 'E-2025/2062817',
      gbm: '17º GBM - VL',
      referencia: 'NS 001',
      destino: 'SÃO CAETANO DE ODIVELAS',
      qtdEfetivo: 5,
      periodo: '27 A 31/01',
      valorDespesa: 0,
      status: 'Não Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 4,
      protocoloPAE: 'E-2025/2056496',
      gbm: '1º GPA - FRA',
      referencia: 'NS 001',
      destino: 'DOM ELISEU',
      qtdEfetivo: 3,
      periodo: '4',
      valorDespesa: 0,
      status: 'Não Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 5,
      protocoloPAE: 'E-2025/2050596',
      gbm: '24º GBM - BR',
      referencia: '',
      destino: 'VISEU',
      qtdEfetivo: 3,
      periodo: '09 A 10/01',
      valorDespesa: 851.00,
      status: 'GAB CMDO',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 6,
      protocoloPAE: 'E-2025/2078199',
      gbm: '9º GBM - MAL',
      referencia: 'OS 003',
      destino: 'SALEIRO METAIS - SOLICITAÇÃO MP',
      qtdEfetivo: 4,
      periodo: '05 A 07/02',
      valorDespesa: 5015.54,
      status: 'GAB CMDO',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 7,
      protocoloPAE: 'E-2025/2087421',
      gbm: '16º GBM - CA',
      referencia: 'OS 001',
      destino: 'ELDORADO DOS CARAJÁS',
      qtdEfetivo: 4,
      periodo: '01 A 05/01',
      valorDespesa: 0,
      status: 'Não Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    },
    {
      id: 8,
      protocoloPAE: 'E-2025/2088682',
      gbm: '9º GBM - ALT',
      referencia: 'OS 004',
      destino: 'SENADOR JOSÉ PORFÍRIO - SOLICITAÇÃO MP',
      qtdEfetivo: 2,
      periodo: '22/01',
      valorDespesa: 0,
      status: 'Não Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: 'NÃO PAGO'
    },
    {
      id: 9,
      protocoloPAE: 'E-2025/2091291',
      gbm: '22º GBM - CA',
      referencia: 'OS 001',
      destino: 'LIMOEIRO DO AJURU - SOLICITAÇÃO MP',
      qtdEfetivo: 2,
      periodo: '23/01',
      valorDespesa: 0,
      status: 'Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: 'NÃO PAGO'
    },
    {
      id: 10,
      protocoloPAE: 'E-2025/2098919',
      gbm: '11º GBM - BR',
      referencia: 'OS 007',
      destino: 'ANAJÁS',
      qtdEfetivo: 4,
      periodo: '16 A 22/02',
      valorDespesa: 0,
      status: 'Não Autorizado',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: ''
    }
  ]);

  const [autorizacoesDGSCI, setAutorizacoesDGSCI] = useState<AutorizacaoDGSCI[]>([
    {
      id: 1,
      protocolo: 'E-2025/2221786',
      referencia: 'NS 08',
      destino: 'VIGIA',
      qtdEfetivo: 2,
      periodo: '13/02',
      valorDespesa: 370.61,
      valorArrecadado: 0
    },
    {
      id: 2,
      protocolo: 'E-2025/2265507',
      referencia: 'NS 02',
      destino: 'CURUÇÁ | IGARAPÉ | CAMETÁ',
      qtdEfetivo: 4,
      periodo: '26/02 a 05/03',
      valorDespesa: 6365.55,
      valorArrecadado: 0
    },
    {
      id: 3,
      protocolo: 'E-2025/2222751',
      referencia: 'NS 10',
      destino: 'IRITUIA',
      qtdEfetivo: 2,
      periodo: '20/02',
      valorDespesa: 531.50,
      valorArrecadado: 0
    },
    {
      id: 4,
      protocolo: 'E-2025/2358037',
      referencia: 'NS 11',
      destino: 'SALINÓPOLIS',
      qtdEfetivo: 4,
      periodo: '12 a 14/03',
      valorDespesa: 2225.65,
      valorArrecadado: 0
    },
    {
      id: 5,
      protocolo: 'E-2025/2370043',
      referencia: 'NS 03',
      destino: 'MOJÚ',
      qtdEfetivo: 2,
      periodo: '13/03',
      valorDespesa: 293.74,
      valorArrecadado: 0
    },
    {
      id: 6,
      protocolo: 'E-2025/2409392',
      referencia: 'NS 12',
      destino: 'SALINÓPOLIS',
      qtdEfetivo: 3,
      periodo: '26 a 28/03',
      valorDespesa: 2148.10,
      valorArrecadado: 0
    },
    {
      id: 7,
      protocolo: 'E-2025/2476607',
      referencia: 'NS 15',
      destino: 'MOSQUEIRO',
      qtdEfetivo: 2,
      periodo: '22/03',
      valorDespesa: 471.80,
      valorArrecadado: 0
    },
    {
      id: 8,
      protocolo: 'E-2025/2608447',
      referencia: 'NS 022',
      destino: 'SALINAS | BRAGANÇA | MOSQUEIRO',
      qtdEfetivo: 15,
      periodo: '22 a 28/05',
      valorDespesa: 12811.50,
      valorArrecadado: 0
    },
    {
      id: 9,
      protocolo: 'E-2025/2551489',
      referencia: 'NS 003',
      destino: 'PORTEL E BREVES',
      qtdEfetivo: 3,
      periodo: '21 a 25/04',
      valorDespesa: 3829.50,
      valorArrecadado: 0
    },
    {
      id: 10,
      protocolo: 'E-2025/2609168',
      referencia: 'NS 016',
      destino: 'PORTEL E BREVES',
      qtdEfetivo: 7,
      periodo: '05 a 08/05',
      valorDespesa: 7013.93,
      valorArrecadado: 0
    },
    {
      id: 11,
      protocolo: 'E-2025/2606809',
      referencia: 'NS 018',
      destino: 'MOSQUEIRO',
      qtdEfetivo: 4,
      periodo: '12 a 13/05',
      valorDespesa: 1684.14,
      valorArrecadado: 0
    },
    {
      id: 12,
      protocolo: 'OP VERÃO DST/CAT',
      referencia: '',
      destino: '',
      qtdEfetivo: 0,
      periodo: '',
      valorDespesa: 180150.36,
      valorArrecadado: 0
    }
  ]);

  const [controleSaldo, setControleSaldo] = useState<ControleSaldo>({
    id: 1,
    saldoDF: 516838.67,
    informadoEm: '06/05/2025',
    despesaSAT: 115317.87,
    totalDespesaDGSCI: 219834.47,
    saldoAtual: 181686.33
  });

  const filteredGBM = useMemo(() => {
    if (!searchTerm.trim()) return autorizacoesGBM;
    return autorizacoesGBM.filter(item =>
      item.gbm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.protocoloPAE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destino.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [autorizacoesGBM, searchTerm]);

  const filteredDGSCI = useMemo(() => {
    if (!searchTerm.trim()) return autorizacoesDGSCI;
    return autorizacoesDGSCI.filter(item =>
      item.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destino.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [autorizacoesDGSCI, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'Autorizado': 'default',
      'Não Autorizado': 'destructive',
      'GAB CMDO': 'secondary',
      'Correção SAT': 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Dashboard data with charts
  const dashboardData = useMemo(() => {
    const totalViagensGBM = autorizacoesGBM.length;
    const totalViagensDGSCI = autorizacoesDGSCI.length;
    const totalArrecadadoGBM = autorizacoesGBM.reduce((sum, item) => sum + item.valorArrecadado, 0);
    const totalArrecadadoDGSCI = autorizacoesDGSCI.reduce((sum, item) => sum + item.valorArrecadado, 0);
    const totalDespesaGBM = autorizacoesGBM.reduce((sum, item) => sum + item.valorDespesa, 0);
    const totalDespesaDGSCI = autorizacoesDGSCI.reduce((sum, item) => sum + item.valorDespesa, 0);
    
    return {
      totalViagens: totalViagensGBM + totalViagensDGSCI,
      totalArrecadado: totalArrecadadoGBM + totalArrecadadoDGSCI,
      totalDespesas: totalDespesaGBM + totalDespesaDGSCI,
      autorizadas: autorizacoesGBM.filter(item => item.status === 'Autorizado').length,
      gbmData: {
        viagens: totalViagensGBM,
        despesas: totalDespesaGBM,
        arrecadado: totalArrecadadoGBM
      },
      dgsciData: {
        viagens: totalViagensDGSCI,
        despesas: totalDespesaDGSCI,
        arrecadado: totalArrecadadoDGSCI
      }
    };
  }, [autorizacoesGBM, autorizacoesDGSCI]);

  // Chart data
  const pieChartData = [
    { name: 'Autorizado', value: autorizacoesGBM.filter(item => item.status === 'Autorizado').length, color: '#22c55e' },
    { name: 'GAB CMDO', value: autorizacoesGBM.filter(item => item.status === 'GAB CMDO').length, color: '#f59e0b' },
    { name: 'Não Autorizado', value: autorizacoesGBM.filter(item => item.status === 'Não Autorizado').length, color: '#ef4444' },
    { name: 'Correção SAT', value: autorizacoesGBM.filter(item => item.status === 'Correção SAT').length, color: '#6b7280' }
  ];

  const comparisonData = [
    {
      name: 'GBM\'s',
      viagens: dashboardData.gbmData.viagens,
      despesas: dashboardData.gbmData.despesas,
      arrecadado: dashboardData.gbmData.arrecadado
    },
    {
      name: 'DGSCI',
      viagens: dashboardData.dgsciData.viagens,
      despesas: dashboardData.dgsciData.despesas,
      arrecadado: dashboardData.dgsciData.arrecadado
    }
  ];

  const saldoEvolutionData = [
    { mes: 'Jan', saldo: controleSaldo.saldoDF },
    { mes: 'Fev', saldo: controleSaldo.saldoDF - (controleSaldo.despesaSAT * 0.3) },
    { mes: 'Mar', saldo: controleSaldo.saldoDF - (controleSaldo.despesaSAT * 0.6) },
    { mes: 'Abr', saldo: controleSaldo.saldoDF - (controleSaldo.despesaSAT * 0.8) },
    { mes: 'Mai', saldo: controleSaldo.saldoAtual }
  ];

  const handleEditGBM = (item: AutorizacaoGBM) => {
    setEditingGBM({ ...item });
  };

  const handleEditDGSCI = (item: AutorizacaoDGSCI) => {
    setEditingDGSCI({ ...item });
  };

  const handleEditSaldo = () => {
    setEditingSaldo({ ...controleSaldo });
  };

  const saveGBMEdit = () => {
    if (editingGBM) {
      setAutorizacoesGBM(prev => prev.map(item => 
        item.id === editingGBM.id ? editingGBM : item
      ));
      setEditingGBM(null);
      toast({
        title: "Autorização atualizada",
        description: "As informações foram salvas com sucesso."
      });
    }
  };

  const saveDGSCIEdit = () => {
    if (editingDGSCI) {
      setAutorizacoesDGSCI(prev => prev.map(item => 
        item.id === editingDGSCI.id ? editingDGSCI : item
      ));
      setEditingDGSCI(null);
      toast({
        title: "Autorização DGSCI atualizada",
        description: "As informações foram salvas com sucesso."
      });
    }
  };

  const saveSaldoEdit = () => {
    if (editingSaldo) {
      setControleSaldo(editingSaldo);
      setEditingSaldo(null);
      toast({
        title: "Saldo atualizado",
        description: "As informações financeiras foram salvas com sucesso."
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Autorizações</h1>
          <p className="text-muted-foreground">
            Gerenciamento de autorizações diárias e extras com dados reais
          </p>
        </div>
        {canManage && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Autorização
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="gbm">SAT's</TabsTrigger>
          <TabsTrigger value="dgsci">DGSCI</TabsTrigger>
          <TabsTrigger value="saldo">Controle de Saldo</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Operações</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalViagens}</div>
                <p className="text-xs text-muted-foreground">
                  SAT's + DGSCI
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalArrecadado)}</div>
                <p className="text-xs text-muted-foreground">
                  Receita total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalDespesas)}</div>
                <p className="text-xs text-muted-foreground">
                  Gastos totais
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(controleSaldo.saldoAtual)}</div>
                <p className="text-xs text-muted-foreground">
                  Disponível
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Status das Autorizações
                </CardTitle>
                <CardDescription>Distribuição por status das operações SAT</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} dataKey="value">
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Tooltip formatter={(value: number) => [value, 'Quantidade']} />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparativo SAT's vs DGSCI
                </CardTitle>
                <CardDescription>Viagens, despesas e arrecadação</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                    <Legend />
                    <Bar dataKey="viagens" fill="#3b82f6" name="Viagens" />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                    <Bar dataKey="arrecadado" fill="#22c55e" name="Arrecadado" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Evolução do Saldo
              </CardTitle>
              <CardDescription>Projeção mensal do saldo disponível</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={saldoEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Saldo']} />
                  <Area type="monotone" dataKey="saldo" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gbm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autorizações das SAT's</CardTitle>
              <CardDescription>
                Controle de autorizações diárias e extras de todas as SAT's
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por protocolo, UBM, referência ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>UBM</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Qtd Efetivo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor Despesa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Autorização</TableHead>
                      <TableHead>Valor Arrecadado</TableHead>
                      <TableHead>Observação</TableHead>
                      {canManage && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGBM.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.protocoloPAE}</TableCell>
                        <TableCell>{item.gbm}</TableCell>
                        <TableCell>{item.referencia}</TableCell>
                        <TableCell>{item.destino}</TableCell>
                        <TableCell>{item.qtdEfetivo}</TableCell>
                        <TableCell>{item.periodo}</TableCell>
                        <TableCell>{item.valorDespesa > 0 ? formatCurrency(item.valorDespesa) : '-'}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{item.dataAutorizacao || '-'}</TableCell>
                        <TableCell>{item.valorArrecadado > 0 ? formatCurrency(item.valorArrecadado) : '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.observacao}</TableCell>
                        {canManage && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGBM(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dgsci" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autorizações DGSCI</CardTitle>
              <CardDescription>
                Controle de autorizações específicas da DGSCI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por protocolo, referência ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Referência/Nota de Serviço</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Qtd Efetivo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor Despesa</TableHead>
                      <TableHead>Valor Arrecadado</TableHead>
                      {canManage && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDGSCI.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.protocolo}</TableCell>
                        <TableCell>{item.referencia}</TableCell>
                        <TableCell>{item.destino}</TableCell>
                        <TableCell>{item.qtdEfetivo > 0 ? `${item.qtdEfetivo} pessoas` : '-'}</TableCell>
                        <TableCell>{item.periodo}</TableCell>
                        <TableCell>{formatCurrency(item.valorDespesa)}</TableCell>
                        <TableCell>{formatCurrency(item.valorArrecadado)}</TableCell>
                        {canManage && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDGSCI(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saldo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Controle de Saldo</CardTitle>
                  <CardDescription>Resumo financeiro atual - Informado em {controleSaldo.informadoEm}</CardDescription>
                </div>
                {canManage && (
                  <Button onClick={handleEditSaldo} variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Saldo
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-sm font-medium text-green-800 mb-1">Saldo DF</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(controleSaldo.saldoDF)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-sm font-medium text-blue-800 mb-1">Informado Em</div>
                    <div className="text-sm font-semibold text-blue-600">
                      {controleSaldo.informadoEm}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-sm font-medium text-red-800 mb-1">Total Despesa SAT</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(controleSaldo.despesaSAT)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <div className="text-sm font-medium text-orange-800 mb-1">Total Despesa DST/CAT</div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(controleSaldo.totalDespesaDGSCI)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg text-center border-2 border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-1">Saldo Atual</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(controleSaldo.saldoAtual)}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Análise Financeira</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert>
                          <DollarSign className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Status:</strong> O saldo atual representa {((controleSaldo.saldoAtual / controleSaldo.saldoDF) * 100).toFixed(1)}% do saldo inicial.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="mt-4 space-y-3">
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span>Utilização do Orçamento</span>
                              <span>{((1 - controleSaldo.saldoAtual / controleSaldo.saldoDF) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${((1 - controleSaldo.saldoAtual / controleSaldo.saldoDF) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="pt-2 text-sm text-muted-foreground">
                            <p>Total de despesas: {formatCurrency(controleSaldo.despesaSAT + controleSaldo.totalDespesaDGSCI)}</p>
                            <p>Situação: {controleSaldo.saldoAtual < 50000 ? 'Atenção necessária' : 'Situação controlada'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Distribuição de Gastos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <RechartsPie
                            data={[
                              { name: 'SAT', value: controleSaldo.despesaSAT, color: '#ef4444' },
                              { name: 'DGSCI', value: controleSaldo.totalDespesaDGSCI, color: '#f59e0b' },
                              { name: 'Disponível', value: controleSaldo.saldoAtual, color: '#22c55e' }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                          >
                            {[
                              { name: 'SAT', value: controleSaldo.despesaSAT, color: '#ef4444' },
                              { name: 'DGSCI', value: controleSaldo.totalDespesaDGSCI, color: '#f59e0b' },
                              { name: 'Disponível', value: controleSaldo.saldoAtual, color: '#22c55e' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                            <Legend />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para editar GBM */}
      <Dialog open={!!editingGBM} onOpenChange={() => setEditingGBM(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Autorização SAT</DialogTitle>
            <DialogDescription>
              Altere as informações da autorização conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingGBM && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocolo">Protocolo</Label>
                  <Input
                    id="protocolo"
                    value={editingGBM.protocoloPAE}
                    onChange={(e) => setEditingGBM({...editingGBM, protocoloPAE: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gbm">UBM</Label>
                  <Input
                    id="gbm"
                    value={editingGBM.gbm}
                    onChange={(e) => setEditingGBM({...editingGBM, gbm: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="referencia">Referência</Label>
                  <Input
                    id="referencia"
                    value={editingGBM.referencia}
                    onChange={(e) => setEditingGBM({...editingGBM, referencia: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="destino">Destino</Label>
                  <Input
                    id="destino"
                    value={editingGBM.destino}
                    onChange={(e) => setEditingGBM({...editingGBM, destino: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="qtdEfetivo">Qtd Efetivo</Label>
                  <Input
                    id="qtdEfetivo"
                    type="number"
                    value={editingGBM.qtdEfetivo}
                    onChange={(e) => setEditingGBM({...editingGBM, qtdEfetivo: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="periodo">Período</Label>
                  <Input
                    id="periodo"
                    value={editingGBM.periodo}
                    onChange={(e) => setEditingGBM({...editingGBM, periodo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="valorDespesa">Valor Despesa</Label>
                  <Input
                    id="valorDespesa"
                    type="number"
                    step="0.01"
                    value={editingGBM.valorDespesa}
                    onChange={(e) => setEditingGBM({...editingGBM, valorDespesa: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={editingGBM.status} 
                    onValueChange={(value) => setEditingGBM({...editingGBM, status: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Autorizado">Autorizado</SelectItem>
                      <SelectItem value="Não Autorizado">Não Autorizado</SelectItem>
                      <SelectItem value="GAB CMDO">GAB CMDO</SelectItem>
                      <SelectItem value="Correção SAT">Correção SAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dataAutorizacao">Data Autorização</Label>
                  <Input
                    id="dataAutorizacao"
                    value={editingGBM.dataAutorizacao}
                    onChange={(e) => setEditingGBM({...editingGBM, dataAutorizacao: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorArrecadado">Valor Arrecadado</Label>
                  <Input
                    id="valorArrecadado"
                    type="number"
                    step="0.01"
                    value={editingGBM.valorArrecadado}
                    onChange={(e) => setEditingGBM({...editingGBM, valorArrecadado: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={editingGBM.observacao}
                  onChange={(e) => setEditingGBM({...editingGBM, observacao: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGBM(null)}>
              Cancelar
            </Button>
            <Button onClick={saveGBMEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar DGSCI */}
      <Dialog open={!!editingDGSCI} onOpenChange={() => setEditingDGSCI(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Autorização DGSCI</DialogTitle>
            <DialogDescription>
              Altere as informações da autorização DGSCI conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingDGSCI && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocolo">Protocolo</Label>
                  <Input
                    id="protocolo"
                    value={editingDGSCI.protocolo}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, protocolo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Referência/Nota de Serviço</Label>
                  <Input
                    id="referencia"
                    value={editingDGSCI.referencia}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, referencia: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="destino">Destino</Label>
                <Input
                  id="destino"
                  value={editingDGSCI.destino}
                  onChange={(e) => setEditingDGSCI({...editingDGSCI, destino: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="qtdEfetivo">Qtd Efetivo</Label>
                  <Input
                    id="qtdEfetivo"
                    type="number"
                    value={editingDGSCI.qtdEfetivo}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, qtdEfetivo: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="periodo">Período</Label>
                  <Input
                    id="periodo"
                    value={editingDGSCI.periodo}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, periodo: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorDespesa">Valor Despesa</Label>
                  <Input
                    id="valorDespesa"
                    type="number"
                    step="0.01"
                    value={editingDGSCI.valorDespesa}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, valorDespesa: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="valorArrecadado">Valor Arrecadado</Label>
                  <Input
                    id="valorArrecadado"
                    type="number"
                    step="0.01"
                    value={editingDGSCI.valorArrecadado}
                    onChange={(e) => setEditingDGSCI({...editingDGSCI, valorArrecadado: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDGSCI(null)}>
              Cancelar
            </Button>
            <Button onClick={saveDGSCIEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar saldo */}
      <Dialog open={!!editingSaldo} onOpenChange={() => setEditingSaldo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Controle de Saldo</DialogTitle>
            <DialogDescription>
              Atualize as informações financeiras do controle de saldo.
            </DialogDescription>
          </DialogHeader>
          {editingSaldo && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="saldoDF">Saldo DF</Label>
                <Input
                  id="saldoDF"
                  type="number"
                  step="0.01"
                  value={editingSaldo.saldoDF}
                  onChange={(e) => setEditingSaldo({...editingSaldo, saldoDF: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="informadoEm">Informado Em</Label>
                <Input
                  id="informadoEm"
                  value={editingSaldo.informadoEm}
                  onChange={(e) => setEditingSaldo({...editingSaldo, informadoEm: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="despesaSAT">Despesa SAT</Label>
                <Input
                  id="despesaSAT"
                  type="number"
                  step="0.01"
                  value={editingSaldo.despesaSAT}
                  onChange={(e) => setEditingSaldo({...editingSaldo, despesaSAT: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="totalDespesaDGSCI">Total Despesa DGSCI</Label>
                <Input
                  id="totalDespesaDGSCI"
                  type="number"
                  step="0.01"
                  value={editingSaldo.totalDespesaDGSCI}
                  onChange={(e) => setEditingSaldo({...editingSaldo, totalDespesaDGSCI: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="saldoAtual">Saldo Atual</Label>
                <Input
                  id="saldoAtual"
                  type="number"
                  step="0.01"
                  value={editingSaldo.saldoAtual}
                  onChange={(e) => setEditingSaldo({...editingSaldo, saldoAtual: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSaldo(null)}>
              Cancelar
            </Button>
            <Button onClick={saveSaldoEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Autorizacoes;