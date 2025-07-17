import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ClipboardList, Search, Plus, Eye, Edit, Calendar } from 'lucide-react';

const MinhasVistorias: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const vistorias = [
    {
      id: 1,
      dataHora: '15/01/2024 09:00',
      endereco: 'Rua das Flores, 123 - Centro',
      tipoVistoria: 'Vistoria Inicial',
      estabelecimento: 'Hospital São Lucas',
      status: 'Agendada',
      observacoes: 'Estabelecimento Grupo F6'
    },
    {
      id: 2,
      dataHora: '14/01/2024 14:30',
      endereco: 'Av. Presidente Vargas, 456 - Campina',
      tipoVistoria: 'Renovação AVCB',
      estabelecimento: 'Shopping Center Plaza',
      status: 'Concluída',
      observacoes: 'Renovação anual'
    },
    {
      id: 3,
      dataHora: '16/01/2024 10:15',
      endereco: 'Rua dos Comerciantes, 789 - Comércio',
      tipoVistoria: 'Vistoria Corretiva',
      estabelecimento: 'Indústria Metalúrgica ABC',
      status: 'Pendente',
      observacoes: 'Correção de não conformidades'
    },
    {
      id: 4,
      dataHora: '12/01/2024 15:45',
      endereco: 'Travessa Municipal, 321 - Nazaré',
      tipoVistoria: 'Vistoria de Eventos',
      estabelecimento: 'Centro de Convenções',
      status: 'Concluída',
      observacoes: 'Evento temporário'
    },
    {
      id: 5,
      dataHora: '17/01/2024 08:30',
      endereco: 'Av. Almirante Barroso, 567 - Marco',
      tipoVistoria: 'Vistoria Inicial',
      estabelecimento: 'Edifício Residencial Torres',
      status: 'Agendada',
      observacoes: 'Edifício com 20 pavimentos'
    },
    {
      id: 6,
      dataHora: '11/01/2024 16:00',
      endereco: 'Rua São Boaventura, 890 - Fátima',
      tipoVistoria: 'Renovação AVCB',
      estabelecimento: 'Escola Técnica Estadual',
      status: 'Concluída',
      observacoes: 'Estabelecimento de ensino'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      'Agendada': 'default',
      'Concluída': 'default',
      'Pendente': 'secondary'
    } as const;

    const colors = {
      'Agendada': 'bg-blue-500',
      'Concluída': 'bg-green-500', 
      'Pendente': 'bg-yellow-500'
    } as const;

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={`${colors[status as keyof typeof colors]} text-white`}
      >
        {status}
      </Badge>
    );
  };

  const filteredVistorias = vistorias.filter(vistoria =>
    vistoria.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vistoria.estabelecimento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vistoria.tipoVistoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Minhas Vistorias
            </CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Vistoria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por endereço, estabelecimento ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Filtrar por Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vistorias */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Estabelecimento</TableHead>
                <TableHead>Tipo de Vistoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVistorias.map((vistoria) => (
                <TableRow key={vistoria.id}>
                  <TableCell className="font-medium">
                    {vistoria.dataHora}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vistoria.endereco}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vistoria.estabelecimento}</p>
                      <p className="text-sm text-muted-foreground">{vistoria.observacoes}</p>
                    </div>
                  </TableCell>
                  <TableCell>{vistoria.tipoVistoria}</TableCell>
                  <TableCell>
                    {getStatusBadge(vistoria.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vistorias do Mês</p>
                <p className="text-2xl font-bold text-primary">15</p>
              </div>
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold text-blue-500">3</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">1</p>
              </div>
              <ClipboardList className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MinhasVistorias;