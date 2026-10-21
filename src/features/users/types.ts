import type { UserProfile } from '@/types/auth';

export const USER_SECTORS: UserProfile[] = [
  'Diretoria',
  'Subdiretoria',
  'Secretaria',
  'Vistoriador',
  'Análise',
  'Multas',
];

export type UserStatus =
  | 'active'
  | 'approved'
  | 'blocked'
  | 'pending_approval'
  | 'rejected'
  | 'pending_registration'
  | 'pending_confirmation';

export type ManagedUser = {
  email: string;
  display_name: string;
  role: 'administrator' | 'editor' | 'reader';
  sectors: UserProfile[];
  enabled: boolean;
  version: number;
  updated_at: string;
  created_at?: string;
  user_id: string | null;
  last_sign_in_at: string | null;
  posto_graduacao?: string | null;
  matricula?: string | null;
  cpf?: string | null;
  contato?: string | null;
  data_nascimento?: string | null;
  status: UserStatus;
  rejection_reason?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
};

export const USER_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Aguardando aprovação',
  active: 'Ativo',
  approved: 'Ativo',
  blocked: 'Bloqueado',
  rejected: 'Rejeitado',
  pending_registration: 'Aguardando primeiro acesso',
  pending_confirmation: 'Aguardando confirmação',
};

export interface UserAuditEntry {
  id: string;
  actor_id: string;
  actor_email: string;
  target_email: string;
  action: 'create' | 'update' | 'block' | 'unblock' | 'register' | 'approve' | 'reject' | string;
  notes?: string | null;
  before_values?: Record<string, unknown> | null;
  after_values: Record<string, unknown>;
  created_at: string;
}

export const isManagedSuperadmin = (account: Pick<ManagedUser, 'role' | 'sectors'>) =>
  account.role === 'administrator' &&
  Array.isArray(account.sectors) &&
  USER_SECTORS.every(sector => account.sectors.includes(sector));
