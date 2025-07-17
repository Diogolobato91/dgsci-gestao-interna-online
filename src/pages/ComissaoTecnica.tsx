import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Users, Upload, Download, Calendar, CheckCircle, XCircle } from 'lucide-react';

const ComissaoTecnica: React.FC = () => {
  const membros = [
    {
      id: 1,
      nome: 'João Silva Santos',
      posto: 'Major',
      funcao: 'Presidente',
      validadePortaria: '31/12/2024',
      status: 'Ativo',
      dataInicio: '01/01/2024',
      portaria: '001/2024'
    },
    {
      id: 2,
      nome: 'Maria Oliveira Costa',
      posto: 'Capitão',
      funcao: 'Vice-Presidente',
      validadePortaria: '31/12/2024',
      status: 'Ativo',
      dataInicio: '01/01/2024',
      portaria: '002/2024'
    },
    {
      id: 3,
      nome: 'Pedro Almeida Lima',
      posto: 'Tenente',
      funcao: 'Membro',
      validadePortaria: '30/06/2024',
      status: 'Inativo',
      dataInicio: '01/01/2024',
      portaria: '003/2024'
    },
    {
      id: 4,
      nome: 'Ana Carolina Mendes',
      posto: 'Tenente',
      funcao: 'Membro',
      validadePortaria: '31/12/2024',
      status: 'Ativo',
      dataInicio: '15/02/2024',
      portaria: '015/2024'
    },
    {
      id: 5,
      nome: 'Carlos Eduardo Ferreira',
      posto: 'Sargento',
      funcao: 'Secretário',
      validadePortaria: '31/12/2024',
      status: 'Ativo',
      dataInicio: '01/01/2024',
      portaria: '004/2024'
    },
    {
      id: 6,
      nome: 'Lucia Helena Rodrigues',
      posto: 'Capitão',
      funcao: 'Membro',
      validadePortaria: '31/08/2024',
      status: 'Ativo',
      dataInicio: '01/03/2024',
      portaria: '025/2024'
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'Ativo') {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500 text-white">
        <XCircle className="h-3 w-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  const getFuncaoColor = (funcao: string) => {
    const colors = {
      'Presidente': 'bg-blue-600',
      'Vice-Presidente': 'bg-blue-500',
      'Membro': 'bg-gray-500',
      'Secretário': 'bg-purple-500'
    } as const;

    return colors[funcao as keyof typeof colors] || 'bg-gray-500';
  };

  const isValidadeProxima = (validade: string) => {
    const hoje = new Date();
    const dataValidade = new Date(validade.split('/').reverse().join('-'));
    const diffTime = dataValidade.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const membrosAtivos = membros.filter(m => m.status === 'Ativo').length;
  const membrosProximoVencimento = membros.filter(m => isValidadeProxima(m.validadePortaria)).length;

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
                <p className="text-2xl font-bold text-primary">{membros.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Membros Ativos</p>
                <p className="text-2xl font-bold text-green-500">{membrosAtivos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                <p className="text-2xl font-bold text-yellow-500">{membrosProximoVencimento}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles e Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestão da Comissão Técnica
            </CardTitle>
            <div className="flex gap-2">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Importar de Planilha
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Lista
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela de Membros */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Posto/Graduação</TableHead>
                <TableHead>Função na Comissão</TableHead>
                <TableHead>Portaria</TableHead>
                <TableHead>Validade da Portaria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membros.map((membro) => (
                <TableRow key={membro.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{membro.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Início: {membro.dataInicio}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {membro.posto}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${getFuncaoColor(membro.funcao)} text-white`}
                    >
                      {membro.funcao}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {membro.portaria}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={
                        isValidadeProxima(membro.validadePortaria) 
                          ? 'text-yellow-600 font-medium' 
                          : ''
                      }>
                        {membro.validadePortaria}
                      </span>
                      {isValidadeProxima(membro.validadePortaria) && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Próximo ao vencimento
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(membro.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm">
                        Ver Portaria
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Informações sobre Portarias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Informações sobre Portarias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Portarias Vigentes</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Portaria 001/2024 - Nomeação do Presidente</li>
                <li>• Portaria 002/2024 - Nomeação do Vice-Presidente</li>
                <li>• Portaria 004/2024 - Nomeação do Secretário</li>
                <li>• Portaria 015/2024 - Nomeação de Membro</li>
                <li>• Portaria 025/2024 - Nomeação de Membro</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Observações Importantes</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Portarias com vigência de 1 ano renovável</li>
                <li>• Alertas automáticos 30 dias antes do vencimento</li>
                <li>• Comissão deve ter no mínimo 3 membros ativos</li>
                <li>• Presidente e Vice devem ser oficiais</li>
                <li>• Renovação requer nova portaria</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComissaoTecnica;