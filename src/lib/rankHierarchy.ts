/**
 * Hierarquia e ordenação do efetivo DGSCI / CBMPA.
 * Ordem institucional:
 * CEL → TCEL → MAJ → CAP → 1º TEN → 2º TEN → SUB TEN RR → SUB TEN → 1º SGT → 2º SGT → 3º SGT → CB → SD → VC
 *
 * Dentro da mesma graduação, a ordenação é alfabética pelo nome.
 * Esta ordenação organiza a consulta institucional e NÃO representa antiguidade militar.
 */

export const MILITARY_RANKS = [
  'CEL',
  'TCEL',
  'MAJ',
  'CAP',
  '1º TEN',
  '2º TEN',
  'SUB TEN RR',
  'SUB TEN',
  '1º SGT',
  '2º SGT',
  '3º SGT',
  'CB',
  'SD',
  'VC',
] as const;

export type MilitaryRank = (typeof MILITARY_RANKS)[number];

export interface NormalizedRank {
  canonical: MilitaryRank | string;
  order: number;
  isUnknownRank: boolean;
  original: string;
}

/**
 * Normaliza variações de grafia, abreviações, espaços e caracteres especiais (ex.: 1º, 1°, 1, 1ª)
 * sem alterar indevidamente os registros originais.
 */
export function normalizeRank(rawRank: string | null | undefined): NormalizedRank {
  const original = (rawRank || '').trim();
  if (!original) {
    return { canonical: 'Não informado', order: 999, isUnknownRank: true, original };
  }

  // Remove diacríticos, pontuação redundante e normaliza espaços
  const clean = original
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[º°ª]/g, ' ')
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. CEL (Coronel) - deve evitar casar com TEN CEL
  if (/^(CEL|CORONEL)$/.test(clean)) {
    return { canonical: 'CEL', order: 1, isUnknownRank: false, original };
  }

  // 2. TCEL (Tenente Coronel)
  if (/^(TCEL|TEN\s*CEL|TENENTE\s*CORONEL)$/.test(clean)) {
    return { canonical: 'TCEL', order: 2, isUnknownRank: false, original };
  }

  // 3. MAJ (Major)
  if (/^(MAJ|MAJOR)$/.test(clean)) {
    return { canonical: 'MAJ', order: 3, isUnknownRank: false, original };
  }

  // 4. CAP (Capitão)
  if (/^(CAP|CAPITAO)$/.test(clean)) {
    return { canonical: 'CAP', order: 4, isUnknownRank: false, original };
  }

  // 5. 1º TEN (Primeiro Tenente)
  if (/^(1\s*TEN|1\s*TENENTE|PRIMEIRO\s*TENENTE)$/.test(clean)) {
    return { canonical: '1º TEN', order: 5, isUnknownRank: false, original };
  }

  // 6. 2º TEN (Segundo Tenente)
  if (/^(2\s*TEN|2\s*TENENTE|SEGUNDO\s*TENENTE)$/.test(clean)) {
    return { canonical: '2º TEN', order: 6, isUnknownRank: false, original };
  }

  // 7. SUB TEN RR (Subtenente da Reserva Remunerada) - checado antes de SUB TEN comum
  if (/^(SUB\s*TEN\s*R\s*R|SUBTEN\s*R\s*R|SUBTENENTE\s*R\s*R|SUB\s*TENENTE\s*R\s*R|SUB\s*TEN\s*RR|SUBTEN\s*RR|SUBTENENTE\s*RR)$/.test(clean)) {
    return { canonical: 'SUB TEN RR', order: 7, isUnknownRank: false, original };
  }

  // 8. SUB TEN (Subtenente)
  if (/^(SUB\s*TEN|SUBTEN|SUBTENENTE|SUB\s*TENENTE)$/.test(clean)) {
    return { canonical: 'SUB TEN', order: 8, isUnknownRank: false, original };
  }

  // 9. 1º SGT (Primeiro Sargento)
  if (/^(1\s*SGT|1\s*SARGENTO|PRIMEIRO\s*SARGENTO)$/.test(clean)) {
    return { canonical: '1º SGT', order: 9, isUnknownRank: false, original };
  }

  // 10. 2º SGT (Segundo Sargento)
  if (/^(2\s*SGT|2\s*SARGENTO|SEGUNDO\s*SARGENTO)$/.test(clean)) {
    return { canonical: '2º SGT', order: 10, isUnknownRank: false, original };
  }

  // 11. 3º SGT (Terceiro Sargento)
  if (/^(3\s*SGT|3\s*SARGENTO|TERCEIRO\s*SARGENTO)$/.test(clean)) {
    return { canonical: '3º SGT', order: 11, isUnknownRank: false, original };
  }

  // 12. CB (Cabo)
  if (/^(CB|CABO)$/.test(clean)) {
    return { canonical: 'CB', order: 12, isUnknownRank: false, original };
  }

  // 13. SD (Soldado)
  if (/^(SD|SOLDADO|SD\s*1C|SD\s*2C|SD\s*1\s*CLASSE|SD\s*2\s*CLASSE)$/.test(clean)) {
    return { canonical: 'SD', order: 13, isUnknownRank: false, original };
  }

  // 14. VC (Voluntário Civil)
  if (/^(VC|VOLUNTARIO\s*CIVIL|VOLUNTARIA\s*CIVIL|VOLUNTARIO)$/.test(clean)) {
    return { canonical: 'VC', order: 14, isUnknownRank: false, original };
  }

  // Graduação desconhecida: fica ao final (ordem 999) e sinalizada para revisão, SEM converter em VC
  return { canonical: original, order: 999, isUnknownRank: true, original };
}

/**
 * Compara dois integrantes para ordenação institucional da relação do efetivo.
 * Hierarquia de postos/graduações primeiro; havendo empate, ordem alfabética de nome.
 */
export function compareStaffMembers<T extends { postoGraduacao?: string | null; nome: string }>(a: T, b: T): number {
  const rankA = normalizeRank(a.postoGraduacao);
  const rankB = normalizeRank(b.postoGraduacao);

  if (rankA.order !== rankB.order) {
    return rankA.order - rankB.order;
  }

  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
}
