export const DUTY_ROLES = ['Chefe do Plantão', 'Aux. e Cond do Perito', 'Perito de Incêndio'] as const;
export const PLANNING_STATUS = {
  '': { label: 'Sem marcação', bg: '#ffffff', fg: '#111111' },
  service_red: { label: 'Serviço · escala vermelha', bg: '#ff0000', fg: '#ffffff' },
  standby_red: { label: 'Sobreaviso · escala vermelha', bg: '#980000', fg: '#ffffff' },
  service_black: { label: 'Serviço · escala preta', bg: '#666666', fg: '#ffffff' },
  standby_black: { label: 'Sobreaviso · escala preta', bg: '#000000', fg: '#ffffff' },
  blocked: { label: 'Impedimento na escala', bg: '#ff9900', fg: '#111111' },
  vacation: { label: 'Férias', bg: '#b6d7a8', fg: '#111111' },
  leave: { label: 'Dispensa / Licença', bg: '#f9cb9c', fg: '#111111' },
  operation: { label: 'À disposição / Operação / Curso', bg: '#9fc5e8', fg: '#111111' },
  other: { label: 'Outros', bg: '#a64d79', fg: '#ffffff' },
} as const;
export type PlanningStatus = keyof typeof PLANNING_STATUS;
export type PlanCell = { value: string; status: PlanningStatus; bg?: string; fg?: string };
export type RosterPerson = { id: string; nome: string; posto_graduacao: string; contato: string | null; resolved_contact: string | null; contact_source: string; version: number; staff_id: string | null };
export type Plantao = { id: string; service_date: string; chief_id: string; assistant_id: string; expert_id: string; notes: string; version: number };
export type Plan = { month: string; notes: string; source_label: string; source_updated: string; version: number };
export type PlanRow = { id: string; month: string; section: string; nome: string; posto_graduacao: string; source_order: number; name_color: string; cells: Record<string, PlanCell>; version: number };
export const dateISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function formatContact(phone: string | null | undefined) {
  const d = (phone || '').replace(/\D/g,'');
  return d.length === 11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` : 'Contato não informado';
}
export function validateTeam(ids: string[], people: RosterPerson[]) {
  return ids.length === 3 && new Set(ids).size === 3 && ids.every(id => people.some(p => p.id === id && p.posto_graduacao.trim().toUpperCase() !== 'VC'));
}
export function cellColors(cell?: PlanCell) {
  const status = PLANNING_STATUS[cell?.status || ''] || PLANNING_STATUS[''];
  return { backgroundColor: /^#[a-f\d]{6}$/i.test(cell?.bg || '') ? cell!.bg : status.bg, color: /^#[a-f\d]{6}$/i.test(cell?.fg || '') ? cell!.fg : status.fg };
}

export function whatsappContactUrl(phone:string|null|undefined){
 const digits=(phone||'').replace(/\D/g,'');
 const national=digits.length===12||digits.length===13?digits.startsWith('55')?digits.slice(2):'':digits;
 return /^[1-9]\d{9,10}$/.test(national)?'https://wa.me/55'+national:null;
}
