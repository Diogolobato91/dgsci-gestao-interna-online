export type PublicQueueId = 'inspection' | 'fines' | 'projects' | 'accreditation' | 'access';

export type PublicService = {
  id: string;
  label: string;
  queue: PublicQueueId;
};

export type PublicQueue = {
  id: PublicQueueId;
  label: string;
  shortLabel: string;
  description: string;
  universal?: boolean;
};

export const PUBLIC_QUEUES: PublicQueue[] = [
  {
    id: 'inspection',
    label: 'Seção de Vistoria',
    shortLabel: 'Vistoria',
    description: 'Licenciamento, solicitação e acompanhamento de vistorias e orientações gerais.',
  },
  {
    id: 'fines',
    label: 'Seção de Multa',
    shortLabel: 'Multa',
    description: 'Débitos, multas, pagamentos, defesas, recursos e regularização.',
  },
  {
    id: 'projects',
    label: 'Seção de Análise de Projeto',
    shortLabel: 'Análise de Projeto',
    description: 'Análise, correção, acompanhamento e orientação sobre projetos.',
  },
  {
    id: 'accreditation',
    label: 'Seção de Credenciamento de Empresas e Profissionais',
    shortLabel: 'Credenciamento',
    description: 'Novo credenciamento, renovação, documentação e acompanhamento.',
  },
  {
    id: 'access',
    label: 'Acesso e Senha',
    shortLabel: 'Acesso e Senha',
    description: 'Reset de senha atendido pela equipe disponível, independentemente da seção.',
    universal: true,
  },
];

export const PUBLIC_SERVICES: PublicService[] = [
  { id: 'renew-license', label: 'Renovar licenciamento', queue: 'inspection' },
  { id: 'request-inspection', label: 'Solicitar vistoria', queue: 'inspection' },
  { id: 'track-inspection', label: 'Acompanhar vistoria', queue: 'inspection' },
  { id: 'inspection-question', label: 'Pendência ou dúvida sobre vistoria', queue: 'inspection' },
  { id: 'general-guidance', label: 'Outro assunto ou orientação geral', queue: 'inspection' },
  { id: 'debt-query', label: 'Consultar débito ou multa', queue: 'fines' },
  { id: 'fine-payment', label: 'Pagamento ou regularização', queue: 'fines' },
  { id: 'fine-defense', label: 'Defesa ou recurso', queue: 'fines' },
  { id: 'fine-question', label: 'Outra dúvida sobre multa', queue: 'fines' },
  { id: 'submit-project', label: 'Solicitar análise de projeto', queue: 'projects' },
  { id: 'track-project', label: 'Acompanhar análise', queue: 'projects' },
  { id: 'project-correction', label: 'Corrigir pendência do projeto', queue: 'projects' },
  { id: 'project-question', label: 'Orientação sobre projeto', queue: 'projects' },
  { id: 'new-accreditation', label: 'Novo credenciamento', queue: 'accreditation' },
  { id: 'renew-accreditation', label: 'Renovar credenciamento', queue: 'accreditation' },
  { id: 'track-accreditation', label: 'Acompanhar credenciamento', queue: 'accreditation' },
  { id: 'accreditation-documents', label: 'Documentação de credenciamento', queue: 'accreditation' },
  { id: 'password-reset', label: 'Resetar senha', queue: 'access' },
];

export function queueById(id: PublicQueueId) {
  return PUBLIC_QUEUES.find(queue => queue.id === id)!;
}

export function serviceById(id: string) {
  return PUBLIC_SERVICES.find(service => service.id === id);
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function isValidCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calculate = (length: number) => {
    let factor = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * factor;
      factor -= 1;
      if (factor === 1) factor = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(digits[12]) && calculate(13) === Number(digits[13]);
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
