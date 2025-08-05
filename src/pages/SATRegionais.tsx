import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, Search, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface SATData {
  id: string;
  gbm: string;
  sat: string;
  municipios: string;
}

const initialSATData: SATData[] = [
  { id: '1', gbm: 'DGSCI', sat: 'DGSCI', municipios: 'Belém' },
  { id: '2', gbm: '2ºGBM', sat: 'CASTANHAL', municipios: 'Castanhal, Curuçá, Igarapé-Açu, Inhangapi, Magalhães Barata, Maracanã, Marapanim, São Domingos do Capim, São Francisco do Pará, Terra Alta, Vigia de Nazaré' },
  { id: '3', gbm: '3ºGBM', sat: 'ANANINDEUA', municipios: 'Ananindeua' },
  { id: '4', gbm: '4ºGBM', sat: 'SANTARÉM', municipios: 'Santarém, Alenquer, Almeirim, Belterra, Curuá, Faro, Juruti, Monte Alegre, Óbidos, Oriximiná, Prainha, Mojuí dos Campos, Terra Santa' },
  { id: '5', gbm: '5ºGBM', sat: 'MARABÁ', municipios: 'Marabá, Abel Figueiredo, Bom Jesus do Tocantins, Brejo Grande do Araguaia, Itupiranga, Nova Ipixuna, Palestina, São Domingos do Araguaia, São Geraldo do Araguaia, São João do Araguaia, Rondon do Pará' },
  { id: '6', gbm: '6ºGBM', sat: 'BARCARENA', municipios: 'Barcarena, Acará, Ponta de Pedras' },
  { id: '7', gbm: '7ºGBM', sat: 'ITAITUBA', municipios: 'Itaituba, Aveiro, Jacareacanga, Placas, Rurópolis, Trairão' },
  { id: '8', gbm: '8ºGBM', sat: 'TUCURUÍ', municipios: 'Tucuruí, Breu Branco, Novo Repartimento, Pacajá' },
  { id: '9', gbm: '9ºGBM', sat: 'ALTAMIRA', municipios: 'Altamira, Anapu, Brasil Novo, Medicilândia, Porto de Moz, Senador José Porfírio, Uruará, Vitória do Xingu, Belo Monte, Bom Jardim' },
  { id: '10', gbm: '10ºGBM', sat: 'REDENÇÃO', municipios: 'Redenção, Conceição do Araguaia, Cumaru do Norte, Floresta do Araguaia, Pau D\'Arco, Santa Maria das Barreiras, Santana do Araguaia' },
  { id: '11', gbm: '11ºGBM', sat: 'BREVES', municipios: 'Breves, Afuá, Anajás, Bagre, Chaves, Curralinho, Gurupá, Melgaço, Portel' },
  { id: '12', gbm: '12ºGBM', sat: 'SANTA IZABEL', municipios: 'Santa Isabel do Pará, Santo Antônio do Tauá, Bujarú' },
  { id: '13', gbm: '13ºGBM', sat: 'SALINÓPOLIS', municipios: 'Salinópolis, Santarém Novo, São João de Pirabas' },
  { id: '14', gbm: '14ºGBM', sat: 'TAILÂNDIA', municipios: 'Tailândia, Goianésia do Pará, Jacundá' },
  { id: '15', gbm: '15ºGBM', sat: 'ABAETETUBA', municipios: 'Abaetetuba, Igarapé-Miri, Muaná, São Sebastião da Boa Vista' },
  { id: '16', gbm: '16ºGBM', sat: 'CANAÃ DOS CARAJÁS', municipios: 'Canaã dos Carajás, Piçarra, Sapucaia, Xinguara, Água Azul do Norte' },
  { id: '17', gbm: '17ºGBM', sat: 'VIGIA', municipios: 'Vigia, Colares, São Caetano de Odivelas, São João da Ponta' },
  { id: '18', gbm: '18ºGBM', sat: 'SALVATERRA', municipios: 'Salvaterra, Santa Cruz do Arari, Soure, Cachoeira do Arari' },
  { id: '19', gbm: '19ºGBM', sat: 'CAPANEMA', municipios: 'Capanema, Capitão Poço, Garrafão do Norte, Ourém, Nova Esperança do Piriá, Cachoeira do Piriá, Bonito, Nova Timboteua, Peixe-Boi, Primavera, Quatipuru, Santa Luzia do Pará' },
  { id: '20', gbm: '20ºGBM', sat: 'MOSQUEIRO', municipios: 'Mosqueiro, Santa Bárbara do Pará' },
  { id: '21', gbm: '21ºGBM', sat: 'COMÉRCIO', municipios: 'Cidade Velha, Campina, Comércio' },
  { id: '22', gbm: '22ºGBM', sat: 'CAMETÁ', municipios: 'Cametá, Oeiras do Pará, Limoeiro do Ajuru, Mocajuba, Baião' },
  { id: '23', gbm: '23ºGBM', sat: 'PARAUAPEBAS', municipios: 'Parauapebas, Curionópolis, Eldorado dos Carajás' },
  { id: '24', gbm: '24ºGBM', sat: 'BRAGANÇA', municipios: 'Bragança, Tracuateua, Augusto Corrêa, Viseu' },
  { id: '25', gbm: '25ºGBM', sat: 'MARITUBA', municipios: 'Marituba, Benevides, Benfica, Murinim' },
  { id: '26', gbm: '26ºGBM', sat: 'ICOARACI', municipios: 'Icoaraci, São Clemente, Tapanã, Agulha, Campina, Cruzeiro, Maracacuera, Paracuri, Ponta Grossa, Águas negras, Parque guajará, Tenone, Água Boa, Brasília, Itateuá, São João do Outeiro, Pratinha' },
  { id: '27', gbm: '27ºGBM', sat: 'SÃO MIGUEL DO GUAMÁ', municipios: 'São Miguel do Guamá, Santa Maria do Pará, Irituia, Mãe do Rio, Concórdia do Pará, São Domingos do Capim, Aurora do Pará' },
  { id: '28', gbm: '28ºGBM', sat: 'MOJU', municipios: 'Moju, Tomé-Açu' },
  { id: '29', gbm: '29ºGBM', sat: 'SÃO FÉLIX DO XINGU', municipios: 'São Félix do Xingu, Tucumã, Ourilândia do Norte, Rio Maria, Bannach' },
  { id: '30', gbm: '30ºGBM', sat: 'NOVO PROGRESSO', municipios: 'Novo Progresso, Castelo dos Sonhos, Cachoeira da Serra, Bela Vista do Caracol, Moraes Almeida' },
  { id: '31', gbm: '1ºGPA', sat: 'PARAGOMINAS', municipios: 'Paragominas, Dom Eliseu, Ipixuna do Pará, Ulianópolis' }
];

const SATRegionais: React.FC = () => {
  const [satData, setSatData] = useState<SATData[]>(initialSATData);
  const [editingItem, setEditingItem] = useState<SATData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SATData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const canEdit = user?.profile === 'Diretoria' || user?.profile === 'Subdiretoria';

  const filteredSatData = useMemo(() => {
    if (!searchTerm.trim()) return satData;
    
    const searchLower = searchTerm.toLowerCase();
    return satData.filter(item => 
      item.gbm.toLowerCase().includes(searchLower) ||
      item.sat.toLowerCase().includes(searchLower) ||
      item.municipios.toLowerCase().includes(searchLower)
    );
  }, [satData, searchTerm]);

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

  const handleAdd = () => {
    if (!canEdit) {
      toast({
        title: "Acesso negado",
        description: "Apenas Diretoria e Subdiretoria podem adicionar.",
        variant: "destructive"
      });
      return;
    }
    
    setEditingItem(null);
    setFormData({});
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
    } else {
      const newId = (Math.max(...satData.map(item => parseInt(item.id))) + 1).toString();
      const newSAT: SATData = {
        id: newId,
        gbm: formData.gbm!,
        sat: formData.sat!,
        municipios: formData.municipios!
      };
      setSatData(prev => [...prev, newSAT]);
      toast({
        title: "Sucesso",
        description: "SAT adicionada com sucesso."
      });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleDownloadExcel = () => {
    // Criar array com todos os municípios
    const allMunicipios: { municipio: string; gbm: string; sat: string }[] = [];
    
    satData.forEach(item => {
      const municipios = item.municipios.split(',').map(m => m.trim()).filter(m => m.length > 0);
      municipios.forEach(municipio => {
        allMunicipios.push({
          municipio: municipio,
          gbm: item.gbm,
          sat: item.sat
        });
      });
    });

    // Ordenar alfabeticamente por município
    allMunicipios.sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));

    // Criar dados para o Excel com contador
    const excelData = allMunicipios.map((item, index) => ({
      'Nº': index + 1,
      'Município': item.municipio,
      'GBM': item.gbm,
      'CAT / SAT\'S': item.sat
    }));

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Definir larguras das colunas
    const colWidths = [
      { wch: 8 },  // Nº
      { wch: 35 }, // Município
      { wch: 15 }, // GBM
      { wch: 20 }  // CAT / SAT'S
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Municípios PA');

    // Gerar e baixar arquivo
    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(wb, `SAT_Regionais_Municipios_PA_${today}.xlsx`);

    toast({
      title: "Sucesso",
      description: `Excel baixado com ${allMunicipios.length} municípios ordenados alfabeticamente.`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">SAT's Regionais</CardTitle>
              <p className="text-muted-foreground">
                Superintendências de Ações Territoriais e seus municípios de atuação
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadExcel} variant="outline" className="shrink-0">
                <Download className="h-4 w-4 mr-2" />
                Baixar Excel
              </Button>
              {canEdit && (
                <Button onClick={handleAdd} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar SAT
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Pesquisar por GBM, SAT ou Município/Bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
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
                {filteredSatData.length > 0 ? (
                  filteredSatData.map((item) => (
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-8">
                      Nenhum resultado encontrado para "{searchTerm}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar SAT' : 'Adicionar SAT'}</DialogTitle>
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