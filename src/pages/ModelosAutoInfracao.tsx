import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Download, Calendar, FileText } from 'lucide-react';

const ModelosAutoInfracao: React.FC = () => {
  const modelosAuto = [
    {
      id: 1,
      nome: 'Auto de Infração - Falta de AVCB',
      codigo: 'AI-001',
      categoria: 'AVCB',
      versao: 'v3.2',
      dataAtualizacao: '15/01/2024',
      descricao: 'Modelo para autuação por falta de AVCB válido',
      multa: 'R$ 532,00'
    },
    {
      id: 2,
      nome: 'Auto de Infração - Sistema de Detecção Inoperante',
      codigo: 'AI-002',
      categoria: 'Detecção',
      versao: 'v2.8',
      dataAtualizacao: '12/01/2024',
      descricao: 'Modelo para sistema de detecção e alarme inoperante',
      multa: 'R$ 1.064,00'
    },
    {
      id: 3,
      nome: 'Auto de Infração - Hidrantes sem Manutenção',
      codigo: 'AI-003',
      categoria: 'Hidrantes',
      versao: 'v2.5',
      dataAtualizacao: '10/01/2024',
      descricao: 'Modelo para falta de manutenção em sistemas de hidrantes',
      multa: 'R$ 798,00'
    },
    {
      id: 4,
      nome: 'Auto de Infração - Obstrução de Saídas',
      codigo: 'AI-004',
      categoria: 'Saídas',
      versao: 'v3.0',
      dataAtualizacao: '18/01/2024',
      descricao: 'Modelo para obstrução de saídas de emergência',
      multa: 'R$ 1.596,00'
    },
    {
      id: 5,
      nome: 'Auto de Infração - Iluminação de Emergência',
      codigo: 'AI-005',
      categoria: 'Iluminação',
      versao: 'v2.3',
      dataAtualizacao: '08/01/2024',
      descricao: 'Modelo para sistema de iluminação de emergência inoperante',
      multa: 'R$ 532,00'
    },
    {
      id: 6,
      nome: 'Auto de Infração - Sprinkler Inoperante',
      codigo: 'AI-006',
      categoria: 'Sprinkler',
      versao: 'v1.9',
      dataAtualizacao: '14/01/2024',
      descricao: 'Modelo para sistema sprinkler inoperante ou sem manutenção',
      multa: 'R$ 2.128,00'
    },
    {
      id: 7,
      nome: 'Auto de Infração - Extintores Vencidos',
      codigo: 'AI-007',
      categoria: 'Extintores',
      versao: 'v4.1',
      dataAtualizacao: '16/01/2024',
      descricao: 'Modelo para extintores com prazo de validade vencido',
      multa: 'R$ 266,00'
    },
    {
      id: 8,
      nome: 'Auto de Infração - Sinalização Inadequada',
      codigo: 'AI-008',
      categoria: 'Sinalização',
      versao: 'v2.7',
      dataAtualizacao: '11/01/2024',
      descricao: 'Modelo para sinalização de emergência inadequada',
      multa: 'R$ 399,00'
    }
  ];

  const getCategoryColor = (categoria: string) => {
    const colors = {
      'AVCB': 'bg-red-500',
      'Detecção': 'bg-purple-500',
      'Hidrantes': 'bg-blue-500',
      'Saídas': 'bg-orange-500',
      'Iluminação': 'bg-yellow-600',
      'Sprinkler': 'bg-green-500',
      'Extintores': 'bg-red-600',
      'Sinalização': 'bg-indigo-500'
    } as const;

    return colors[categoria as keyof typeof colors] || 'bg-gray-500';
  };

  const getMultaColor = (valor: string) => {
    const numerico = parseFloat(valor.replace('R$ ', '').replace('.', '').replace(',', '.'));
    if (numerico >= 1500) return 'text-red-600';
    if (numerico >= 800) return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Modelos de Auto de Infração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium">Modelos Disponíveis</p>
                <p className="text-2xl font-bold text-primary">{modelosAuto.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Última Atualização</p>
                <p className="text-sm text-muted-foreground">18/01/2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Download className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Formato</p>
                <p className="text-sm text-muted-foreground">PDF Editável</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Modelos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelosAuto.map((modelo) => (
          <Card key={modelo.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <Badge 
                  className={`${getCategoryColor(modelo.categoria)} text-white text-xs`}
                >
                  {modelo.categoria}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {modelo.codigo}
                </Badge>
              </div>
              <h3 className="font-medium text-base leading-tight">
                {modelo.nome}
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                {modelo.descricao}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Versão:</span>
                  <span className="font-medium">{modelo.versao}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor da Multa:</span>
                  <span className={`font-bold ${getMultaColor(modelo.multa)}`}>
                    {modelo.multa}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Atualização:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {modelo.dataAtualizacao}
                  </span>
                </div>
                
                <div className="pt-3 border-t space-y-2">
                  <Button className="w-full" size="sm">
                    <Download className="h-3 w-3 mr-2" />
                    Baixar Modelo
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <FileText className="h-3 w-3 mr-2" />
                    Visualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações sobre Multas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Tabela de Multas Vigente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-yellow-600">Infrações Leves</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Extintores vencidos: R$ 266,00</li>
                <li>• Sinalização inadequada: R$ 399,00</li>
                <li>• Iluminação de emergência: R$ 532,00</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-orange-600">Infrações Médias</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hidrantes sem manutenção: R$ 798,00</li>
                <li>• Sistema detecção inoperante: R$ 1.064,00</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-red-600">Infrações Graves</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Obstrução de saídas: R$ 1.596,00</li>
                <li>• Sprinkler inoperante: R$ 2.128,00</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações Importantes */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-primary mt-1" />
            <div>
              <h3 className="font-medium mb-2">Observações Importantes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Valores baseados no Código de Segurança Contra Incêndio vigente</li>
                <li>• Modelos já incluem fundamentação legal atualizada</li>
                <li>• Preencher todos os campos obrigatórios antes da impressão</li>
                <li>• Consultar coordenação em casos de dúvidas sobre aplicação</li>
                <li>• Manter cópia digital para controle interno</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelosAutoInfracao;