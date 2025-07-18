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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Comunicados e Notas Técnicas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Bell className="h-5 w-5 text-primary" />
              Comunicados e Notas Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {comunicados.map((item) => (
                <div key={item.id} className="border-l-4 border-primary pl-3 sm:pl-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{item.titulo}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {item.tipo} • {item.data}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs self-start sm:self-center">
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                Ver Todos os Comunicados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acesso Rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {acessoRapido.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={index} to={item.link}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-xs sm:text-sm truncate">{item.titulo}</h5>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Vistorias do Mês</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">247</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Projetos Analisados</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">89</p>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Autos Lavrados</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">34</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Pendências</p>
                <p className="text-lg sm:text-2xl font-bold text-destructive">12</p>
              </div>
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-destructive flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;