import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, FileText, AlertTriangle, Zap } from 'lucide-react';

const AjudaVistoriador: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');

  const filters = [
    { id: 'todos', label: 'Todos', count: 156 },
    { id: 'grupo-f6', label: 'Grupo F6', count: 23 },
    { id: 'hidrantes', label: 'Hidrantes', count: 34 },
    { id: 'taacb', label: 'TAACB', count: 18 },
    { id: 'deteccao', label: 'Detecção', count: 29 },
    { id: 'sprinkler', label: 'Sprinkler', count: 15 },
    { id: 'estrutural', label: 'Estrutural', count: 37 }
  ];

  const searchResults = [
    {
      id: 1,
      titulo: "Instalação de Hidrantes - Edificações Grupo F6",
      categoria: "Hidrantes",
      resumo: "Orientações para instalação e verificação de sistemas de hidrantes em estabelecimentos de saúde e similares.",
      tags: ["F6", "Hidrantes", "Instalação"],
      documento: "IT-08/2023"
    },
    {
      id: 2,
      titulo: "Sistema de Detecção e Alarme - Critérios Técnicos",
      categoria: "Detecção",
      resumo: "Especificações técnicas para sistemas de detecção automática de incêndio conforme NBR 17240.",
      tags: ["Detecção", "Alarme", "NBR 17240"],
      documento: "IT-12/2023"
    },
    {
      id: 3,
      titulo: "Termo de Ajustamento de Conduta - TAACB",
      categoria: "TAACB",
      resumo: "Procedimentos para elaboração e acompanhamento de Termos de Ajustamento de Conduta.",
      tags: ["TAACB", "Procedimento", "Documentação"],
      documento: "PROC-05/2023"
    },
    {
      id: 4,
      titulo: "Verificação de Saídas de Emergência",
      categoria: "Estrutural",
      resumo: "Lista de verificação para saídas de emergência em edificações comerciais e industriais.",
      tags: ["Saídas", "Emergência", "Verificação"],
      documento: "CHECK-02/2023"
    },
    {
      id: 5,
      titulo: "Sistema Sprinkler - Manutenção Preventiva",
      categoria: "Sprinkler",
      resumo: "Orientações para verificação da manutenção preventiva de sistemas de sprinklers.",
      tags: ["Sprinkler", "Manutenção", "Preventiva"],
      documento: "IT-15/2023"
    }
  ];

  const filteredResults = searchResults.filter(result => {
    const matchesSearch = result.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'todos' || 
                         result.categoria.toLowerCase().includes(selectedFilter.replace('-', ' '));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header de Pesquisa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Pesquisa Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite sua dúvida ou termo de pesquisa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={selectedFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter.id)}
                  className="gap-2"
                >
                  <Filter className="h-3 w-3" />
                  {filter.label} ({filter.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Pesquisa */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Resultados da Pesquisa ({filteredResults.length})
          </h2>
          {searchTerm && (
            <p className="text-sm text-muted-foreground">
              Resultados para: "{searchTerm}"
            </p>
          )}
        </div>

        {filteredResults.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os termos de pesquisa ou filtros selecionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-2 text-foreground">
                        {result.titulo}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        {result.resumo}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {result.documento}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {result.categoria}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 space-y-2">
                      <Button size="sm">
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        Baixar PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AjudaVistoriador;