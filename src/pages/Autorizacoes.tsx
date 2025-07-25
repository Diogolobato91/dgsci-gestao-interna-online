import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, BarChart3, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AutorizacaoGBM {
  id: number;
  protocoloPAE: string;
  gbm: string;
  referencia: string;
  destino: string;
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
  saldoDF: number;
  despesaSAT: number;
  totalDespesaDGSCI: number;
  saldoAtual: number;
}

const Autorizacoes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = user?.profile === 'Subdiretoria' || user?.profile === 'Diretoria' || user?.profile === 'ADM';

  const [autorizacoesGBM] = useState<AutorizacaoGBM[]>([
    {
      id: 1,
      protocoloPAE: 'PAE-2025-001',
      gbm: '1º GBM',
      referencia: 'OS 001/2025',
      destino: 'Belém - Centro',
      status: 'Autorizado',
      dataAutorizacao: '15/01/2025',
      valorArrecadado: 2500.00,
      observacao: 'Operação finalizada com sucesso'
    },
    {
      id: 2,
      protocoloPAE: 'PAE-2025-002',
      gbm: '2º GBM',
      referencia: 'NS 002/2025',
      destino: 'Ananindeua - Cidade Nova',
      status: 'GAB CMDO',
      dataAutorizacao: '16/01/2025',
      valorArrecadado: 0,
      observacao: 'Aguardando análise do Comando'
    },
    {
      id: 3,
      protocoloPAE: 'PAE-2025-003',
      gbm: '3º GBM',
      referencia: 'OS 003/2025',
      destino: 'Marituba - Centro',
      status: 'Correção SAT',
      dataAutorizacao: '',
      valorArrecadado: 0,
      observacao: 'Necessário correção nos dados da SAT'
    },
    {
      id: 4,
      protocoloPAE: 'PAE-2025-004',
      gbm: '4º GBM',
      referencia: 'NS 004/2025',
      destino: 'Benevides - São Francisco',
      status: 'Não Autorizado',
      dataAutorizacao: '17/01/2025',
      valorArrecadado: 0,
      observacao: 'Documentação incompleta'
    },
    {
      id: 5,
      protocoloPAE: 'PAE-2025-005',
      gbm: '5º GBM',
      referencia: 'OS 005/2025',
      destino: 'Castanhal - Centro',
      status: 'Autorizado',
      dataAutorizacao: '18/01/2025',
      valorArrecadado: 1800.00,
      observacao: 'Operação em andamento'
    }
  ]);

  const [autorizacoesDGSCI] = useState<AutorizacaoDGSCI[]>([
    {
      id: 1,
      protocolo: 'DGSCI-2025-001',
      referencia: 'NS 001/2025-DGSCI',
      destino: 'Santarém - Centro',
      qtdEfetivo: 4,
      periodo: '20/01 a 25/01/2025',
      valorDespesa: 3200.00,
      valorArrecadado: 5000.00
    },
    {
      id: 2,
      protocolo: 'DGSCI-2025-002',
      referencia: 'NS 002/2025-DGSCI',
      destino: 'Marabá - Nova Marabá',
      qtdEfetivo: 3,
      periodo: '22/01 a 26/01/2025',
      valorDespesa: 2800.00,
      valorArrecadado: 4200.00
    },
    {
      id: 3,
      protocolo: 'DGSCI-2025-003',
      referencia: 'NS 003/2025-DGSCI',
      destino: 'Altamira - Centro',
      qtdEfetivo: 2,
      periodo: '25/01 a 28/01/2025',
      valorDespesa: 2100.00,
      valorArrecadado: 3500.00
    }
  ]);

  const [controleSaldo] = useState<ControleSaldo>({
    saldoDF: 50000.00,
    despesaSAT: 8500.00,
    totalDespesaDGSCI: 8100.00,
    saldoAtual: 33400.00
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

  // Dashboard data
  const dashboardData = useMemo(() => {
    const totalViagensGBM = autorizacoesGBM.length;
    const totalViagensDGSCI = autorizacoesDGSCI.length;
    const totalArrecadadoGBM = autorizacoesGBM.reduce((sum, item) => sum + item.valorArrecadado, 0);
    const totalArrecadadoDGSCI = autorizacoesDGSCI.reduce((sum, item) => sum + item.valorArrecadado, 0);
    const totalDespesaDGSCI = autorizacoesDGSCI.reduce((sum, item) => sum + item.valorDespesa, 0);
    
    return {
      totalViagens: totalViagensGBM + totalViagensDGSCI,
      totalArrecadado: totalArrecadadoGBM + totalArrecadadoDGSCI,
      totalDespesas: totalDespesaDGSCI + controleSaldo.despesaSAT,
      autorizadas: autorizacoesGBM.filter(item => item.status === 'Autorizado').length
    };
  }, [autorizacoesGBM, autorizacoesDGSCI, controleSaldo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Autorizações</h1>
          <p className="text-muted-foreground">
            Gerenciamento de autorizações diárias e extras
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
          <TabsTrigger value="gbm">GBM's</TabsTrigger>
          <TabsTrigger value="dgsci">DGSCI</TabsTrigger>
          <TabsTrigger value="saldo">Controle de Saldo</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Viagens</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalViagens}</div>
                <p className="text-xs text-muted-foreground">
                  GBM's + DGSCI
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
                <CardTitle className="text-sm font-medium">Autorizadas</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.autorizadas}</div>
                <p className="text-xs text-muted-foreground">
                  Operações aprovadas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo por Unidade</CardTitle>
              <CardDescription>Quantidade de autorizações por GBM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(new Set(autorizacoesGBM.map(item => item.gbm))).map(gbm => {
                  const count = autorizacoesGBM.filter(item => item.gbm === gbm).length;
                  const arrecadado = autorizacoesGBM
                    .filter(item => item.gbm === gbm)
                    .reduce((sum, item) => sum + item.valorArrecadado, 0);
                  
                  return (
                    <div key={gbm} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{gbm}</span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{count} autorizações</span>
                        <span>{formatCurrency(arrecadado)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gbm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autorizações das GBM's</CardTitle>
              <CardDescription>
                Controle de autorizações diárias e extras de todas as Guarnições
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por protocolo, GBM, referência ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo PAE</TableHead>
                      <TableHead>GBM</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Autorização</TableHead>
                      <TableHead>Valor Arrecadado</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGBM.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.protocoloPAE}</TableCell>
                        <TableCell>{item.gbm}</TableCell>
                        <TableCell>{item.referencia}</TableCell>
                        <TableCell>{item.destino}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{item.dataAutorizacao || '-'}</TableCell>
                        <TableCell>{item.valorArrecadado > 0 ? formatCurrency(item.valorArrecadado) : '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.observacao}</TableCell>
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
                      <TableHead>Referência</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Qtd Efetivo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor Despesa</TableHead>
                      <TableHead>Valor Arrecadado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDGSCI.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.protocolo}</TableCell>
                        <TableCell>{item.referencia}</TableCell>
                        <TableCell>{item.destino}</TableCell>
                        <TableCell>{item.qtdEfetivo} pessoas</TableCell>
                        <TableCell>{item.periodo}</TableCell>
                        <TableCell>{formatCurrency(item.valorDespesa)}</TableCell>
                        <TableCell>{formatCurrency(item.valorArrecadado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saldo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Saldo</CardTitle>
                <CardDescription>Resumo financeiro atual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Saldo DF</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(controleSaldo.saldoDF)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Despesa SAT</span>
                  <span className="text-lg font-bold text-red-600">
                    -{formatCurrency(controleSaldo.despesaSAT)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Total Despesa DGSCI</span>
                  <span className="text-lg font-bold text-red-600">
                    -{formatCurrency(controleSaldo.totalDespesaDGSCI)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <span className="font-bold">Saldo Atual</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(controleSaldo.saldoAtual)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
                <CardDescription>Análise dos valores</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Status Financeiro:</strong> O saldo atual representa {((controleSaldo.saldoAtual / controleSaldo.saldoDF) * 100).toFixed(1)}% do saldo inicial.
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
                    <p>Economia necessária: {controleSaldo.saldoAtual < 10000 ? 'Alta prioridade' : 'Situação controlada'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Autorizacoes;