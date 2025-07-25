import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Download, Eye, Calendar, Clock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Parecer {
  id: number;
  numero: string;
  tipo: 'Parecer Técnico' | 'Parecer Jurídico' | 'Despacho';
  assunto: string;
  solicitante: string;
  responsavel: string;
  dataEmissao: string;
  status: 'Pendente' | 'Em Análise' | 'Concluído' | 'Arquivado';
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
}

interface Portaria {
  id: number;
  numero: string;
  ano: string;
  titulo: string;
  dataPublicacao: string;
  status: 'Vigente' | 'Revogada' | 'Suspensa';
  categoria: 'Nomeação' | 'Regulamentação' | 'Administrativa' | 'Operacional';
  responsavel: string;
  resumo: string;
}

const Pareceres: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const canEdit = user?.profile === 'Diretoria' || user?.profile === 'Subdiretoria' || user?.profile === 'ADM';

  const [pareceres] = useState<Parecer[]>([
    {
      id: 1,
      numero: 'PAR-001/2024',
      tipo: 'Parecer Técnico',
      assunto: 'Análise de Projeto - Centro Comercial Shopping Plaza',
      solicitante: 'Construtora ABC Ltda',
      responsavel: 'MAJ EDUARDO OLIVEIRA RIO BRANCO',
      dataEmissao: '15/01/2024',
      status: 'Concluído',
      prioridade: 'Alta'
    },
    {
      id: 2,
      numero: 'PAR-002/2024',
      tipo: 'Parecer Técnico',
      assunto: 'Vistoria de Segurança Contra Incêndio - Hospital Regional',
      solicitante: 'Hospital Regional PA',
      responsavel: 'CAP RONALDO FEIO DA COSTA',
      dataEmissao: '18/01/2024',
      status: 'Em Análise',
      prioridade: 'Urgente'
    },
    {
      id: 3,
      numero: 'PAR-003/2024',
      tipo: 'Despacho',
      assunto: 'Esclarecimentos sobre NSCI - Edificações Residenciais',
      solicitante: 'Prefeitura Municipal de Belém',
      responsavel: '1º TEN IARA FERREIRA SANTOS',
      dataEmissao: '20/01/2024',
      status: 'Pendente',
      prioridade: 'Média'
    },
    {
      id: 4,
      numero: 'PAR-004/2024',
      tipo: 'Parecer Jurídico',
      assunto: 'Análise de Recurso - Auto de Infração nº 2024001234',
      solicitante: 'Empresa XYZ S/A',
      responsavel: '2º TEN JOSÉ EDUARDO CARREIRA ARAUJO',
      dataEmissao: '22/01/2024',
      status: 'Em Análise',
      prioridade: 'Alta'
    },
    {
      id: 5,
      numero: 'PAR-005/2024',
      tipo: 'Parecer Técnico',
      assunto: 'Projeto de Sistema de Sprinklers - Indústria Metalúrgica',
      solicitante: 'Metalúrgica Paraense Ltda',
      responsavel: 'MAJ EDUARDO OLIVEIRA RIO BRANCO',
      dataEmissao: '25/01/2024',
      status: 'Concluído',
      prioridade: 'Média'
    }
  ]);

  const [portarias] = useState<Portaria[]>([
    {
      id: 1,
      numero: '001',
      ano: '2024',
      titulo: 'Portaria de Nomeação do Comandante Geral',
      dataPublicacao: '02/01/2024',
      status: 'Vigente',
      categoria: 'Nomeação',
      responsavel: 'Governo do Estado',
      resumo: 'Nomeia o CEL QOBM PABLO CRUZ DE OLIVEIRA para exercer o cargo de Comandante Geral do CBMPA.'
    },
    {
      id: 2,
      numero: '002',
      ano: '2024',
      titulo: 'Regulamentação do Sistema de Protocolo Digital',
      dataPublicacao: '05/01/2024',
      status: 'Vigente',
      categoria: 'Regulamentação',
      responsavel: 'Diretoria Geral',
      resumo: 'Estabelece normas para o sistema de protocolo digital e tramitação de documentos no CBMPA.'
    },
    {
      id: 3,
      numero: '003',
      ano: '2024',
      titulo: 'Constituição da Comissão Técnica de Análise de Projetos',
      dataPublicacao: '08/01/2024',
      status: 'Vigente',
      categoria: 'Nomeação',
      responsavel: 'DGSCI',
      resumo: 'Constitui a Comissão Técnica responsável pela análise de projetos de segurança contra incêndio.'
    },
    {
      id: 4,
      numero: '004',
      ano: '2024',
      titulo: 'Normas para Escala de Serviço dos Vistoriadores',
      dataPublicacao: '10/01/2024',
      status: 'Vigente',
      categoria: 'Operacional',
      responsavel: 'DGSCI',
      resumo: 'Estabelece as normas para elaboração da escala mensal de serviço dos vistoriadores.'
    },
    {
      id: 5,
      numero: '005',
      ano: '2024',
      titulo: 'Regulamentação de Férias e Licenças',
      dataPublicacao: '12/01/2024',
      status: 'Vigente',
      categoria: 'Administrativa',
      responsavel: 'Diretoria de Pessoal',
      resumo: 'Regulamenta os procedimentos para solicitação e concessão de férias e licenças.'
    },
    {
      id: 6,
      numero: '015',
      ano: '2023',
      titulo: 'Normas de Segurança para Edificações Hospitalares',
      dataPublicacao: '15/12/2023',
      status: 'Revogada',
      categoria: 'Regulamentação',
      responsavel: 'DGSCI',
      resumo: 'Estabelecia normas específicas para segurança contra incêndio em edificações hospitalares.'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído':
      case 'Vigente':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Em Análise':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pendente':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Arquivado':
      case 'Revogada':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Suspensa':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Urgente':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Média':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixa':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Pareceres e Portarias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pareceres" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pareceres" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pareceres Técnicos
              </TabsTrigger>
              <TabsTrigger value="portarias" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Portarias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pareceres" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Pareceres e Despachos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerenciamento de pareceres técnicos, jurídicos e despachos administrativos
                  </p>
                </div>
                {canEdit && (
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Parecer
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pareceres.map((parecer) => (
                      <TableRow key={parecer.id}>
                        <TableCell className="font-medium">{parecer.numero}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{parecer.tipo}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium text-sm">{parecer.assunto}</p>
                            <p className="text-xs text-muted-foreground">
                              Solicitante: {parecer.solicitante}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{parecer.responsavel}</TableCell>
                        <TableCell className="text-sm">{parecer.dataEmissao}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(parecer.status)}>
                            {parecer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPrioridadeColor(parecer.prioridade)}>
                            {parecer.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="portarias" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Portarias e Regulamentações</h3>
                  <p className="text-sm text-muted-foreground">
                    Arquivo de portarias institucionais e regulamentações vigentes
                  </p>
                </div>
                {canEdit && (
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Portaria
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {portarias.filter(p => p.status === 'Vigente').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Portarias Vigentes</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {portarias.filter(p => p.ano === '2024').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Portarias de 2024</p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-orange-600">
                          {portarias.filter(p => p.categoria === 'Nomeação').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Nomeações</p>
                      </div>
                      <User className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Portaria</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data Publicação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portarias.map((portaria) => (
                      <TableRow key={portaria.id}>
                        <TableCell className="font-medium">
                          {portaria.numero}/{portaria.ano}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium text-sm">{portaria.titulo}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {portaria.resumo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{portaria.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{portaria.dataPublicacao}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(portaria.status)}>
                            {portaria.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{portaria.responsavel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pareceres;