export type UserProfile = 
  | 'Vistoriador'
  | 'Análise'
  | 'Multas'
  | 'Secretaria'
  | 'Subdiretoria'
  | 'Diretoria';

export interface User {
  matricula: string;
  profile: UserProfile;
  isAuthenticated: boolean;
  allowedProfiles?: UserProfile[];
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string;
  register: (email: string, password: string) => Promise<'pending' | 'confirmed'>;
  login: (matricula: string, senha: string, profile?: UserProfile) => Promise<boolean>;
  logout: () => void;
}