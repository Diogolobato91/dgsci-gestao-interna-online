import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Users, Clock } from 'lucide-react';

const EscalaMensal: React.FC = () => {
  const [visualizacao, setVisualizacao] = useState<'semanal' | 'mensal'>('semanal');

  const diasSemana = [
    {
      dia: 'Segunda-feira',
      data: '14 de Janeiro',
      isToday: false,
      chefePlantao: 'Cap. Silva',
      peritoDia: 'Ten. Santos',
      auxiliar: 'Sd. Oliveira'
    },
    {
      dia: 'Terça-feira',
      data: '15 de Janeiro',
      isToday: true,
      chefePlantao: 'Maj. Costa',
      peritoDia: 'Ten. Lima',
      auxiliar: 'Cb. Ferreira'
    },
    {
      dia: 'Quarta-feira',
      data: '16 de Janeiro',
      isToday: false,
      chefePlantao: 'Cap. Rodrigues',
      peritoDia: 'Ten. Almeida',
      auxiliar: 'Sd. Pereira'
    },
    {
      dia: 'Quinta-feira',
      data: '17 de Janeiro',
      isToday: false,
      chefePlantao: 'Cap. Mendes',
      peritoDia: 'Ten. Carvalho',
      auxiliar: 'Cb. Moreira'
    },
    {
      dia: 'Sexta-feira',
      data: '18 de Janeiro',
      isToday: false,
      chefePlantao: 'Maj. Barbosa',
      peritoDia: 'Ten. Martins',
      auxiliar: 'Sd. Ribeiro'
    }
  ];

  const sobreaviso = [
    { nome: 'Cap. Araújo', funcao: 'Coordenador de Plantão' },
    { nome: 'Ten. Gomes', funcao: 'Perito de Sobreaviso' },
    { nome: 'Sgt. Teixeira', funcao: 'Apoio Operacional' }
  ];

  const calendarioMensal = Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    militares: ['Silva', 'Santos', 'Costa'].slice(0, Math.floor(Math.random() * 3) + 1),
    isToday: i + 1 === 15
  }));

  return (
    <div className="space-y-6">
      {/* Controles de Visualização */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Escala de Serviço
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={visualizacao === 'semanal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('semanal')}
                size="sm"
              >
                Visualização Semanal
              </Button>
              <Button
                variant={visualizacao === 'mensal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('mensal')}
                size="sm"
              >
                Visualização Mensal
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {visualizacao === 'semanal' ? (
        <>
          {/* Visualização Semanal */}
          <div className="grid grid-cols-1 gap-4">
            {diasSemana.map((dia, index) => (
              <Card key={index} className={dia.isToday ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {dia.dia}, {dia.data}
                      </h3>
                      {dia.isToday && (
                        <Badge className="bg-primary">Hoje</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        Baixar JPG
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Chefe de Plantão</span>
                      </div>
                      <p className="text-muted-foreground pl-6">{dia.chefePlantao}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">Perito do Dia</span>
                      </div>
                      <p className="text-muted-foreground pl-6">{dia.peritoDia}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Auxiliar/Condutor</span>
                      </div>
                      <p className="text-muted-foreground pl-6">{dia.auxiliar}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Seção de Sobreaviso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Sobreaviso da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sobreaviso.map((militar, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{militar.funcao}</Badge>
                    </div>
                    <p className="font-medium">{militar.nome}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações da Semana */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Escala da Semana (JPG)
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Escala do Dia (JPG)
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Visualização Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Janeiro 2024</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                  <div key={dia} className="p-2 text-center font-medium text-muted-foreground">
                    {dia}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarioMensal.map((dia) => (
                  <Card
                    key={dia.dia}
                    className={`min-h-[80px] ${dia.isToday ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-2">
                      <div className="font-medium text-sm mb-1">{dia.dia}</div>
                      <div className="space-y-1">
                        {dia.militares.map((militar, index) => (
                          <div key={index} className="text-xs text-muted-foreground truncate">
                            {militar}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações do Mês */}
          <Card>
            <CardContent className="p-6">
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Baixar Escala do Mês (JPG)
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EscalaMensal;