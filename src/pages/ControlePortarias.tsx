import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Eye, Download, Edit, Trash2, FileText, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Portaria {
  id: string;
  numero: string;
  bg: string;
  assunto: string;
  conclusao: string;
  arquivo?: string;
  dataPublicacao: string;
  ano: number;
}

export default function ControlePortarias() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.profile === 'Subdiretoria' || user?.profile === 'Diretoria';

  const [portarias, setPortarias] = useState<Portaria[]>([
    {
      id: '1',
      numero: '162/2021',
      bg: '',
      assunto: 'Normatiza os procedimentos para elaboração, formatação e publicação de portarias',
      conclusao: 'Considerando a necessidade de normalizar os procedimentos para elaboração, formatação e publicação de portarias no âmbito do Corpo de Bombeiros do Estado do Pará',
      arquivo: 'https://drive.google.com/drive/folders/1onjC0L9wlYZfKbSguDf9S8mlY25rUUS112pq=sharing',
      dataPublicacao: '10/08/2021',
      ano: 2021
    },
    {
      id: '2',
      numero: '058/2025',
      bg: '24/2025',
      assunto: 'Aprova a Instrução Técnica 12 - Instruções Técnicas Específicas, Parte IV',
      conclusao: 'Considerando o teor do art. 130 do Decreto Estadual nº 2.247, de 23 de março de 2022',
      arquivo: 'https://drive.google.com/drive/folders/1u1lzb2NEqvR8dcYURKFo8BN8Mm5glQ?usp=sharing',
      dataPublicacao: '11/02/2025',
      ano: 2025
    },
    {
      id: '3',
      numero: '113/2025',
      bg: '54/2025',
      assunto: 'Necessidade de indicação de militares para compor as Comissões Técnicas de Segurança Contra Incêndio e Emergência',
      conclusao: 'As Comissões atuarão nos municípios de abrangência de suas respectivas Seções de Atividades Técnicas (SAT)',
      arquivo: 'https://drive.google.com/drive/folders/1gLPJSbh7ZDOU190KOMuMJG4FqCZ_Y_0?usp=sharing',
      dataPublicacao: '20/03/2025',
      ano: 2025
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPortaria, setEditingPortaria] = useState<Portaria | null>(null);
  const [formData, setFormData] = useState({
    numero: '',
    bg: '',
    assunto: '',
    conclusao: '',
    arquivo: '',
    dataPublicacao: '',
    ano: new Date().getFullYear()
  });

  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const availableYears = Array.from(new Set(portarias.map(p => p.ano))).sort((a, b) => b - a);

  const filteredPortarias = portarias.filter(p => p.ano === filterYear);

  const handleSubmit = () => {
    if (!formData.numero || !formData.assunto || !formData.conclusao) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const portariaData: Portaria = {
      id: editingPortaria?.id || Date.now().toString(),
      numero: formData.numero,
      bg: formData.bg,
      assunto: formData.assunto,
      conclusao: formData.conclusao,
      arquivo: formData.arquivo,
      dataPublicacao: formData.dataPublicacao,
      ano: formData.ano
    };

    if (editingPortaria) {
      setPortarias(prev => prev.map(p => p.id === editingPortaria.id ? portariaData : p));
      toast({
        title: "Sucesso",
        description: "Portaria atualizada com sucesso"
      });
    } else {
      setPortarias(prev => [...prev, portariaData]);
      toast({
        title: "Sucesso",
        description: "Portaria adicionada com sucesso"
      });
    }

    resetForm();
  };

  const handleEdit = (portaria: Portaria) => {
    setEditingPortaria(portaria);
    setFormData({
      numero: portaria.numero,
      bg: portaria.bg,
      assunto: portaria.assunto,
      conclusao: portaria.conclusao,
      arquivo: portaria.arquivo || '',
      dataPublicacao: portaria.dataPublicacao,
      ano: portaria.ano
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPortarias(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Sucesso",
      description: "Portaria removida com sucesso"
    });
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      bg: '',
      assunto: '',
      conclusao: '',
      arquivo: '',
      dataPublicacao: '',
      ano: new Date().getFullYear()
    });
    setEditingPortaria(null);
    setIsDialogOpen(false);
  };

  const openLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Portarias</h1>
          <p className="text-muted-foreground">
            Gerencie e controle todas as portarias da subdiretoria
          </p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Portaria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPortaria ? 'Editar Portaria' : 'Nova Portaria'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações da portaria
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número da Portaria *</Label>
                    <Input
                      id="numero"
                      placeholder="Ex: 162/2021"
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bg">BG</Label>
                    <Input
                      id="bg"
                      placeholder="Ex: 24/2025"
                      value={formData.bg}
                      onChange={(e) => setFormData(prev => ({ ...prev, bg: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ano">Ano</Label>
                    <Input
                      id="ano"
                      type="number"
                      value={formData.ano}
                      onChange={(e) => setFormData(prev => ({ ...prev, ano: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto *</Label>
                  <Textarea
                    id="assunto"
                    placeholder="Descreva o assunto da portaria"
                    value={formData.assunto}
                    onChange={(e) => setFormData(prev => ({ ...prev, assunto: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conclusao">Conclusão *</Label>
                  <Textarea
                    id="conclusao"
                    placeholder="Descreva a conclusão ou considerações"
                    value={formData.conclusao}
                    onChange={(e) => setFormData(prev => ({ ...prev, conclusao: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="arquivo">Link do Arquivo (Google Drive)</Label>
                    <Input
                      id="arquivo"
                      placeholder="https://drive.google.com/..."
                      value={formData.arquivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, arquivo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataPublicacao">Data de Publicação</Label>
                    <Input
                      id="dataPublicacao"
                      type="date"
                      value={formData.dataPublicacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataPublicacao: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingPortaria ? 'Atualizar' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portarias {filterYear}</CardTitle>
              <CardDescription>
                Total de {filteredPortarias.length} portarias cadastradas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {availableYears.map(year => (
                <Button
                  key={year}
                  variant={filterYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portaria</TableHead>
                <TableHead>BG</TableHead>
                <TableHead className="max-w-md">Assunto</TableHead>
                <TableHead className="max-w-lg">Conclusão</TableHead>
                <TableHead>Data Publicação</TableHead>
                <TableHead>Arquivo</TableHead>
                {canEdit && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortarias.map((portaria) => (
                <TableRow key={portaria.id}>
                  <TableCell className="font-medium">
                    N° {portaria.numero}
                  </TableCell>
                  <TableCell>
                    {portaria.bg && (
                      <Badge variant="outline">
                        {portaria.bg}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={portaria.assunto}>
                      {portaria.assunto}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-lg">
                    <div className="truncate" title={portaria.conclusao}>
                      {portaria.conclusao}
                    </div>
                  </TableCell>
                  <TableCell>
                    {portaria.dataPublicacao && new Date(portaria.dataPublicacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {portaria.arquivo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(portaria.arquivo!)}
                      >
                        <Link className="h-4 w-4 mr-1" />
                        Drive
                      </Button>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(portaria)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(portaria.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredPortarias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma portaria encontrada para o ano {filterYear}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}