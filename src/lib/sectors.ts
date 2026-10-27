import type {UserProfile} from '@/types/auth';
/** Núcleo administrativo usado na identificação de superadministradores existentes. */
export const CORE_SECTORS:UserProfile[]=['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
export const ALL_SECTORS:UserProfile[]=[...CORE_SECTORS,'Credenciamento'];
