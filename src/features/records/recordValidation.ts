/** Regras de apresentação; o banco continua sendo a autoridade para concorrência e acesso. */
export function recordSaveError(error: { code?: string; message?: string }) {
  if (error.code === '23505') return 'Já existe um registro com essa identificação. Confira a lista antes de cadastrar novamente.';
  if (error.code === '22023') return error.message || 'Confira os campos obrigatórios.';
  if (error.code === '42501') return 'Sua conta não tem permissão para alterar este registro.';
  return 'Não foi possível salvar. Confira sua conexão e tente novamente.';
}
export function validateRecordFields(fields: {key: string; label: string; required?: boolean; multiline?: boolean; maxLength?:number}[], draft: Record<string, unknown>) {
  for (const field of fields) {
    const value = String(draft[field.key] ?? '').trim();
    if (field.required && !value) return `Preencha ${field.label}.`;
    if (value.length > (field.maxLength??(field.multiline ? 4000 : 180))) return `${field.label}: o texto ultrapassou o limite permitido.`;
  }
  return '';
}
