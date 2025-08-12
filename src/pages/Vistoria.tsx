import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit, Users, MessageSquare, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

interface Atendimento {
  id: number;
  dataAdicao: string;
  dataAtendimento: string;
  municipio: string;
  cnpjProtocolo: string;
  nomeSolicitante: string;
  telefone: string;
  servico: string;
  situacao: 'ATENDIDO' | 'PENDENTE';
  voluntario: string;
}

const Vistoria: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Lista de voluntários civis
  const voluntarios = [
    'DAVI SOUSA CARVALHO', 
    'DERIK MATHEUS FERREIRA DE ASSIS',
    'GABRIELA RODRIGUES MENDONÇA',
    'TAYNA DOS SANTOS MACHADO',
    'JHENNIFER CRISTINA DE QUEIROZ FERREIRA',
    'DANIELA CONCEIÇÃO DOS SANTOS',
    'ISADORA SOUZA MENDES',
    'DIOGO FERREIRA LOBATO',
    'EMMANUELLE GHISLANE SOUZA PIRES',
    'REBECA DE PAULA',
    'JAMILLY TAVARES ALVES DA SILVA GARCIA',
    'GLAUCE CARVALHO MOURÃO'
  ];

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([
    {
      id: 1,
      dataAdicao: '10/06/2025',
      dataAtendimento: '09/06/2025',
      municipio: 'CENTRO DE ATIVIDADES TÉCNICAS',
      cnpjProtocolo: '00.299.220/0001-05',
      nomeSolicitante: 'NÃO SE IDENTIFICOU',
      telefone: '94 8812-4523',
      servico: 'ALTERAÇÃO DE EMAIL E LOGIN',
      situacao: 'ATENDIDO',
      voluntario: 'DAVI SOUSA CARVALHO'
    },
    {
      id: 2,
      dataAdicao: '10/06/2025',
      dataAtendimento: '09/06/2025',
      municipio: 'CENTRO DE ATIVIDADES TÉCNICAS',
      cnpjProtocolo: '42.402.043/0001-43',
      nomeSolicitante: 'NÃO SE IDENTIFICOU',
      telefone: '94 9205-9573',
      servico: 'INFORMAÇÕES SOBRE SERVIÇO',
      situacao: 'PENDENTE',
      voluntario: 'GABRIELA RODRIGUES MENDONÇA'
    }
  ]);

  const [selectedVoluntario, setSelectedVoluntario] = useState(voluntarios[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | null>(null);
  
  const [formData, setFormData] = useState({
    dataAdicao: '',
    dataAtendimento: '',
    municipio: '',
    cnpjProtocolo: '',
    nomeSolicitante: '',
    telefone: '',
    servico: '',
    situacao: 'PENDENTE' as 'ATENDIDO' | 'PENDENTE'
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return [anoAtual - 1, anoAtual, anoAtual + 1];
  }, []);


  // Helpers de data
  const parseDateBr = (s: string) => {
    const [d, m, y] = s.split('/').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  };
  const formatDateBr = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const isInSelectedMonth = (s: string) => {
    const d = parseDateBr(s);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  };

  // Configuração de cores/labels para os gráficos
  const chartConfig = {
    atendidos: { label: 'Atendidos', color: 'hsl(var(--primary))' },
    pendentes: { label: 'Pendentes', color: 'hsl(var(--secondary))' },
    total: { label: 'Total', color: 'hsl(var(--accent))' },
  } as const;

  // Filtrar atendimentos por voluntário e mês
  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter(
      (a) => a.voluntario === selectedVoluntario && isInSelectedMonth(a.dataAtendimento)
    );
  }, [atendimentos, selectedVoluntario, selectedMonth, selectedYear]);

  // Estatísticas por voluntário no mês
  const estatisticasVoluntario = useMemo(() => {
    const atendidos = atendimentosFiltrados.filter(a => a.situacao === 'ATENDIDO').length;
    const pendentes = atendimentosFiltrados.filter(a => a.situacao === 'PENDENTE').length;
    return {
      total: atendimentosFiltrados.length,
      atendidos,
      pendentes
    };
  }, [atendimentosFiltrados]);

  // Dados para gráficos (reagem ao mês/voluntário)
  const dailyData = useMemo(() => {
    const totalDias = daysInMonth(selectedYear, selectedMonth);
    const base = Array.from({ length: totalDias }, (_, i) => ({
      day: String(i + 1).padStart(2, '0'),
      atendidos: 0,
      pendentes: 0,
      total: 0,
    }));
    atendimentosFiltrados.forEach((a) => {
      const d = parseDateBr(a.dataAtendimento).getDate() - 1;
      if (d >= 0 && d < base.length) {
        if (a.situacao === 'ATENDIDO') base[d].atendidos += 1;
        else base[d].pendentes += 1;
        base[d].total += 1;
      }
    });
    return base;
  }, [atendimentosFiltrados, selectedMonth, selectedYear]);

  const situacaoData = useMemo(() => {
    const atendidos = atendimentosFiltrados.filter(a => a.situacao === 'ATENDIDO').length;
    const pendentes = atendimentosFiltrados.filter(a => a.situacao === 'PENDENTE').length;
    return [
      { name: 'Atendidos', value: atendidos, key: 'atendidos' },
      { name: 'Pendentes', value: pendentes, key: 'pendentes' },
    ];
  }, [atendimentosFiltrados]);

  const handleEdit = (atendimento: Atendimento) => {
    setEditingAtendimento(atendimento);
    setFormData({
      dataAdicao: atendimento.dataAdicao,
      dataAtendimento: atendimento.dataAtendimento,
      municipio: atendimento.municipio,
      cnpjProtocolo: atendimento.cnpjProtocolo,
      nomeSolicitante: atendimento.nomeSolicitante,
      telefone: atendimento.telefone,
      servico: atendimento.servico,
      situacao: atendimento.situacao
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAtendimento(null);
    const hoje = new Date();
    const diaPreferido = Math.min(hoje.getDate(), daysInMonth(selectedYear, selectedMonth));
    const dataSelecionada = new Date(selectedYear, selectedMonth, diaPreferido);
    const dataBr = formatDateBr(dataSelecionada);
    
    setFormData({
      dataAdicao: dataBr,
      dataAtendimento: dataBr,
      municipio: '',
      cnpjProtocolo: '',
      nomeSolicitante: '',
      telefone: '',
      servico: '',
      situacao: 'PENDENTE'
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.nomeSolicitante || !formData.telefone || !formData.servico) {
      toast({
        title: "Erro",
        description: "Nome do solicitante, telefone e serviço são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingAtendimento) {
      setAtendimentos(atendimentos.map(a => 
        a.id === editingAtendimento.id 
          ? { ...a, ...formData, voluntario: selectedVoluntario }
          : a
      ));
      toast({
        title: "Sucesso",
        description: "Atendimento atualizado com sucesso"
      });
    } else {
      const newAtendimento: Atendimento = {
        id: Math.max(...atendimentos.map(a => a.id)) + 1,
        ...formData,
        voluntario: selectedVoluntario
      };
      setAtendimentos([...atendimentos, newAtendimento]);
      toast({
        title: "Sucesso",
        description: "Atendimento adicionado com sucesso"
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setAtendimentos(atendimentos.filter(a => a.id !== id));
    toast({
      title: "Sucesso",
      description: "Atendimento removido com sucesso"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6 text-primary" />
            Atendimento Online - Voluntários Civis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                      <p className="text-2xl font-bold">{estatisticasVoluntario.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atendidos</p>
                      <p className="text-2xl font-bold">{estatisticasVoluntario.atendidos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-2xl font-bold">{estatisticasVoluntario.pendentes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Seleção de Voluntário */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end justify-between">
              <div className="space-y-2">
                <Label htmlFor="voluntario">Selecionar Voluntário Civil</Label>
                <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario}>
                  <SelectTrigger className="w-full sm:w-[320px]">
                    <SelectValue placeholder="Selecione um voluntário" />
                  </SelectTrigger>
                  <SelectContent>
                    {voluntarios.map((voluntario) => (
                      <SelectItem key={voluntario} value={voluntario}>
                        {voluntario}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Selecionar Mês/Ano</Label>
                <div className="flex gap-2">
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m, idx) => (
                        <SelectItem key={m} value={String(idx)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAtendimento ? 'Editar Atendimento' : 'Adicionar Atendimento'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataAdicao">Data de Adição</Label>
                        <Input
                          id="dataAdicao"
                          value={formData.dataAdicao}
                          onChange={(e) => setFormData({ ...formData, dataAdicao: e.target.value })}
                          placeholder="dd/mm/aaaa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataAtendimento">Data do Atendimento</Label>
                        <Input
                          id="dataAtendimento"
                          value={formData.dataAtendimento}
                          onChange={(e) => setFormData({ ...formData, dataAtendimento: e.target.value })}
                          placeholder="dd/mm/aaaa"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="municipio">Município</Label>
                      <Input
                        id="municipio"
                        value={formData.municipio}
                        onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                        placeholder="Nome do município"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cnpjProtocolo">CNPJ/Protocolo</Label>
                      <Input
                        id="cnpjProtocolo"
                        value={formData.cnpjProtocolo}
                        onChange={(e) => setFormData({ ...formData, cnpjProtocolo: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nomeSolicitante">Nome do Solicitante/Estabelecimento</Label>
                      <Input
                        id="nomeSolicitante"
                        value={formData.nomeSolicitante}
                        onChange={(e) => setFormData({ ...formData, nomeSolicitante: e.target.value })}
                        placeholder="Nome completo ou razão social"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="servico">Serviço</Label>
                      <Input
                        id="servico"
                        value={formData.servico}
                        onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                        placeholder="Descrição do serviço solicitado"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="situacao">Situação</Label>
                      <Select value={formData.situacao} onValueChange={(value: 'ATENDIDO' | 'PENDENTE') => setFormData({ ...formData, situacao: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                          <SelectItem value="ATENDIDO">ATENDIDO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="lista" className="w-full">
              <TabsList>
                <TabsTrigger value="lista">Lista</TabsTrigger>
                <TabsTrigger value="graficos">Gráficos</TabsTrigger>
              </TabsList>

              <TabsContent value="lista">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Atendimentos de {selectedVoluntario}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {atendimentosFiltrados.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data Adição</TableHead>
                              <TableHead>Data Atendimento</TableHead>
                              <TableHead>Município</TableHead>
                              <TableHead>CNPJ/Protocolo</TableHead>
                              <TableHead>Nome Solicitante</TableHead>
                              <TableHead>Telefone</TableHead>
                              <TableHead>Serviço</TableHead>
                              <TableHead>Situação</TableHead>
                              <TableHead className="w-24">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {atendimentosFiltrados.map((atendimento) => (
                              <TableRow key={atendimento.id}>
                                <TableCell className="font-medium">{atendimento.dataAdicao}</TableCell>
                                <TableCell>{atendimento.dataAtendimento}</TableCell>
                                <TableCell>{atendimento.municipio}</TableCell>
                                <TableCell>{atendimento.cnpjProtocolo}</TableCell>
                                <TableCell>{atendimento.nomeSolicitante}</TableCell>
                                <TableCell>{atendimento.telefone}</TableCell>
                                <TableCell>{atendimento.servico}</TableCell>
                                <TableCell>
                                  <Badge variant={atendimento.situacao === 'ATENDIDO' ? 'default' : 'secondary'}>
                                    {atendimento.situacao}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(atendimento)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(atendimento.id)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum atendimento registrado</p>
                        <p className="text-sm mt-2">Adicione o primeiro atendimento para este voluntário</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="graficos">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Atendimentos por dia ({meses[selectedMonth]} / {selectedYear})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig}>
                        <ReBarChart data={dailyData}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="day" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="atendidos" fill="var(--color-atendidos)" stackId="a" />
                          <Bar dataKey="pendentes" fill="var(--color-pendentes)" stackId="a" />
                        </ReBarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo do mês ({meses[selectedMonth]} / {selectedYear})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig}>
                        <ReBarChart data={situacaoData}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="var(--color-total)" />
                        </ReBarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vistoria;