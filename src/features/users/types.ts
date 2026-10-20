import type { UserProfile } from '@/types/auth';
export const USER_SECTORS: UserProfile[] = ['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'];
export type ManagedUser = {
 email:string; display_name:string; role:'administrator'|'editor'|'reader';
 sectors:UserProfile[]; enabled:boolean; version:number; updated_at:string;
 user_id:string|null; email_confirmed_at:string|null; last_sign_in_at:string|null;
 status:'active'|'blocked'|'pending_registration'|'pending_confirmation';
};
export const USER_STATUS_LABELS = {
 active:'Ativo', blocked:'Bloqueado', pending_registration:'Aguardando primeiro acesso',
 pending_confirmation:'Aguardando confirmação',
};
export const isManagedSuperadmin = (account:Pick<ManagedUser,'role'|'sectors'>) =>
 account.role==='administrator' && USER_SECTORS.every(sector=>account.sectors.includes(sector));
