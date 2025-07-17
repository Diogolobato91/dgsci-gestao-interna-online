export type UserProfile = 
  | 'Vistoria'
  | 'Análise'
  | 'Multas'
  | 'ADM'
  | 'Subdiretoria'
  | 'Diretoria';

export interface User {
  matricula: string;
  profile: UserProfile;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (matricula: string, senha: string, profile: UserProfile) => Promise<boolean>;
  logout: () => void;
}