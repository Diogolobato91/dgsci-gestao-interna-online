/**
 * Validações e máscaras para cadastro de usuários DGSCI.
 */

/**
 * Remove qualquer caractere não numérico.
 */
export function cleanDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function maskCpf(value: string | null | undefined): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validação algorítmica de CPF (dígitos verificadores módulo 11).
 */
export function validateCpf(rawCpf: string | null | undefined): boolean {
  const digits = cleanDigits(rawCpf);
  if (digits.length !== 11) return false;

  // Rejeita sequências de dígitos todos iguais (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Primeiro dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(digits[i], 10) * (10 - i);
  }
  let rest1 = (sum1 * 10) % 11;
  if (rest1 === 10 || rest1 === 11) rest1 = 0;
  if (rest1 !== parseInt(digits[9], 10)) return false;

  // Segundo dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(digits[i], 10) * (11 - i);
  }
  let rest2 = (sum2 * 10) % 11;
  if (rest2 === 10 || rest2 === 11) rest2 = 0;
  if (rest2 !== parseInt(digits[10], 10)) return false;

  return true;
}

/**
 * Validação de data de nascimento (deve ser data válida no passado).
 */
export function validateBirthDate(rawDate: string | null | undefined): { valid: boolean; error?: string } {
  if (!rawDate) return { valid: false, error: 'Informe a data de nascimento.' };

  const parsed = new Date(rawDate + (rawDate.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Data de nascimento inválida.' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (parsed > today) {
    return { valid: false, error: 'Data de nascimento não pode estar no futuro.' };
  }

  const year = parsed.getFullYear();
  if (year < 1900) {
    return { valid: false, error: 'Ano de nascimento inválido.' };
  }

  return { valid: true };
}

/**
 * Valida o formulário completo de solicitação de cadastro antes de enviar.
 */
export interface UserRegistrationPayload {
  contato: string;
  nome: string;
  postoGraduacao: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegistrationForm(payload: UserRegistrationPayload): Record<string, string> {
  const errors: Record<string, string> = {};

  const cleanName = (payload.nome || '').trim();
  if (!cleanName || cleanName.length < 2) {
    errors.nome = 'Informe seu nome completo (mínimo de 2 caracteres).';
  } else if (cleanName.length > 160) {
    errors.nome = 'O nome não pode exceder 160 caracteres.';
  }

  if (!payload.postoGraduacao) {
    errors.postoGraduacao = 'Selecione seu posto ou graduação.';
  }

  const cleanMatricula = (payload.matricula || '').trim();
  if (!cleanMatricula || cleanMatricula.length < 2) {
    errors.matricula = 'Informe sua matrícula funcional.';
  }

  if (!validateCpf(payload.cpf)) {
    errors.cpf = 'Informe um CPF válido (11 dígitos).';
  }

  const birthCheck = validateBirthDate(payload.dataNascimento);
  if (!birthCheck.valid) {
    errors.dataNascimento = birthCheck.error || 'Data inválida.';
  }

  if (!/^\d{10,11}$/.test(cleanDigits(payload.contato))) {
    errors.contato = 'Informe o contato com DDD (10 ou 11 dígitos).';
  }

  const cleanEmail = (payload.email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (!payload.password || payload.password.length < 8) {
    errors.password = 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (payload.password !== payload.confirmPassword) {
    errors.confirmPassword = 'A confirmação de senha não coincide com a senha digitada.';
  }

  return errors;
}
