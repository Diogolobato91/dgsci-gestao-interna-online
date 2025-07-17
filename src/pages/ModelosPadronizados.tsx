import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar } from 'lucide-react';

const ModelosPadronizados: React.FC = () => {
  const documentos = [
    {
      id: 1,
      nome: 'Modelo de Relatório de Vistoria',
      tipo: 'Relatório',
      versao: 'v2.1',
      dataAtualizacao: '10/01/2024',
      categoria: 'Vistoria',
      descricao: 'Modelo padrão para elaboração de relatórios de vistoria técnica.'
    },
    {
      id: 2,
      nome: 'Checklist de Verificação - Sistemas de Detecção',
      tipo: 'Checklist',
      versao: 'v1.5',
      dataAtualizacao: '08/01/2024',
      categoria: 'Detecção',
      descricao: 'Lista de verificação para sistemas de detecção e alarme de incêndio.'
    },
    {
      id: 3,
      nome: 'Modelo de Parecer Técnico',
      tipo: 'Parecer',
      versao: 'v3.0',
      dataAtualizacao: '15/01/2024',
      categoria: 'Análise',
      descricao: 'Modelo para elaboração de pareceres técnicos de projetos.'
    },
    {
      id: 4,
      nome: 'Formulário de Vistoria - Grupo F6',
      tipo: 'Formulário',
      versao: 'v2.3',
      dataAtualizacao: '12/01/2024',
      categoria: 'Vistoria',
      descricao: 'Formulário específico para vistorias em estabelecimentos do Grupo F6.'
    },
    {
      id: 5,
      nome: 'Modelo de Ofício - Comunicação Externa',
      tipo: 'Ofício',
      versao: 'v1.8',
      dataAtualizacao: '05/01/2024',
      categoria: 'Administrativo',
      descricao: 'Modelo para elaboração de ofícios para comunicação externa.'
    },
    {
      id: 6,
      nome: 'Termo de Responsabilidade - Manutenção',
      tipo: 'Termo',
      versao: 'v2.0',
      dataAtualizacao: '18/01/2024',
      categoria: 'Manutenção',
      descricao: 'Termo de responsabilidade para manutenção de sistemas de segurança.'
    },
    {
      id: 7,
      nome: 'Relatório de Análise de Projeto',
      tipo: 'Relatório',
      versao: 'v2.5',
      dataAtualizacao: '14/01/2024',
      categoria: 'Análise',
      descricao: 'Modelo para relatórios de análise de projetos de segurança contra incêndio.'
    },
    {
      id: 8,
      nome: 'Checklist - Sistemas de Hidrantes',
      tipo: 'Checklist',
      versao: 'v1.7',
      dataAtualizacao: '11/01/2024',
      categoria: 'Hidrantes',
      descricao: 'Lista de verificação para sistemas de hidrantes e mangotinhos.'
    }
  ];

  const categorias = ['Todos', 'Vistoria', 'Análise', 'Detecção', 'Hidrantes', 'Administrativo', 'Manutenção'];

  const getCategoryColor = (categoria: string) => {
    const colors = {
      'Vistoria': 'bg-blue-500',
      'Análise': 'bg-green-500',
      'Detecção': 'bg-purple-500',
      'Hidrantes': 'bg-red-500',
      'Administrativo': 'bg-gray-500',
      'Manutenção': 'bg-yellow-600'
    } as const;

    return colors[categoria as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Modelos Padronizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Acesse e baixe os modelos oficiais de documentos do DGSCI. 
            Todos os documentos estão atualizados conforme as normas vigentes.
          </p>
        </CardContent>
      </Card>

      {/* Filtros por Categoria */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => (
              <Button
                key={categoria}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {categoria}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentos.map((doc) => (
          <Card key={doc.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-base mb-2 leading-tight">
                    {doc.nome}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      className={`${getCategoryColor(doc.categoria)} text-white text-xs`}
                    >
                      {doc.categoria}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {doc.tipo}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                {doc.descricao}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Versão:</span>
                  <span className="font-medium">{doc.versao}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Atualização:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {doc.dataAtualizacao}
                  </span>
                </div>
                
                <div className="pt-2 border-t">
                  <Button className="w-full" size="sm">
                    <Download className="h-3 w-3 mr-2" />
                    Baixar Documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações Adicionais */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <FileText className="h-5 w-5 text-primary mt-1" />
            <div>
              <h3 className="font-medium mb-2">Informações Importantes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Todos os documentos estão em formato PDF editável</li>
                <li>• Verifique sempre a versão mais recente antes de utilizar</li>
                <li>• Em caso de dúvidas, consulte a coordenação técnica</li>
                <li>• Documentos atualizados mensalmente conforme normativas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelosPadronizados;