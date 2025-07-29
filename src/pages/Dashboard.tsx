import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, FileText, Users, Calendar, TrendingUp, Cake } from 'lucide-react';
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
  const comunicados = [{
    id: 1,
    titulo: "Nova Instrução Técnica IT-01/2024",
    data: "15/01/2024",
    tipo: "Instrução Técnica"
  }, {
    id: 2,
    titulo: "Atualização no Sistema de Vistorias",
    data: "12/01/2024",
    tipo: "Comunicado"
  }, {
    id: 3,
    titulo: "Nota Técnica - Sistemas de Detecção",
    data: "10/01/2024",
    tipo: "Nota Técnica"
  }, {
    id: 4,
    titulo: "Procedimentos para Análise de Projetos",
    data: "08/01/2024",
    tipo: "Procedimento"
  }];
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
              {comunicados.map(item => <div key={item.id} className="border-l-4 border-primary pl-3 sm:pl-4 py-2">
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
                </div>)}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                Ver Todos os Comunicados
              </Button>
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