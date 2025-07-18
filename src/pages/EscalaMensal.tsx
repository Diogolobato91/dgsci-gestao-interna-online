import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Users, Clock, Phone } from 'lucide-react';

const EscalaMensal: React.FC = () => {
  const [visualizacao, setVisualizacao] = useState<'semanal' | 'mensal'>('semanal');

  const diasSemana = [
    {
      dia: 'Segunda-feira',
      data: '14 de Janeiro',
      isToday: false,
      chefePlantao: { nome: 'Cap. Silva', whatsapp: '5591999999999' },
      peritoDia: { nome: 'Ten. Santos', whatsapp: '5591888888888' },
      auxiliar: { nome: 'Sd. Oliveira', whatsapp: '5591777777777' }
    },
    {
      dia: 'Terça-feira',
      data: '15 de Janeiro',
      isToday: true,
      chefePlantao: { nome: 'Maj. Costa', whatsapp: '5591666666666' },
      peritoDia: { nome: 'Ten. Lima', whatsapp: '5591555555555' },
      auxiliar: { nome: 'Cb. Ferreira', whatsapp: '5591444444444' }
    },
    {
      dia: 'Quarta-feira',
      data: '16 de Janeiro',
      isToday: false,
      chefePlantao: { nome: 'Cap. Rodrigues', whatsapp: '5591333333333' },
      peritoDia: { nome: 'Ten. Almeida', whatsapp: '5591222222222' },
      auxiliar: { nome: 'Sd. Pereira', whatsapp: '5591111111111' }
    },
    {
      dia: 'Quinta-feira',
      data: '17 de Janeiro',
      isToday: false,
      chefePlantao: { nome: 'Cap. Mendes', whatsapp: '5591987654321' },
      peritoDia: { nome: 'Ten. Carvalho', whatsapp: '5591123456789' },
      auxiliar: { nome: 'Cb. Moreira', whatsapp: '5591246813579' }
    },
    {
      dia: 'Sexta-feira',
      data: '18 de Janeiro',
      isToday: false,
      chefePlantao: { nome: 'Maj. Barbosa', whatsapp: '5591135792468' },
      peritoDia: { nome: 'Ten. Martins', whatsapp: '5591864297531' },
      auxiliar: { nome: 'Sd. Ribeiro', whatsapp: '5591975318642' }
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Button
                variant={visualizacao === 'semanal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('semanal')}
                size="sm"
                className="w-full sm:w-auto"
              >
                Visualização Semanal
              </Button>
              <Button
                variant={visualizacao === 'mensal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('mensal')}
                size="sm"
                className="w-full sm:w-auto"
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
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Chefe de Plantão</span>
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <p className="text-muted-foreground">{dia.chefePlantao.nome}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(`https://wa.me/${dia.chefePlantao.whatsapp}`, '_blank')}
                          className="ml-2"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Perito do Dia</span>
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <p className="text-muted-foreground">{dia.peritoDia.nome}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(`https://wa.me/${dia.peritoDia.whatsapp}`, '_blank')}
                          className="ml-2"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Auxiliar/Condutor</span>
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <p className="text-muted-foreground">{dia.auxiliar.nome}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(`https://wa.me/${dia.auxiliar.whatsapp}`, '_blank')}
                          className="ml-2"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Escala da Semana (JPG)
                </Button>
                <Button variant="outline" className="w-full sm:w-auto">
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