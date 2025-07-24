import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Servidor {
  id: number;
  postoGraduacao: string;
  nome: string;
  mf?: string;
  cpf?: string;
  dataNascimento?: string;
}

const RelacaoEfetivo: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const canEdit = user?.profile === 'Diretoria' || user?.profile === 'Subdiretoria';

  const [servidores, setServidores] = useState<Servidor[]>([
    { id: 1, postoGraduacao: 'CEL QOBM', nome: 'PABLO CRUZ DE OLIVEIRA', mf: '58335231', cpf: '622.034.602-53', dataNascimento: '04/08/1977' },
    { id: 2, postoGraduacao: '1º CEL QOBM', nome: 'RAIMUNDO NONATO MOURA DA SILVA FILHO', mf: '57191260-1', cpf: '692.136.152-72', dataNascimento: '19/08/1961' },
    { id: 3, postoGraduacao: 'MAJ QOBM', nome: 'EDUARDO OLIVEIRA RIO BRANCO', mf: '54185213-1', cpf: '667.418.152-87', dataNascimento: '09/05/1980' },
    { id: 4, postoGraduacao: 'CAP QOABM', nome: 'RONALDO FEIO DA COSTA', mf: '52118754', cpf: '236.133.602-25', dataNascimento: '14/06/1967' },
    { id: 5, postoGraduacao: '1º TEN QOABM', nome: 'LUIS CLAUDIO PINTO DIAS', mf: '55088804', cpf: '393.106.982-68', dataNascimento: '30/05/1970' },
    { id: 6, postoGraduacao: '1º TEN QOBM', nome: 'IARA FERREIRA SANTOS', mf: '59325864', cpf: '393.966.412-34', dataNascimento: '01/06/1990' },
    { id: 7, postoGraduacao: '1º TEN QOBM', nome: 'ANA BEATRIZ MALHEIROS PIQUET SARGES', mf: '59326014', cpf: '012.525.162-90', dataNascimento: '30/05/1995' },
    { id: 8, postoGraduacao: '2º TEN QOABM', nome: 'JOSÉ EDUARDO CARREIRA ARAUJO', mf: '58269184', cpf: '711.670.802-20', dataNascimento: '25/11/1981' },
    { id: 9, postoGraduacao: '2º TEN QOABM', nome: 'DANIEL SILVA CORREA', mf: '54184998-1', cpf: '609.702.002-34', dataNascimento: '20/05/1979' },
    { id: 10, postoGraduacao: '2º TEN QOABM', nome: 'FABIO MAGALHÃES DE DEUS', mf: '54185062-1', cpf: '620.466.672-04', dataNascimento: '20/10/1976' },
    { id: 11, postoGraduacao: 'SUB TEN RR', nome: 'LUCIVALDO DOS REIS FERREIRA', mf: '55618053-1', cpf: '352.224.172-04', dataNascimento: '10/11/1968' },
    { id: 12, postoGraduacao: 'SUB TEN RR', nome: 'MARCO ANTONIO DA SILVA COSTA', mf: '33921122', cpf: '256.933.552-00', dataNascimento: '22/07/1967' },
    { id: 13, postoGraduacao: 'SUB TEN RR', nome: 'CARLOS ALBERTO CARDOSO DOS REIS', mf: '50375812', cpf: '190.000.572-72', dataNascimento: '30/10/1965' },
    { id: 14, postoGraduacao: 'SUB TEN RR', nome: 'JORGE EDUARDO LOBO DA SILVA', mf: '51632004', cpf: '298.578.212-00', dataNascimento: '20/05/1968' },
    { id: 15, postoGraduacao: '1º SGT', nome: 'LUIZ AUGUSTO SANTOS BAENA', mf: '56015334', cpf: '395.029.102-49', dataNascimento: '23/05/1969' },
    { id: 16, postoGraduacao: '1º SGT', nome: 'ICLANDO SARAIVA DAS CHAGAS', mf: '52103484', cpf: '333.067.102-53', dataNascimento: '28/10/1967' },
    { id: 17, postoGraduacao: '2º SGT', nome: 'CASSIO DIEGO NAZARENO OLIVEIRA DA SILVA', mf: '54185203-1', cpf: '776.927.802-34', dataNascimento: '20/04/1984' },
    { id: 18, postoGraduacao: '3º SGT', nome: 'LEONORA PENNA BAIA', mf: '57189325-1', cpf: '693.040.682-15', dataNascimento: '19/16/1981' },
    { id: 19, postoGraduacao: '3º SGT', nome: 'EBER BESSA JUNIOR', mf: '57173338-1', cpf: '664.974.312-00', dataNascimento: '09/08/1978' },
    { id: 20, postoGraduacao: '3º SGT', nome: 'CARLOS AUGUSTO DE LIMA SANTOS', mf: '57173423-1', cpf: '745.946.052-49', dataNascimento: '03/06/1983' },
    { id: 21, postoGraduacao: '3º SGT', nome: 'ADERSON MARTINS SOUZA', mf: '57173455-1', cpf: '675.455.722-20', dataNascimento: '02/09/1981' },
    { id: 22, postoGraduacao: '3º SGT', nome: 'GERSON TEIXEIRA DE OLIVEIRA', mf: '57173461-1', cpf: '820.098.052-91', dataNascimento: '02/11/1985' },
    { id: 23, postoGraduacao: '3º SGT', nome: 'JAIRO RODRIGO DA SILVA PEREIRA', mf: '57173670-1', cpf: '728.082.722-04', dataNascimento: '18/01/1983' },
    { id: 24, postoGraduacao: '3º SGT', nome: 'SANDRO GONÇALVES DO NASCIMENTO', mf: '57173906-1', cpf: '984.655.702-72', dataNascimento: '24/04/1987' },
    { id: 25, postoGraduacao: '3º SGT', nome: 'CLEBERSON PEREIRA DO NASCIMENTO', mf: '57174002-1', cpf: '612.988.912-72', dataNascimento: '28/01/1979' },
    { id: 26, postoGraduacao: '3º SGT', nome: 'VALDIR DE SOUZA PACHECO', mf: '54192536-2', cpf: '667.287.192-72', dataNascimento: '15/07/1979' },
    { id: 27, postoGraduacao: '3º SGT', nome: 'MARIA JOSE ROCHA DO NASCIMENTO', mf: '57189116-1', cpf: '702.856.082-15', dataNascimento: '02/12/1980' },
    { id: 28, postoGraduacao: '3º SGT', nome: 'PAULA DANIELLE VILHENA DIAS DE OLIVEIRA', mf: '57190134-1', cpf: '791.227.552-00', dataNascimento: '09/11/1983' },
    { id: 29, postoGraduacao: '3º SGT', nome: 'VANESSA BORGES DE JESUS SILVA', mf: '57189302-1', cpf: '689.100.702-00', dataNascimento: '06/04/1981' },
    { id: 30, postoGraduacao: '3º SGT', nome: 'MARCIO RODRIGUES', mf: '57189098-1', cpf: '680.372.282-15', dataNascimento: '26/03/1982' },
    { id: 31, postoGraduacao: '3º SGT', nome: 'HERMANO MOREIRA COSTA', mf: '57189191-1', cpf: '680.309.082-53', dataNascimento: '28/10/1980' },
    { id: 32, postoGraduacao: '3º SGT', nome: 'MICHELLE MAIA CARNEIRO RABELO', mf: '57189260-1', cpf: '736.430.252-20', dataNascimento: '14/08/1982' },
    { id: 33, postoGraduacao: '3º SGT', nome: 'ODETE MESQUITA DE ANDRADE', mf: '57190142-1', cpf: '722.473.712-72', dataNascimento: '09/02/1982' },
    { id: 34, postoGraduacao: '3º SGT', nome: 'FABRICIO PEREIRA DA SILVA', mf: '57189265-1', cpf: '820.348.102-91', dataNascimento: '03/07/1984' },
    { id: 35, postoGraduacao: '3º SGT', nome: 'KAROLINE AURINETH SILVA CAMPOS', mf: '57189233-1', cpf: '590.973.982-04', dataNascimento: '19/10/1987' },
    { id: 36, postoGraduacao: '3º SGT', nome: 'ADRIANA NAZARE COSTA DE ASSUNÇÃO', mf: '57191254-1', cpf: '659.029.042-34', dataNascimento: '26/12/1980' },
    { id: 37, postoGraduacao: '3º SGT', nome: 'JULIANA CAROLINA DE SOUZA COSTA', mf: '57217892-1', cpf: '861.223.712-20', dataNascimento: '03/10/1986' },
    { id: 38, postoGraduacao: '3º SGT', nome: 'WANDER LUIZ FERREIRA DA SIVA', mf: '57217881-1', cpf: '680.460.302-87', dataNascimento: '25/09/1980' },
    { id: 39, postoGraduacao: '3º SGT', nome: 'ROGERIO VALDIVINO CORREA DA SILVA', mf: '57217806-1', cpf: '713.360.442-68', dataNascimento: '07/08/1981' },
    { id: 40, postoGraduacao: '3º SGT', nome: 'WARLEY RAFAEL SILVEIRA TEIXEIRA', mf: '57217934-1', cpf: '526.229.912-00', dataNascimento: '24/11/1989' },
    { id: 41, postoGraduacao: '3º SGT', nome: 'GEDERSON DA SILVA RIBEIRO', mf: '57218283-1', cpf: '752.825.342-15', dataNascimento: '02/06/1982' },
    { id: 42, postoGraduacao: '3º SGT', nome: 'ARLEY RAFAEL BARBOSA RODRIGUES', mf: '57217782-1', cpf: '950.711.482-34', dataNascimento: '07/03/1990' },
    { id: 43, postoGraduacao: 'CB', nome: 'NARDINY DIEGO SOUZA ALVES', mf: '59325341', cpf: '002.512.022-08', dataNascimento: '24/05/1990' },
    { id: 44, postoGraduacao: 'CB', nome: 'NAYARA FERNANDA FREITAS DE SOUSA', mf: '59325531', cpf: '025.472.352-77', dataNascimento: '21/03/1994' },
    { id: 45, postoGraduacao: 'CB', nome: 'RAIANA PAMFOLHA BRAZZ DE OLIVEIRA', mf: '59322441', cpf: '008.084.812-58', dataNascimento: '29/05/1993' },
    { id: 46, postoGraduacao: 'CB', nome: 'FELIPE LOPES CARDOSO', mf: '59325231', cpf: '985.847.152-15', dataNascimento: '29/03/1990' },
    { id: 47, postoGraduacao: 'CB', nome: 'RAFAEL LUIS DA SILVA SENA', mf: '59323141', cpf: '016.902.352-41', dataNascimento: '4/10/1996' },
    { id: 48, postoGraduacao: 'CB', nome: 'GISLAINE DAIANE DOS SANTOS REIS', mf: '59324751', cpf: '012.657.952-07', dataNascimento: '08/07/1993' },
    { id: 49, postoGraduacao: 'VC', nome: 'VALERIA RUANA PEREIRA DA COSTA', mf: '5977033', cpf: '052.408.052-61', dataNascimento: '30/04/2001' },
    { id: 50, postoGraduacao: 'VC', nome: 'DAVI SOUSA CARVALHO', mf: '8401496', cpf: '022.878.492-11', dataNascimento: '13/07/2002' },
    { id: 51, postoGraduacao: 'VC', nome: 'DERIK MATHEUS FERREIRA DE ASSIS', mf: '5979441', cpf: '057.482.252-63', dataNascimento: '09/03/2003' },
    { id: 52, postoGraduacao: 'VC', nome: 'GABRIELA RODRIGUES MENDONÇA', mf: '5981264', cpf: '019.417.622-39', dataNascimento: '11/07/2005' },
    { id: 53, postoGraduacao: 'VC', nome: 'TAYNA DOS SANTOS MACHADO', mf: '5984533', cpf: '083.461.752-80', dataNascimento: '21/04/2005' },
    { id: 54, postoGraduacao: 'VC', nome: 'JHENNIFER CRISTINA DE QUEIROZ FERREIRA', mf: '5985389', cpf: '074.679.012-08', dataNascimento: '10/05/2005' },
    { id: 55, postoGraduacao: 'VC', nome: 'DANIELA CONCEIÇÃO DOS SANTOS', mf: '5986002', cpf: '064.242.552-30', dataNascimento: '20/01/2006' },
    { id: 56, postoGraduacao: 'VC', nome: 'ISADORA SOUZA MENDES', mf: '5986030', cpf: '022.735.892-98', dataNascimento: '07/05/2006' },
    { id: 57, postoGraduacao: 'VC', nome: 'DIOGO FERREIRA LOBATO', mf: '5986042', cpf: '007.280.972-92', dataNascimento: '20/01/2004' },
    { id: 58, postoGraduacao: 'VC', nome: 'EMMANUELLE GHISLANE SOUZA PIRES', cpf: '018.649.422-07', dataNascimento: '29/08/2003' },
    { id: 59, postoGraduacao: 'VC', nome: 'REBECA DE PAULA', cpf: '956.204.432-72', dataNascimento: '06/05/2004' },
    { id: 60, postoGraduacao: 'VC', nome: 'JAMILLY TAVARES ALVES DA SILVA GARCIA', cpf: '040.524.592-02', dataNascimento: '08/12/2004' },
    { id: 61, postoGraduacao: 'VC', nome: 'GLAUCE CARVALHO MOURÃO', cpf: '065.808.422-45', dataNascimento: '17/09/2004' }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServidor, setEditingServidor] = useState<Servidor | null>(null);
  const [formData, setFormData] = useState({
    postoGraduacao: '',
    nome: '',
    mf: '',
    cpf: '',
    dataNascimento: ''
  });

  const handleEdit = (servidor: Servidor) => {
    setEditingServidor(servidor);
    setFormData({
      postoGraduacao: servidor.postoGraduacao,
      nome: servidor.nome,
      mf: servidor.mf || '',
      cpf: servidor.cpf || '',
      dataNascimento: servidor.dataNascimento || ''
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingServidor(null);
    setFormData({
      postoGraduacao: '',
      nome: '',
      mf: '',
      cpf: '',
      dataNascimento: ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome || !formData.postoGraduacao) {
      toast({
        title: "Erro",
        description: "Nome e Posto/Graduação são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingServidor) {
      setServidores(servidores.map(s => 
        s.id === editingServidor.id 
          ? { ...s, ...formData }
          : s
      ));
      toast({
        title: "Sucesso",
        description: "Servidor atualizado com sucesso"
      });
    } else {
      const newServidor: Servidor = {
        id: Math.max(...servidores.map(s => s.id)) + 1,
        ...formData
      };
      setServidores([...servidores, newServidor]);
      toast({
        title: "Sucesso",
        description: "Servidor adicionado com sucesso"
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setServidores(servidores.filter(s => s.id !== id));
    toast({
      title: "Sucesso",
      description: "Servidor removido com sucesso"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Relação de Efetivo</CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Servidor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingServidor ? 'Editar Servidor' : 'Adicionar Servidor'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="postoGraduacao">Posto/Graduação</Label>
                    <Input
                      id="postoGraduacao"
                      value={formData.postoGraduacao}
                      onChange={(e) => setFormData({ ...formData, postoGraduacao: e.target.value })}
                      placeholder="Ex: CEL QOBM"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mf">MF</Label>
                    <Input
                      id="mf"
                      value={formData.mf}
                      onChange={(e) => setFormData({ ...formData, mf: e.target.value })}
                      placeholder="Matrícula funcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posto/Graduação</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>MF</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  {canEdit && <TableHead className="w-24">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {servidores.map((servidor) => (
                  <TableRow key={servidor.id}>
                    <TableCell>
                      <Badge variant="outline">{servidor.postoGraduacao}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{servidor.nome}</TableCell>
                    <TableCell>{servidor.mf || '-'}</TableCell>
                    <TableCell>{servidor.cpf || '-'}</TableCell>
                    <TableCell>{servidor.dataNascimento || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(servidor)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(servidor.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {servidores.length} servidores
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelacaoEfetivo;