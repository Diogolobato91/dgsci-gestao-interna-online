import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SATData {
  id: string;
  gbm: string;
  sat: string;
  municipios: string;
}

const initialSATData: SATData[] = [
  { id: '1', gbm: '1ºGBM', sat: 'PARAGOMINAS', municipios: 'Paragominas, Aurora do Pará, Dom Eliseu, Ipixuna do Pará, Ulianópolis.' },
  { id: '2', gbm: '2ºGBM', sat: 'CASTANHAL', municipios: 'Castanhal, Curuçá, Igarapé-Açu, Inhangapi, Magalhães Barata, Maracanã, Marapanim, São Domingos do Capim, São Francisco do Pará, Terra Alta, Vigia de Nazaré.' },
  { id: '3', gbm: '3ºGBM', sat: 'ANANINDEUA', municipios: 'Ananindeua.' },
  { id: '4', gbm: '4ºGBM', sat: 'SANTARÉM', municipios: 'Santarém, Alenquer, Almeirim, Belterra, Curuá, Faro, Juruti, Monte Alegre, Óbidos, Oriximiná, Prainha, Mojuí dos Campos, Terra Santa.' },
  { id: '5', gbm: '5ºGBM', sat: 'MARABÁ', municipios: 'Marabá, Abel Figueiredo, Bom Jesus do Tocantins, Brejo Grande do Araguaia, São Geraldo do Araguaia, São João do Araguaia, Rondon do Pará.' },
  { id: '6', gbm: '6ºGBM', sat: 'ACARAENA', municipios: 'Barcarena, Acará.' },
  { id: '7', gbm: '7ºGBM', sat: 'ITAITUBA', municipios: 'Itaituba, Aveiro, Jacareacanga, Novo Progresso, Placas, Rurópolis.' },
  { id: '8', gbm: '8ºGBM', sat: 'TUCURUÍ', municipios: 'Tucuruí, Pacajá, Breu Branco, Novo Repartimento, Portel.' },
  { id: '9', gbm: '9ºGBM', sat: 'ALTAMIRA', municipios: 'Altamira, Anapu, Brasil Novo, Medicilândia, Porto de Moz, Senador José Porfírio, Uruará, Vitória do Xingu, Belo Monte, Bom Jardim, Cachoeira da Serra.' },
  { id: '10', gbm: '10ºGBM', sat: 'REDENÇÃO', municipios: 'Redenção, Conceição do Araguaia, Cumaru do Norte, Floresta do Araguaia, Pau D\'arco, Santa Maria das Barreiras, Santana do Araguaia, Água Azul do Norte, Bannach, Ourilândia do Norte, Rio Maria, Sapucaia, São Félix do Xingu.' },
  { id: '11', gbm: '11ºGBM', sat: 'BREVES', municipios: 'Breves, Afuá, Anajás, Bagre, Chaves, Curralinho, Gurupá, Melgaço, Portel, Salvaterra, São Sebastião da Boa Vista.' },
  { id: '12', gbm: '12ºGBM', sat: 'SANTA IZABEL', municipios: 'Santa Izabel, Santo Antônio do Tauá, Bujarú, Concórdia do Pará, Tomé Açu.' },
  { id: '13', gbm: '13ºGBM', sat: 'SALINÓPOLIS', municipios: 'Salinópolis, Santarém Novo, São João de Pirabas.' },
  { id: '14', gbm: '14ºGBM', sat: 'TAILÂNDIA', municipios: 'Tailândia, Goianésia do Pará, Breu Branco, Moju, Mocajuba.' },
  { id: '15', gbm: '15ºGBM', sat: 'ABAETETUBA', municipios: 'Abaetetuba, Igarapé Miri.' },
  { id: '16', gbm: '16ºGBM', sat: 'CANAÃ DOS CARAJÁS', municipios: 'Canaã dos Carajás, Piçarra (SAT PARAUAPEBAS)' },
  { id: '17', gbm: '17ºGBM', sat: 'VIGIA', municipios: 'Colares, São Caetano de Odivelas, Vigia, São João da Ponta (SAT CASTANHAL).' },
  { id: '18', gbm: '18ºGBM', sat: 'SALVATERRA', municipios: 'Ponta de Pedras, Salva Terra, Santa Cruz do Arari, Soure, Cachoeira do Arari, Muaná (SAT ICOARACI)' },
  { id: '19', gbm: '19ºGBM', sat: 'CAPANEMA', municipios: 'Capanema, Capitão Poço, Garrafão do Norte, Ourém, Nova Esperança do Piriá, Cachoeira do Piriá, Bonito, Nova Timboteua, Peixe Boi, Primavera, Quatipuru, Santa Luzia do Pará.' },
  { id: '20', gbm: '20ºGBM', sat: 'MOSQUEIRO', municipios: 'Mosqueiro, Santo Bárbara.' },
  { id: '21', gbm: '21ºGBM', sat: 'COMÉRCIO', municipios: 'Cidade Velha, Campina, Comércio.' },
  { id: '22', gbm: '22ºGBM', sat: 'CAMETÁ', municipios: 'Cametá, Oeiras do Pará, Limoeiro do Ajuru, Mocajuba, Baião.' },
  { id: '23', gbm: '23ºGBM', sat: 'PARAUAPEBAS', municipios: 'Parauapebas, Curionópolis, Eldorado dos Carajás.' },
  { id: '24', gbm: '24ºGBM', sat: 'BRAGANÇA', municipios: 'Bragança, Tracuateua, Augusto Corrêa, Viseu.' },
  { id: '25', gbm: '25ºGBM', sat: 'MARITUBA', municipios: 'Marituba.' },
  { id: '26', gbm: '26ºGBM', sat: 'ICOARACI', municipios: 'Icoaraci, Outeiro.' },
  { id: '27', gbm: '27ºGBM', sat: 'SÃO MIGUEL DO GUAMÁ', municipios: 'São Miguel do Guamá, Santa Maria do Pará, Irituia, Mãe do Rio (SAT PARAGOMINAS)' },
  { id: '28', gbm: '28ºGBM', sat: 'GUAMÁ', municipios: 'PARAGOMINAS)' },
  { id: '29', gbm: '29ºGBM', sat: 'MOJU', municipios: 'Moju.' }
];

const SATRegionais: React.FC = () => {
  const [satData, setSatData] = useState<SATData[]>(initialSATData);
  const [editingItem, setEditingItem] = useState<SATData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SATData>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const canEdit = user?.profile === 'Diretoria' || user?.profile === 'Subdiretoria';

  const handleEdit = (item: SATData) => {
    if (!canEdit) {
      toast({
        title: "Acesso negado",
        description: "Apenas Diretoria e Subdiretoria podem editar.",
        variant: "destructive"
      });
      return;
    }
    
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.gbm || !formData.sat || !formData.municipios) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (editingItem) {
      setSatData(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...formData } as SATData
          : item
      ));
      toast({
        title: "Sucesso",
        description: "SAT atualizada com sucesso."
      });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">SAT's Regionais</CardTitle>
          <p className="text-muted-foreground">
            Superintendências de Ações Territoriais e seus municípios de atuação
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">GBM</TableHead>
                  <TableHead className="w-[200px]">SAT</TableHead>
                  <TableHead>Municípios e/ou Bairros</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {satData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.gbm}</TableCell>
                    <TableCell className="font-medium">{item.sat}</TableCell>
                    <TableCell className="text-sm">{item.municipios}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar SAT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gbm">GBM</Label>
                <Input
                  id="gbm"
                  value={formData.gbm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gbm: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sat">SAT</Label>
                <Input
                  id="sat"
                  value={formData.sat || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sat: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="municipios">Municípios e/ou Bairros</Label>
              <Textarea
                id="municipios"
                rows={4}
                value={formData.municipios || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, municipios: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SATRegionais;