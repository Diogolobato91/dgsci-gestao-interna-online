import type { User } from '@/types/auth';
import { navigationConfig } from '@/config/navigation';
export const isFullAdministrator = (user: User | null) => user?.role === 'administrator' && Object.keys(navigationConfig).every(sector => user.allowedProfiles?.includes(sector as User['profile']));
export const canManageOrdinances = (user: User | null) => !!user && (isFullAdministrator(user) || !!user.allowedProfiles?.includes('Subdiretoria'));
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export function safeFileUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export const canManageSat = (user: User | null) => !!user?.allowedProfiles?.some(sector => ['Diretoria', 'Subdiretoria'].includes(sector));
export const canManageSupport = (user: User | null) => !!user?.allowedProfiles?.some(sector => ['Secretaria', 'Diretoria', 'Subdiretoria'].includes(sector));
