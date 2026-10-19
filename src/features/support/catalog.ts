export type ContentType = 'model' | 'guide' | 'notice';
export interface SupportContent {
  id: string; type: ContentType; area: string; date: string; format: string;
  title: string; description: string; tags: string[]; version?: string;
  file?: string; featured?: boolean; checklist?: string[]; related: string[];
  sections: { title: string; text?: string; items?: string[] }[];
}
export const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export function matchesContent(item: SupportContent, query: string, type: string, area: string) {
  if (type !== 'all' && item.type !== type) return false;
  if (area !== 'all' && item.area !== area) return false;
  const text = normalize([item.title, item.description, item.area, ...item.tags,
    ...item.sections.flatMap(s => [s.title, s.text || '', ...(s.items || [])])].join(' '));
  return normalize(query).trim().split(/\s+/).every(word => text.includes(word));
}
export function readLocal<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(`dgsci-demo:${key}`) || 'null') ?? fallback; }
  catch { return fallback; }
}
export function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(`dgsci-demo:${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
