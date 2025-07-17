import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, FileText, Users, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const comunicados = [
    {
      id: 1,
      titulo: "Nova Instrução Técnica IT-01/2024",
      data: "15/01/2024",
      tipo: "Instrução Técnica"
    },
    {
      id: 2,
      titulo: "Atualização no Sistema de Vistorias",
      data: "12/01/2024",
      tipo: "Comunicado"
    },
    {
      id: 3,
      titulo: "Nota Técnica - Sistemas de Detecção",
      data: "10/01/2024",
      tipo: "Nota Técnica"
    },
    {
      id: 4,
      titulo: "Procedimentos para Análise de Projetos",
      data: "08/01/2024",
      tipo: "Procedimento"
    }
  ];

  const acessoRapido = [
    {
      titulo: "Modelos Padronizados",
      descricao: "Acesse documentos e modelos oficiais",
      icon: FileText,
      link: "/modelos-padronizados"
    },
    {
      titulo: "Ajuda ao Vistoriador",
      descricao: "Consulte orientações técnicas",
      icon: Users,
      link: "/ajuda-vistoriador"
    },
    {
      titulo: "Auto de Infração",
      descricao: "Modelos para autuação",
      icon: Calendar,
      link: "/modelos-auto-infracao"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comunicados e Notas Técnicas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Comunicados e Notas Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comunicados.map((item) => (
                <div key={item.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.titulo}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.tipo} • {item.data}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                Ver Todos os Comunicados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acesso Rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acessoRapido.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={index} to={item.link}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-primary mt-1" />
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{item.titulo}</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.descricao}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vistorias do Mês</p>
                <p className="text-2xl font-bold text-primary">247</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projetos Analisados</p>
                <p className="text-2xl font-bold text-primary">89</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Autos Lavrados</p>
                <p className="text-2xl font-bold text-primary">34</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendências</p>
                <p className="text-2xl font-bold text-destructive">12</p>
              </div>
              <Bell className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;