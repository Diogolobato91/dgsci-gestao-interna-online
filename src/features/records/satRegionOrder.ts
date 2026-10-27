export function unitOrder(unit: string): number {
  const text = unit.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (/\b(?:CAT|DGSCI)\b/.test(text)) return -1;
  const match = text.match(/(\d+)\s*[º°ªo]?\s*(?:GBM|GPA)\b/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
export function compareSatRegions(a: {gbm: string; sat: string}, b: {gbm: string; sat: string}) {
  return unitOrder(a.gbm) - unitOrder(b.gbm) || a.gbm.localeCompare(b.gbm, 'pt-BR', { numeric: true }) || a.sat.localeCompare(b.sat, 'pt-BR');
}
