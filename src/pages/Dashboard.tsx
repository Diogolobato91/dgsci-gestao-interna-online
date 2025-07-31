import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, FileText, Users, Calendar, TrendingUp, Cake, AlertCircle, Clock, User, Eye, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const Dashboard: React.FC = () => {
  const { 
    comunicados, 
    proximoAniversariante, 
    indicadores, 
    totalMilitaresAtivos, 
    totalAutorizacoesEmitidas,
    currentDateTime 
  } = useData();
  const acessoRapido = [{
    titulo: "Modelos Padronizados",
    descricao: "Acesse documentos e modelos oficiais",
    icon: FileText,
    link: "/modelos-padronizados"
  }, {
    titulo: "Ajuda ao Vistoriador",
    descricao: "Consulte orientações técnicas",
    icon: Users,
    link: "/ajuda-vistoriador"
  }, {
    titulo: "Auto de Infração",
    descricao: "Modelos para autuação",
    icon: Calendar,
    link: "/modelos-auto-infracao"
  }];
  return <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Comunicados Oficiais */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg sm:text-xl">
                <Bell className="h-5 w-5 text-primary" />
                Comunicados Oficiais
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {comunicados.length} comunicados
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comunicados.slice(0, 4).map(item => {
                const getPrioridadeColor = (prioridade: string) => {
                  switch (prioridade) {
                    case 'alta': return 'border-l-red-500';
                    case 'media': return 'border-l-amber-500';
                    case 'baixa': return 'border-l-emerald-500';
                    default: return 'border-l-primary';
                  }
                };

                const getTipoIcon = (tipo: string) => {
                  switch (tipo) {
                    case 'informativo': return Bell;
                    case 'urgente': return AlertCircle;
                    case 'normal': return FileText;
                    default: return Bell;
                  }
                };

                const TipoIcon = getTipoIcon(item.tipo);

                return (
                  <div key={item.id} className={`bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 ${getPrioridadeColor(item.prioridade)} border-l-4`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <TipoIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-sm text-foreground leading-tight">
                                  {item.titulo}
                                </h4>
                                <Badge variant="secondary" className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  {item.tipo.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.resumo}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.autor}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={`text-xs font-medium ${
                                  item.prioridade === 'alta' 
                                    ? 'border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30' 
                                    : item.prioridade === 'media' 
                                    ? 'border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/30'
                                    : 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/30'
                                }`}
                              >
                                {item.prioridade}
                              </Badge>
                              <Button variant="ghost" size="sm" className="text-xs h-8 px-3 hover:bg-primary/10">
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-sm">
                  Ver Todos ({comunicados.length})
                </Button>
                <Button variant="default" size="sm" className="text-sm px-4">
                  + Novo
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                  <span>Alta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-amber-500 rounded"></div>
                  <span>Média</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded"></div>
                  <span>Baixa</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximo Aniversariante e Acesso Rápido */}
        <div className="space-y-4 lg:space-y-6">
          {/* Próximo Aniversariante */}
          {proximoAniversariante && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Cake className="h-5 w-5 text-primary" />
                  Próximo Aniversariante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Cake className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                      {proximoAniversariante.diasParaAniversario}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{proximoAniversariante.patente} {proximoAniversariante.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{proximoAniversariante.patente}</Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {proximoAniversariante.email}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {proximoAniversariante.diasParaAniversario === 0 ? 'Hoje!' : 
                       proximoAniversariante.diasParaAniversario === 1 ? 'Amanhã!' : 
                       `Em ${proximoAniversariante.diasParaAniversario} dias`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                return <Link key={index} to={item.link}>
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
                    </Link>;
              })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estatísticas Administrativas */}
      
    </div>;
};
export default Dashboard;