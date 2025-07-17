import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import cbmpaLogo from '@/assets/cbmpa-logo.png';

const profiles: UserProfile[] = ['Vistoria', 'Análise', 'Multas', 'ADM', 'Subdiretoria', 'Diretoria'];

const LoginForm: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | ''>('');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !matricula || !senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(matricula, senha, profile as UserProfile);
      if (success) {
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo ao sistema, ${matricula}!`
        });
      } else {
        toast({
          title: "Erro no login",
          description: "Verifique suas credenciais e tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no sistema",
        description: "Ocorreu um erro interno. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo e Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={cbmpaLogo} 
              alt="CBMPA Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Sistema Interno DGSCI
            </h1>
            <p className="text-muted-foreground mt-2">
              Corpo de Bombeiros Militar do Pará
            </p>
          </div>
        </div>

        {/* Formulário de Login */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              Acesso ao Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile">Seção / Perfil</Label>
                <Select value={profile} onValueChange={(value) => setProfile(value as UserProfile)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu perfil de acesso" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((prof) => (
                      <SelectItem key={prof} value={prof}>
                        {prof}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Identificação (Matrícula)</Label>
                <Input
                  id="matricula"
                  type="text"
                  placeholder="Digite sua matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Acessando...' : 'Acessar o Sistema'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 CBMPA - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;