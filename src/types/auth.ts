export type UserProfile = 
  | 'Vistoriador'
  | 'Análise'
  | 'Multas'
  | 'Secretaria'
  | 'Subdiretoria'
  | 'Diretoria';

export interface User {
  id?: string;
  email?: string;
  matricula: string;
  nome?: string;
  profile: UserProfile;
  isAuthenticated: boolean;
  allowedProfiles?: UserProfile[];
  role?: string;
  registrationStatus?: 'pending_approval' | 'approved' | 'rejected' | 'blocked';
  rejectionReason?: string | null;
  enabled?: boolean;
}

export interface RegisterData {
  nome: string;
  postoGraduacao: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  email: string;
  password: string;
}

export interface RegistrationStatusInfo {
  nome: string;
  posto_graduacao: string;
  matricula: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'blocked';
  rejection_reason?: string | null;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string;
  register: (data: RegisterData) => Promise<{ status: 'pending_approval' | 'confirmed' }>;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  checkStatus: () => Promise<RegistrationStatusInfo | null>;
}