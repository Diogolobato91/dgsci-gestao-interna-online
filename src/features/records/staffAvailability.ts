export type Staff = {
  id: string; postoGraduacao: string; nome: string; mf: string | null; cpf: string | null;
  dataNascimento: string | null; categoria: string; contato: string | null; version: number;
};
export const ABSENCE_KINDS = ['Férias', 'Licença', 'Afastamento'] as const;
export type StaffAbsence = {
  id: string; staff_id: string; kind: typeof ABSENCE_KINDS[number]; starts_on: string; ends_on: string;
  reason: string; cancelled_at: string | null; cancellation_reason: string; version: number;
  updated_at: string; created_at: string;
};
export type RosterConflict = { id: string; service_date: string; duty_role: string };
export function institutionalToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function absenceOn(absences: StaffAbsence[], staffId: string | null | undefined, day: string) {
  return absences.find(a => a.staff_id === staffId && !a.cancelled_at && a.starts_on <= day && a.ends_on >= day);
}
export const shortDate = (date: string) => !date ? '—' : date.includes('T')
  ? new Date(date).toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'})
  : date.slice(0,10).split('-').reverse().join('/');
export function toInputDate(date: string | null | undefined) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(date || '') ? date!.split('/').reverse().join('-') : date || '';
}
export function validPeriod(start: string, end: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' &&
    !Number.isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  return valid(start) && valid(end) && start <= end;
}
export function staffOperationError(error: { code?: string; message?: string } | null) {
  if (error?.code === '40001') return 'O registro foi alterado por outra pessoa. Feche e atualize a consulta.';
  if (error?.code === '23505') return 'Já existe um cadastro com os dados informados. Confira CPF e matrícula.';
  if (error?.code === '22023') return error.message || 'Confira os dados informados.';
  if (error?.code === '42501') return 'Sua conta não tem permissão para esta alteração.';
  return 'Não foi possível salvar. Confira os dados e tente novamente.';
}
