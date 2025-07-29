import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, FileText, Users, Calendar, TrendingUp, Cake, AlertCircle, Clock, User, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
const Dashboard: React.FC = () => {
  // Dados simulados dos servidores (mesmos dados do RelacaoEfetivo)
  const servidores = [
    { id: 1, postoGraduacao: 'CEL QOBM', nome: 'PABLO CRUZ DE OLIVEIRA', dataNascimento: '04/08/1977' },
    { id: 2, postoGraduacao: '1º CEL QOBM', nome: 'RAIMUNDO NONATO MOURA DA SILVA FILHO', dataNascimento: '19/08/1961' },
    { id: 3, postoGraduacao: 'MAJ QOBM', nome: 'EDUARDO OLIVEIRA RIO BRANCO', dataNascimento: '09/05/1980' },
    { id: 49, postoGraduacao: 'VC', nome: 'VALERIA RUANA PEREIRA DA COSTA', dataNascimento: '30/04/2001' },
    { id: 52, postoGraduacao: 'VC', nome: 'GABRIELA RODRIGUES MENDONÇA', dataNascimento: '11/07/2005' },
    { id: 43, postoGraduacao: 'CB', nome: 'NARDINY DIEGO SOUZA ALVES', dataNascimento: '24/05/1990' },
    { id: 17, postoGraduacao: '2º SGT', nome: 'CASSIO DIEGO NAZARENO OLIVEIRA DA SILVA', dataNascimento: '20/04/1984' },
    { id: 24, postoGraduacao: '3º SGT', nome: 'SANDRO GONÇALVES DO NASCIMENTO', dataNascimento: '24/04/1987' },
    { id: 53, postoGraduacao: 'VC', nome: 'TAYNA DOS SANTOS MACHADO', dataNascimento: '21/04/2005' },
  ];

  // Função para obter o próximo aniversariante
  const proximoAniversariante = useMemo(() => {
    const hoje = new Date();
    const proximosMeses = new Date();
    proximosMeses.setDate(hoje.getDate() + 60);
    
    const aniversariantes = servidores.filter(servidor => {
      if (!servidor.dataNascimento) return false;
      
      const [dia, mes] = servidor.dataNascimento.split('/').map(Number);
      const anoAtual = hoje.getFullYear();
      let aniversarioEsteAno = new Date(anoAtual, mes - 1, dia);
      
      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno = new Date(anoAtual + 1, mes - 1, dia);
      }
      
      return aniversarioEsteAno <= proximosMeses;
    }).map(servidor => {
      const [dia, mes] = servidor.dataNascimento!.split('/').map(Number);
      const anoAtual = hoje.getFullYear();
      let aniversarioEsteAno = new Date(anoAtual, mes - 1, dia);
      
      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno = new Date(anoAtual + 1, mes - 1, dia);
      }
      
      const diasRestantes = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...servidor,
        diasParaAniversario: diasRestantes
      };
    }).sort((a, b) => a.diasParaAniversario - b.diasParaAniversario);
    
    return aniversariantes[0] || null;
  }, [servidores]);
  const comunicados = [
    {
      id: 1,
      titulo: "Atualização Parecer Técnico - Sistemas de Alarme",
      data: "29/07/2024",
      tipo: "Parecer",
      prioridade: "Alta",
      novo: true,
      autor: "Comissão Técnica",
      resumo: "Nova diretriz para análise de sistemas de alarme em edificações comerciais"
    },
    {
      id: 2,
      titulo: "Mudança de Atuação - GBM Centro transferida para Bairro Novo",
      data: "28/07/2024",
      tipo: "Mudança Territorial",
      prioridade: "Média",
      novo: true,
      autor: "Subdiretoria",
      resumo: "A partir de 01/08/2024, GBM Centro atenderá região do Bairro Novo"
    },
    {
      id: 3,
      titulo: "Novo Modelo Padronizado - Laudo de Vistoria Simplificado",
      data: "27/07/2024",
      tipo: "Modelo Padronizado",
      prioridade: "Média",
      novo: false,
      autor: "DGSCI",
      resumo: "Disponível novo modelo para vistorias de baixa complexidade"
    },
    {
      id: 4,
      titulo: "Atualização Comissão Técnica - Procedimentos de Emergência",
      data: "26/07/2024",
      tipo: "Comissão Técnica",
      prioridade: "Alta",
      novo: false,
      autor: "Comissão Técnica",
      resumo: "Revisão dos protocolos de emergência em edificações públicas"
    },
    {
      id: 5,
      titulo: "Relatório Mensal de Atividades - Junho 2024",
      data: "25/07/2024",
      tipo: "Relatório",
      prioridade: "Baixa",
      novo: false,
      autor: "Diretoria",
      resumo: "Relatório consolidado das atividades de junho disponível para consulta"
    },
    {
      id: 6,
      titulo: "Nova Orientação - Ajuda Rápida ao Vistoriador",
      data: "24/07/2024",
      tipo: "Ajuda Vistoriador",
      prioridade: "Média",
      novo: false,
      autor: "Setor Técnico",
      resumo: "Adicionadas orientações sobre instalações elétricas em residências"
    }
  ];
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
                  {comunicados.filter(c => c.novo).length} novos
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comunicados.slice(0, 4).map(item => {
                const getPrioridadeColor = (prioridade: string) => {
                  switch (prioridade) {
                    case 'Alta': return 'border-l-red-500';
                    case 'Média': return 'border-l-amber-500';
                    case 'Baixa': return 'border-l-emerald-500';
                    default: return 'border-l-primary';
                  }
                };

                const getTipoIcon = (tipo: string) => {
                  switch (tipo) {
                    case 'Parecer': return FileText;
                    case 'Comissão Técnica': return Users;
                    case 'Relatório': return TrendingUp;
                    case 'Mudança Territorial': return AlertCircle;
                    case 'Modelo Padronizado': return FileText;
                    case 'Ajuda Vistoriador': return Users;
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
                                {item.novo && (
                                  <Badge variant="secondary" className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                    NOVO
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.resumo}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs font-normal">
                                {item.tipo}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.data}
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
                                  item.prioridade === 'Alta' 
                                    ? 'border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30' 
                                    : item.prioridade === 'Média' 
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
                    <h3 className="font-semibold text-sm sm:text-base truncate">{proximoAniversariante.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{proximoAniversariante.postoGraduacao}</Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {proximoAniversariante.dataNascimento}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {proximoAniversariante.diasParaAniversario === 1 ? 'Amanhã!' : `Em ${proximoAniversariante.diasParaAniversario} dias`}
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