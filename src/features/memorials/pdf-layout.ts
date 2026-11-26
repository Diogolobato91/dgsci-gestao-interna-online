import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import type { MemorialType } from './templates';
import { memorialProtocol } from './templates';

export type MemorialPdfRequest = {
  id: string;
  request_number: number;
  memorial_type: MemorialType;
  protocol: string;
  company_name: string;
  cnpj: string;
  contact_name: string;
  contact_email: string;
  data: Record<string, string>;
  submitted_at?: string | null;
};

export type MemorialPdfSignature = { name: string; date: string };
type Logos = { cbmpaLogo: PDFImage; dgsciLogo: PDFImage; regular: PDFFont; bold: PDFFont };
type Cell = {
  label: string;
  key?: string;
  value?: string;
  width: number;
  fontSize?: number;
  labelSize?: number;
  multiline?: boolean;
  checked?: boolean;
};

const A4 = { width: 595.28, height: 841.89 };
const INK = rgb(0.08, 0.11, 0.15);
const MUTED = rgb(0.27, 0.30, 0.34);
const GRID = rgb(0.15, 0.16, 0.18);
const SECTION = rgb(0.93, 0.94, 0.95);
const ENTRY = rgb(0.79, 0.04, 0.05);
const BLUE_ENTRY = rgb(0.02, 0.20, 0.53);
const WHITE = rgb(1, 1, 1);
const X0 = 22;
const WIDTH = A4.width - X0 * 2;
const BOTTOM = 820;

const val = (data: Record<string, string>, key: string, fallback = '') =>
  String(data[key] ?? fallback).trim();
function dateCity(data: Record<string, string>) {
  const city = val(data, 'responsibility_city') || val(data, 'city');
  const rawDate = val(data, 'responsibility_date');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? new Date(`${rawDate}T12:00:00`).toLocaleDateString('pt-BR') : rawDate;
  return [city, date].filter(Boolean).join('  ');
}
const token = (source: string, pattern: RegExp) => source.match(pattern)?.[1]?.trim() ?? '';
const topY = (page: PDFPage, top: number, size = 8) => page.getHeight() - top - size;

function write(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  size: number,
  font: PDFFont,
  color = INK,
  maxWidth?: number,
  align: 'left' | 'center' | 'right' = 'left',
) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  let fontSize = size;
  while (maxWidth && font.widthOfTextAtSize(clean, fontSize) > maxWidth && fontSize > 5.2) fontSize -= 0.2;
  let fittingText = clean;
  if (maxWidth && font.widthOfTextAtSize(fittingText, fontSize) > maxWidth) {
    while (fittingText.length && font.widthOfTextAtSize(`${fittingText}…`, fontSize) > maxWidth) fittingText = fittingText.slice(0, -1);
    fittingText = fittingText ? `${fittingText}…` : '';
  }
  if (!fittingText) return;
  const measured = font.widthOfTextAtSize(fittingText, fontSize);
  const xPos = align === 'center' && maxWidth ? x + (maxWidth - measured) / 2 : align === 'right' && maxWidth ? x + maxWidth - measured : x;
  page.drawText(fittingText, { x: xPos, y: topY(page, top, fontSize), size: fontSize, font, color });
}

function wrapText(font: PDFFont, text: string, size: number, width: number) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapped(page: PDFPage, text: string, x: number, top: number, width: number, height: number, font: PDFFont, size = 7, color = ENTRY) {
  const lines = wrapText(font, text, size, width);
  const maxLines = Math.max(1, Math.floor((height - 4) / (size + 2)));
  lines.slice(0, maxLines).forEach((line, index) => write(page, line, x, top + index * (size + 2), size, font, color, width));
  if (lines.length > maxLines && maxLines > 0) {
    let last = lines[maxLines - 1];
    while (last.length && font.widthOfTextAtSize(`${last}…`, size) > width) last = last.slice(0, -1);
    write(page, `${last}…`, x, top + (maxLines - 1) * (size + 2), size, font, color, width);
  }
}

function rule(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.45, color = GRID) {
  page.drawLine({ start: { x: x1, y: page.getHeight() - y1 }, end: { x: x2, y: page.getHeight() - y2 }, thickness, color });
}

function rect(page: PDFPage, x: number, top: number, width: number, height: number, options: { fill?: typeof WHITE; stroke?: typeof GRID; line?: number } = {}) {
  page.drawRectangle({
    x,
    y: page.getHeight() - top - height,
    width,
    height,
    color: options.fill,
    borderColor: options.stroke ?? GRID,
    borderWidth: options.line ?? 0.5,
  });
}

function checkbox(page: PDFPage, x: number, top: number, checked: boolean, size = 8) {
  rect(page, x, top, size, size, { line: 0.55 });
  if (checked) {
    rule(page, x + 1.6, top + 4.2, x + 3.2, top + 6.3, 0.9, ENTRY);
    rule(page, x + 3.2, top + 6.3, x + 6.9, top + 1.4, 0.9, ENTRY);
  }
}

function header(page: PDFPage, request: MemorialPdfRequest, pageNo: number, pageCount: number, title: string, logos: Logos) {
  rect(page, 20, 15, 555, 66, { line: 0.7 });
  rule(page, 131, 15, 131, 81, 0.55);
  rule(page, 533, 15, 533, 81, 0.55);
  page.drawImage(logos.cbmpaLogo, { x: 24, y: page.getHeight() - 22 - 50, width: 103, height: 50 });
  page.drawImage(logos.dgsciLogo, { x: 538, y: page.getHeight() - 25 - 38, width: 28, height: 38 });
  write(page, 'CORPO DE BOMBEIROS MILITAR DO PARÁ', 137, 23, 8.3, logos.bold, INK, 390, 'center');
  write(page, 'DEPARTAMENTO GERAL DE SEGURANÇA CONTRA INCÊNDIO', 137, 34, 7.2, logos.regular, MUTED, 390, 'center');
  write(page, title.toLocaleUpperCase('pt-BR'), 137, 50, 10, logos.bold, INK, 390, 'center');
  const protocolLabel = request.memorial_type === 'descriptive' ? 'PROTOCOLO SISGAT:' : 'PROTOCOLO DGSCI:';
  write(page, `${protocolLabel} ${memorialProtocol(request.request_number)}`, 25, 87, 7.3, logos.bold, INK);
  write(page, `PÁGINA ${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`, 470, 87, 7.3, logos.bold, INK, 100, 'right');
  rule(page, 22, 99, 573, 99, 0.65);
}

function section(page: PDFPage, y: number, number: string, title: string, logos: Logos, height = 16) {
  rect(page, X0, y, WIDTH, height, { fill: SECTION, line: 0.55 });
  write(page, number, X0 + 6, y + 3.5, 8, logos.bold, ENTRY);
  write(page, title.toLocaleUpperCase('pt-BR'), X0 + 25, y + 3.5, 8, logos.bold, INK, WIDTH - 32);
}

function fieldCell(page: PDFPage, x: number, y: number, width: number, height: number, cell: Cell, data: Record<string, string>, logos: Logos) {
  rect(page, x, y, width, height, { line: 0.45 });
  const labelX = x + 4;
  const available = width - 8;
  if (cell.checked) {
    checkbox(page, labelX, y + (height - 8) / 2, /sim|true|yes/i.test(val(data, cell.key || '')));
    write(page, cell.label, labelX + 12, y + (height - 7) / 2 - 1, 7, logos.regular, INK, available - 14);
    return;
  }
  write(page, cell.label, labelX, y + 3, cell.labelSize ?? 6.4, logos.regular, MUTED, available);
  const value = cell.value ?? (cell.key ? val(data, cell.key) : '');
  if (cell.multiline) wrapped(page, value, labelX, y + 12, available, height - 14, logos.regular, cell.fontSize ?? 7.4, ENTRY);
  else {
    const size = cell.fontSize ?? 8;
    const valueTop = height > 30 ? y + Math.round((height + size) / 2) - size : y + Math.max(8.5, height - size - 3.5);
    write(page, value, labelX, valueTop, size, logos.regular, ENTRY, available);
  }
}

function row(page: PDFPage, y: number, height: number, cells: Cell[], data: Record<string, string>, logos: Logos, x = X0, width = WIDTH) {
  const total = cells.reduce((sum, cell) => sum + cell.width, 0);
  let cursor = x;
  cells.forEach((cell, index) => {
    const cellWidth = index === cells.length - 1 ? x + width - cursor : width * cell.width / total;
    fieldCell(page, cursor, y, cellWidth, height, cell, data, logos);
    cursor += cellWidth;
  });
}

function box(page: PDFPage, x: number, y: number, width: number, height: number, label: string, text: string, logos: Logos, size = 7.4) {
  rect(page, x, y, width, height, { line: 0.55 });
  write(page, label, x + 5, y + 4, 6.5, logos.bold, MUTED, width - 10);
  wrapped(page, text, x + 5, y + 14, width - 10, height - 17, logos.regular, size, ENTRY);
}

function checksLine(page: PDFPage, y: number, label: string, choices: { key?: string; text: string; selected?: boolean }[], data: Record<string, string>, logos: Logos, height = 19) {
  rect(page, X0, y, WIDTH, height, { line: 0.5 });
  write(page, label, X0 + 5, y + 5, 6.7, logos.regular, INK, 225);
  let x = X0 + 232;
  for (const choice of choices) {
    const chosen = choice.selected ?? (choice.key ? val(data, choice.key).toLocaleLowerCase('pt-BR') === choice.text.toLocaleLowerCase('pt-BR') : false);
    checkbox(page, x, y + 5, chosen, 8);
    const textWidth = logos.regular.widthOfTextAtSize(choice.text, 6.7);
    write(page, choice.text, x + 11, y + 5, 6.7, logos.regular, INK);
    x += 17 + textWidth + 10;
  }
}

function table(page: PDFPage, x: number, y: number, widths: number[], headers: string[], rows: string[][], rowHeight: number, logos: Logos, opts: { redColumns?: number[]; fontSize?: number; headerHeight?: number } = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const headerHeight = opts.headerHeight ?? 22;
  let left = x;
  widths.forEach((w, index) => {
    const cellWidth = total === 100 ? WIDTH * w / 100 : w;
    rect(page, left, y, cellWidth, headerHeight, { fill: SECTION, line: 0.5 });
    wrapped(page, headers[index] || '', left + 3, y + 4, cellWidth - 6, headerHeight - 5, logos.bold, 6.3, INK);
    left += cellWidth;
  });
  let top = y + headerHeight;
  rows.forEach((values) => {
    left = x;
    widths.forEach((w, index) => {
      const cellWidth = total === 100 ? WIDTH * w / 100 : w;
      rect(page, left, top, cellWidth, rowHeight, { line: 0.45 });
      write(page, values[index] || '', left + 3, top + Math.max(3, (rowHeight - (opts.fontSize ?? 7.2)) / 2), opts.fontSize ?? 7.2, logos.regular, (opts.redColumns ?? []).includes(index) ? ENTRY : INK, cellWidth - 6, index === 0 ? 'left' : 'center');
      left += cellWidth;
    });
    top += rowHeight;
  });
  return top;
}

async function signatureImage(pdf: PDFDocument, page: PDFPage, dataUrl: string | undefined, x: number, lineY: number, width: number) {
  if (!dataUrl) return;
  try {
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1] || ''), char => char.charCodeAt(0));
    const image = dataUrl.startsWith('data:image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    page.drawImage(image, { x: x + 8, y: page.getHeight() - lineY + 2, width: width - 16, height: 24, opacity: 0.96 });
  } catch { /* Um arquivo de assinatura inválido não interrompe a emissão do formulário. */ }
}

async function signatureBlock(pdf: PDFDocument, page: PDFPage, data: Record<string, string>, mode: 'preview' | 'signed', director: MemorialPdfSignature | undefined, y: number, logos: Logos, opts: { examiner?: boolean; third?: boolean } = {}) {
  const count = opts.third ? 3 : 2;
  const each = WIDTH / count;
  const labels = opts.third
    ? ['Proprietário / Responsável pelo uso', 'Responsável Técnico', 'Subdiretoria · Conferência']
    : ['Proprietário / Responsável pelo uso', 'Responsável Técnico'];
  for (let index = 0; index < count; index++) {
    const x = X0 + each * index;
    rule(page, x + 10, y, x + each - 10, y, 0.65);
    if (index === 0) await signatureImage(pdf, page, data.owner_signature, x + 5, y, each - 10);
    if (index === 1) await signatureImage(pdf, page, data.technical_signature, x + 5, y, each - 10);
    write(page, labels[index], x + 4, y + 3, 6.5, logos.bold, INK, each - 8, 'center');
    const signerName = index === 0 ? val(data, 'owner_name') : index === 1 ? val(data, 'technical_name') : mode === 'signed' ? director?.name || '' : '';
    if (signerName) write(page, signerName, x + 5, y + 14, 6.8, logos.regular, INK, each - 10, 'center');
    if (index === 2 && mode === 'signed' && director?.date) write(page, director.date, x + 5, y + 23, 6, logos.regular, MUTED, each - 10, 'center');
  }
}

function footer(page: PDFPage, text: string, logos: Logos, y = 817) {
  rule(page, 22, y - 4, 573, y - 4, 0.4, MUTED);
  write(page, text, 24, y, 6.3, logos.regular, MUTED, 547);
}

function commonIdentification(page: PDFPage, data: Record<string, string>, request: MemorialPdfRequest, logos: Logos, y: number, opts: { descriptive?: boolean } = {}) {
  const legal = val(data, 'legal_name', request.company_name);
  const cnpj = val(data, 'cnpj', request.cnpj);
  const h = 20;
  row(page, y, h, [
    { label: 'Razão social', value: legal, width: 72, fontSize: 7.8 },
    { label: 'CNPJ', value: cnpj, width: 28, fontSize: 7.7 },
  ], data, logos);
  row(page, y + h, h, [
    { label: 'Nome fantasia', key: 'trade_name', width: 43 },
    { label: opts.descriptive ? 'CNAE' : 'Atividade comercial', key: opts.descriptive ? 'cnae' : 'activity', width: 57 },
  ], data, logos);
  row(page, y + h * 2, h, [
    { label: 'Endereço', key: 'address', width: 50 },
    { label: 'Bairro', key: 'neighborhood', width: 30 },
    { label: 'Nº', key: 'number', width: 20 },
  ], data, logos);
  row(page, y + h * 3, h, [
    { label: opts.descriptive ? 'CEP' : 'Complemento', key: opts.descriptive ? 'postal_code' : 'complement', width: 35 },
    { label: 'Município', key: 'city', width: 65 },
  ], data, logos);
  row(page, y + h * 4, h, [
    { label: 'E-mail da edificação', key: 'building_email', width: 44, fontSize: 7.1 },
    { label: 'Telefone', key: 'building_phone', width: 28 },
    { label: 'Celular', key: 'building_mobile', width: 28 },
  ], data, logos);
  if (opts.descriptive) {
    row(page, y + h * 5, h, [
      { label: 'Estabelecimento em atividade?', key: 'operating', width: 55 },
      { label: 'Data estimada para início', key: 'estimated_start', width: 45 },
    ], data, logos);
    return y + h * 6;
  }
  checksLine(page, y + h * 5, 'Estabelecimento em funcionamento (atividade operacional)?', [
    { key: 'operating', text: 'Sim' }, { key: 'operating', text: 'Não' },
  ], data, logos, h);
  return y + h * 6;
}

function drawResponsibles(page: PDFPage, data: Record<string, string>, logos: Logos, y: number, technicalTitle = 'Responsável Técnico') {
  section(page, y, '2', 'Identificação do proprietário ou responsável pelo uso', logos);
  row(page, y + 16, 20, [
    { label: 'Nome completo', key: 'owner_name', width: 72 }, { label: 'CPF', key: 'owner_cpf', width: 28 },
  ], data, logos);
  row(page, y + 36, 20, [
    { label: 'E-mail', key: 'owner_email', width: 48, fontSize: 7.2 }, { label: 'Telefone', key: 'owner_phone', width: 26 }, { label: 'Celular', key: 'owner_mobile', width: 26 },
  ], data, logos);
  section(page, y + 56, '3', technicalTitle, logos);
  row(page, y + 72, 20, [
    { label: 'Nome completo', key: 'technical_name', width: 70 }, { label: 'Registro profissional', key: 'technical_council', width: 30 },
  ], data, logos);
  row(page, y + 92, 20, [
    { label: 'E-mail', key: 'technical_email', width: 48, fontSize: 7.2 }, { label: 'Telefone', key: 'technical_phone', width: 26 }, { label: 'Celular', key: 'technical_mobile', width: 26 },
  ], data, logos);
  return y + 112;
}

function trrfValues(data: Record<string, string>) {
  const values = val(data, 'trrf_elements').split(/\n|;/).map(part => token(part, /(\d{1,3}|-)\s*(?:min(?:utos?)?)?\s*$/i));
  return Array.from({ length: 6 }, (_, index) => values[index] || '');
}

async function structural(pdf: PDFDocument, request: MemorialPdfRequest, mode: 'preview' | 'signed', sign: MemorialPdfSignature | undefined, logos: Logos) {
  const d = request.data;
  const page1 = pdf.addPage([A4.width, A4.height]);
  header(page1, request, 1, 2, 'Memorial de Segurança Estrutural Contra Incêndio', logos);
  section(page1, 104, '1', 'Identificação da edificação', logos);
  let y = commonIdentification(page1, d, request, logos, 120);
  y = drawResponsibles(page1, d, logos, y, 'Identificação do responsável técnico');
  section(page1, y, '4', 'Tempo requerido de resistência ao fogo (TRRF)', logos);
  checksLine(page1, y + 16, 'Critério adotado', [
    { text: 'Tabela de TRRF', selected: /tabela/i.test(val(d, 'trrf_method')) },
    { text: 'Método do tempo equivalente', selected: /equivalente/i.test(val(d, 'trrf_method')) },
    { text: 'Outro método', selected: /outro/i.test(val(d, 'trrf_method')) },
  ], d, logos, 22);
  const trrfRows = trrfValues(d);
  let tableY = y + 38;
  tableY = table(page1, X0, tableY, [78, 22], ['Elemento estrutural e/ou compartimentação', 'TRRF (min)'], [
    'Estruturas principais (pilares, contraventamentos, vigas essenciais à estabilidade)',
    'Vigas secundárias, não essenciais à estabilidade da edificação',
    'Compartimentação de escadas e elevadores de segurança',
    'Elementos de compartimentação (externa e interna), selagens de shaft',
    'Vedações usadas como isolamento de risco',
    'Paredes divisórias nas unidades autônomas',
    'Portas de acesso às unidades autônomas',
  ].map((label, index) => [label, trrfRows[index] || (index === 6 ? '-' : '')]), 15, logos, { redColumns: [1], fontSize: 6.4, headerHeight: 20 });
  section(page1, tableY, '5', 'Isenções ou reduções de TRRF', logos);
  const reductionOptions = [
    'Não foi adotada condição de redução ou isenção de TRRF.',
    'Foi adotada condição de redução do TRRF (detalhar abaixo).',
    'Foi adotada condição de isenção do TRRF (detalhar abaixo).',
  ];
  reductionOptions.forEach((label, index) => {
    const checked = index === 0 ? /nenhuma|não/i.test(val(d, 'reduction')) : index === 1 ? /redução/i.test(val(d, 'reduction')) : /isenção/i.test(val(d, 'reduction'));
    checkbox(page1, X0 + 8, tableY + 22 + index * 19, checked, 8);
    write(page1, label, X0 + 22, tableY + 22 + index * 19, 7, logos.regular, INK, WIDTH - 30);
    rule(page1, X0, tableY + 19 + (index + 1) * 19, X0 + WIDTH, tableY + 19 + (index + 1) * 19, 0.4);
  });
  box(page1, X0, tableY + 78, WIDTH, Math.max(76, 791 - (tableY + 78)), 'Detalhar as condições de isenção ou redução do TRRF utilizadas na edificação', val(d, 'reduction_details'), logos);
  footer(page1, 'Corpo de Bombeiros Militar do Pará · DGSCI', logos, 817);

  const page2 = pdf.addPage([A4.width, A4.height]);
  header(page2, request, 2, 2, 'Memorial de Segurança Estrutural · Continuação', logos);
  write(page2, `Protocolo ${memorialProtocol(request.request_number)}`, X0 + 4, 107, 7.2, logos.bold, INK);
  box(page2, X0, 121, WIDTH, 165, 'Outras observações pertinentes à segurança contra incêndio das estruturas', val(d, 'observations'), logos, 8);
  section(page2, 294, '6', 'Termo de responsabilidade', logos);
  box(page2, X0, 310, WIDTH, 72, 'Declaração', 'Responsabilizamo-nos, sob as penas da lei, que as informações constantes neste documento estão em conformidade com as legislações e normas técnicas vigentes para proteção da edificação.', logos, 8);
  row(page2, 382, 24, [{ label: 'Município e data da declaração', value: dateCity(d), width: 100 }], d, logos);
  section(page2, 417, '7', 'Assinaturas e conferência', logos);
  await signatureBlock(pdf, page2, d, mode, sign, 474, logos, { third: true });
  rect(page2, X0, 520, WIDTH, 230, { line: 0.55 });
  write(page2, 'CARIMBO CBMPA · ÁREA EXCLUSIVA DO CBMPA', X0 + 5, 523, 7, logos.bold, INK, WIDTH - 10, 'center');
  rule(page2, X0, 544, X0 + WIDTH, 544, 0.45);
  rule(page2, X0 + WIDTH / 2, 544, X0 + WIDTH / 2, 750, 0.45);
  write(page2, 'Observações do examinador', X0 + 5, 548, 6.6, logos.bold, MUTED);
  write(page2, 'Documento emitido em formulário eletrônico · DGSCI / CBMPA', X0 + 4, 767, 6.4, logos.regular, MUTED);
  footer(page2, 'Corpo de Bombeiros Militar do Pará · Departamento Geral de Segurança Contra Incêndio', logos, 817);
}

function brigadeRows(data: Record<string, string>) {
  return val(data, 'brigade_by_floor').split(/\n/).filter(Boolean).map(line => {
    const cols = line.split(/[|;]/).map(part => part.trim());
    const find = (pattern: RegExp) => cols.find(part => pattern.test(part))?.match(/[:=]\s*(.+)$/)?.[1]?.trim() || '';
    return [cols[0]?.split(',')[0] || '', find(/divisão/i), find(/risco/i), find(/população/i), find(/pf\s*<\s*10/i), find(/pf\s*>\s*10/i), find(/total/i)];
  });
}

async function brigade(pdf: PDFDocument, request: MemorialPdfRequest, mode: 'preview' | 'signed', sign: MemorialPdfSignature | undefined, logos: Logos) {
  const d = request.data;
  const page1 = pdf.addPage([A4.width, A4.height]);
  header(page1, request, 1, 2, 'Memorial de Brigada de Incêndio', logos);
  section(page1, 104, '1', 'Identificação da edificação', logos);
  let y = commonIdentification(page1, d, request, logos, 120);
  y = drawResponsibles(page1, d, logos, y, 'Identificação do autor do projeto');
  section(page1, y, '4', 'Identificação da empresa prestadora de serviço de brigada', logos);
  table(page1, X0, y + 16, [34, 30, 18, 18], ['Serviço prestado', 'Empresa prestadora', 'CNPJ', 'Cadastro CBMPA'], [[
    val(d, 'provider_type'), val(d, 'provider_name'), val(d, 'provider_cnpj'), val(d, 'provider_registry'),
  ]], 24, logos, { redColumns: [1, 2, 3], fontSize: 7, headerHeight: 22 });
  let top = y + 62;
  section(page1, top, '5', 'Características da edificação', logos);
  row(page1, top + 16, 20, [
    { label: 'Área total construída (m²)', key: 'built_area', width: 25 },
    { label: 'Grupo de ocupação', value: val(d, 'occupancy').split(/[/-]/)[0], width: 20 },
    { label: 'Divisão', value: val(d, 'occupancy').split(/[/-]/).at(-1) || '', width: 20 },
    { label: 'Altura (m)', key: 'building_height', width: 18 }, { label: 'Pavimentos', key: 'floors', width: 17 },
  ], d, logos);
  row(page1, top + 36, 20, [
    { label: 'Classificação quanto à altura', key: 'height_class', width: 33 },
    { label: 'Carga de incêndio (MJ/m²)', key: 'fire_load', width: 34 }, { label: 'Risco', key: 'risk', width: 33 },
  ], d, logos);
  section(page1, top + 56, '6', 'Brigada de incêndio · Parte I da Instrução Técnica', logos);
  checksLine(page1, top + 72, 'Nível de treinamento', [
    { key: 'training_level', text: 'Básico' }, { key: 'training_level', text: 'Intermediário' }, { key: 'training_level', text: 'Avançado' },
  ], d, logos, 20);
  checksLine(page1, top + 92, 'Existe troca de funcionários entre os turnos?', [
    { key: 'shift_change', text: 'Não' }, { key: 'shift_change', text: 'Sim' },
  ], d, logos, 20);
  section(page1, top + 112, '7', 'Cálculo e distribuição da brigada por pavimento ou compartimento', logos);
  const rows = brigadeRows(d);
  const tableBottom = table(page1, X0, top + 128, [19, 14, 14, 14, 14, 14, 11], [
    'Pavimento', 'Divisão', 'Risco', 'População fixa', 'PF < 10', 'PF > 10', 'Total',
  ], Array.from({ length: 6 }, (_, index) => rows[index] || ['', '', '', '', '', '', '']), 18, logos, { redColumns: [0, 1, 2, 3, 4, 5, 6], fontSize: 6.7, headerHeight: 24 });
  write(page1, `Total geral de brigadistas: ${val(d, 'brigade_total')}`, X0 + 4, tableBottom + 4, 7, logos.bold, ENTRY);
  box(page1, X0, tableBottom + 20, WIDTH, 36, 'Notas específicas', 'A distribuição deve considerar todos os turnos, ausências e a população fixa informada para cada pavimento.', logos, 6.8);
  footer(page1, 'Formulário de segurança contra incêndio · DGSCI / CBMPA', logos, 817);

  const page2 = pdf.addPage([A4.width, A4.height]);
  header(page2, request, 2, 2, 'Memorial de Brigada · Continuação', logos);
  write(page2, `Protocolo ${memorialProtocol(request.request_number)}`, X0 + 4, 107, 7.2, logos.bold, INK);
  section(page2, 119, '8', 'Brigada particular · Parte II da Instrução Técnica', logos);
  checksLine(page2, 135, 'Existe brigada particular na edificação?', [
    { key: 'private_brigade', text: 'Não (isento)' }, { key: 'private_brigade', text: 'Sim' },
  ], d, logos, 20);
  table(page2, X0, 155, [20, 20, 15, 20, 15, 10], ['Regime', 'Turnos', 'Brigadistas/turno', 'Troca de turno', 'Brigadistas/turno', 'Total'], [
    ['Com atividade', val(d, 'active_shifts'), val(d, 'active_brigadists'), 'Sem atividade', val(d, 'inactive_brigadists'), val(d, 'brigade_total')],
  ], 27, logos, { redColumns: [1, 2, 4, 5], headerHeight: 27, fontSize: 7 });
  box(page2, X0, 213, WIDTH, 55, 'Observações da brigada particular e dados complementares', val(d, 'private_brigade_details') || val(d, 'brigade_observations'), logos);
  box(page2, X0, 276, WIDTH, 63, 'Nota importante', 'Os certificados de formação de brigada de incêndio e de formação de brigada particular devem acompanhar a solicitação de vistoria, quando aplicável.', logos, 7.4);
  section(page2, 347, '9', 'Termo de responsabilidade', logos);
  box(page2, X0, 363, WIDTH, 65, 'Declaração', 'Responsabilizamo-nos, sob as penas da lei, que as informações constantes neste documento estão em conformidade com as legislações e normas técnicas vigentes.', logos, 8);
  row(page2, 428, 22, [{ label: 'Município e data', value: dateCity(d), width: 100 }], d, logos);
  section(page2, 461, '10', 'Assinaturas e conferência', logos);
  await signatureBlock(pdf, page2, d, mode, sign, 519, logos, { third: true });
  rect(page2, X0, 563, WIDTH, 200, { line: 0.55 });
  write(page2, 'CARIMBO CBMPA · ÁREA EXCLUSIVA DO CBMPA', X0 + 5, 567, 7, logos.bold, INK, WIDTH - 10, 'center');
  rule(page2, X0, 589, X0 + WIDTH, 589, 0.45);
  rule(page2, X0 + WIDTH / 2, 589, X0 + WIDTH / 2, 763, 0.45);
  write(page2, 'Observações do examinador', X0 + 5, 593, 6.6, logos.bold, MUTED);
  footer(page2, 'Formulário de segurança contra incêndio · DGSCI / CBMPA', logos, 817);
}

function suction(data: Record<string, string>, pattern: RegExp, fallback = '') { return token(val(data, 'suction_data'), pattern) || fallback; }
function discharge(data: Record<string, string>, pattern: RegExp, fallback = '') { return token(val(data, 'discharge_data'), pattern) || fallback; }

async function hydrant(pdf: PDFDocument, request: MemorialPdfRequest, mode: 'preview' | 'signed', sign: MemorialPdfSignature | undefined, logos: Logos) {
  const d = request.data;
  const page1 = pdf.addPage([A4.width, A4.height]);
  header(page1, request, 1, 2, 'Memorial de Cálculo · Sistema de Hidrantes', logos);
  section(page1, 104, '1', 'Identificação da obra', logos);
  row(page1, 120, 20, [{ label: 'Estabelecimento', key: 'trade_name', width: 42 }, { label: 'Endereço', key: 'address', width: 58 }], d, logos);
  row(page1, 140, 20, [{ label: 'Bairro', key: 'neighborhood', width: 30 }, { label: 'Município', key: 'city', width: 30 }, { label: 'Telefone', key: 'building_phone', width: 40 }], d, logos);
  row(page1, 160, 20, [{ label: 'Proprietário', key: 'owner_name', width: 60 }, { label: 'Área total construída (m²)', key: 'built_area', width: 20 }, { label: 'ART/RRT', key: 'art_rrt', width: 20 }], d, logos);
  row(page1, 180, 20, [{ label: 'Responsável técnico', key: 'technical_name', width: 55 }, { label: 'Registro profissional', key: 'technical_council', width: 25 }, { label: 'Ocupação/divisão', key: 'occupancy', width: 20 }], d, logos);
  section(page1, 200, '2', 'Dados em função do tipo de sistema adotado', logos);
  checksLine(page1, 216, 'Norma adotada', [
    { text: 'NBR', selected: /nbr/i.test(val(d, 'standard')) }, { text: 'IT 03 CBMPA', selected: /it|cbmpa/i.test(val(d, 'standard')) },
  ], d, logos, 20);
  row(page1, 236, 23, [
    { label: 'Tipo de sistema preventivo', key: 'system_type', width: 17 },
    { label: 'Tipo / diâmetro da mangueira', value: `${token(val(d, 'hose'), /tipo\s*(\d+)/i)} · ${token(val(d, 'hose'), /(mangotinho|mangueira)/i)}`, width: 29 },
    { label: 'Diâmetro', value: token(val(d, 'hose'), /(\d+(?:\s*\d+\/\d+)?\s*(?:mm|”|"))/i), width: 17 },
    { label: 'Comprimento', value: token(val(d, 'hose'), /(\d+\s*x\s*\d+m?)/i), width: 21 },
    { label: 'Tipo de mangueira', value: token(val(d, 'hose'), /tipo\s*(\d+)/i), width: 16 },
  ], d, logos);
  row(page1, 259, 22, [
    { label: 'Tipo de esguicho', key: 'nozzle', width: 38 },
    { label: 'Quantidade de hidrantes existentes', key: 'hydrant_count', width: 31 },
    { label: 'Hidrantes considerados simultâneos', key: 'simultaneous_hydrants', width: 31 },
  ], d, logos);
  section(page1, 281, '3', 'Reserva técnica de incêndio (RTI)', logos);
  checksLine(page1, 297, 'Tipo de reservatório', [
    { key: 'tank_type', text: 'Elevado' }, { key: 'tank_type', text: 'Subterrâneo' }, { text: 'Nível do piso', selected: /nível do piso/i.test(val(d, 'tank_type')) },
  ], d, logos, 20);
  row(page1, 317, 21, [
    { label: 'Material e proteção do reservatório', key: 'tank_material', width: 65, fontSize: 7 },
    { label: 'Capacidade RTI (L)', key: 'rti', width: 17 }, { label: 'Capacidade total (L)', key: 'tank_capacity', width: 18 },
  ], d, logos);
  section(page1, 338, '4', 'Dados da sucção', logos);
  row(page1, 354, 21, [{ label: 'Material da tubulação', value: suction(d, /material\s*:?\s*([^;\n]+)/i), width: 53 }, { label: 'Diâmetro (pol.)', value: suction(d, /diâmetro\s*:?\s*([^;\n]+)/i), width: 20 }, { label: 'Perda unitária (m/m)', value: suction(d, /perda unitária\s*:?\s*([^;\n]+)/i), width: 27 }], d, logos);
  row(page1, 375, 21, [{ label: 'Vazão no cálculo (L/min)', value: suction(d, /vazão\s*:?\s*([\d,.]+)/i), width: 25 }, { label: 'Perda de carga total (mca)', value: suction(d, /perda total\s*:?\s*([^;\n]+)/i, '1,11'), width: 25 }, { label: 'Comprimento equivalente (m)', value: suction(d, /comprimento equivalente\s*:?\s*([^;\n]+)/i), width: 25 }, { label: 'Altura de sucção (m)', value: suction(d, /altura de sucção\s*:?\s*([^;\n]+)/i), width: 25 }], d, logos);
  row(page1, 396, 21, [{ label: 'Comprimento real (m)', value: suction(d, /comprimento real\s*:?\s*([^;\n]+)/i), width: 25 }, { label: 'Perdas localizadas (m)', value: suction(d, /perdas localizadas\s*:?\s*([^;\n]+)/i), width: 25 }, { label: 'Altura geométrica (mca)', key: 'geometric_head', width: 25 }, { label: 'NPSH calculado (m)', value: suction(d, /NPSH(?: calculado)?\s*:?\s*([^;\n]+)/i), width: 25 }], d, logos);
  section(page1, 417, '5', 'Dados do recalque', logos);
  row(page1, 433, 21, [{ label: 'Material da tubulação', value: discharge(d, /material\s*:?\s*([^;\n]+)/i), width: 55 }, { label: 'Diâmetro (pol.)', value: discharge(d, /diâmetro\s*:?\s*([^;\n]+)/i), width: 20 }, { label: 'Hidrante de cálculo', value: token(val(d, 'discharge_data'), /hidrante\s*(?:n[ºo.]*)?\s*:?\s*(\d+)/i), width: 25 }], d, logos);
  section(page1, 454, '5.2', 'Primeira opção de cálculo · Hidrante mais desfavorável', logos, 15);
  row(page1, 469, 21, [{ label: 'Vazão (L/min)', value: discharge(d, /vazão\s*:?\s*([\d,.]+)/i), width: 20 }, { label: 'Comprimento equivalente (m)', value: discharge(d, /comprimento equivalente\s*:?\s*([^;\n]+)/i), width: 24 }, { label: 'Comprimento real (m)', value: discharge(d, /comprimento real\s*:?\s*([^;\n]+)/i), width: 22 }, { label: 'Perda unitária (m/m)', value: discharge(d, /perda unitária\s*:?\s*([^;\n]+)/i), width: 18 }, { label: 'Perda total (mca)', key: 'losses', width: 16 }], d, logos);
  row(page1, 490, 21, [{ label: 'Velocidade na sucção (m/s)', value: discharge(d, /velocidade sucção\s*:?\s*([^;\n]+)/i), width: 50 }, { label: 'Velocidade no recalque (m/s)', value: discharge(d, /velocidade recalque\s*:?\s*([^;\n]+)/i), width: 50 }], d, logos);
  section(page1, 511, '5.3', 'Segunda opção de cálculo · Por trechos · 1º e 2º hidrantes mais desfavoráveis', logos, 15);
  const splitX = X0 + WIDTH / 2;
  const half = WIDTH / 2;
  const optionRows = [
    ['Primeiro hidrante mais desfavorável · Trecho A', 'Segundo hidrante mais desfavorável · Trecho A'],
    ['Diâmetro da tubulação (pol.):', 'Diâmetro da tubulação (pol.):'],
    ['Vazão utilizada no cálculo (L/min):', 'Vazão utilizada no cálculo (L/min):'],
    ['Comprimento equivalente (m):', 'Comprimento equivalente (m):'],
    ['Comprimento real da tubulação (m):', 'Comprimento real da tubulação (m):'],
    ['Perda de carga unitária (m/m):', 'Perda de carga unitária (m/m):'],
    ['Perda de carga total (mca):', 'Perda de carga total (mca):'],
    ['Trecho B · Hidrante nº: __________', 'Trecho B · Hidrante nº: __________'],
  ];
  let optionY = 526;
  for (let i = 0; i < optionRows.length; i++) {
    const h = i === 0 || i === 7 ? 23 : 20;
    for (let col = 0; col < 2; col++) {
      const x = col === 0 ? X0 : splitX;
      rect(page1, x, optionY, half, h, { fill: i === 0 || i === 7 ? SECTION : WHITE, line: 0.45 });
      write(page1, optionRows[i][col], x + 5, optionY + 6, i === 0 || i === 7 ? 6.2 : 6.5, i === 0 || i === 7 ? logos.bold : logos.regular, INK, half - 10);
    }
    optionY += h;
  }
  box(page1, X0, optionY, WIDTH, 41, 'Observação', 'Se forem utilizados mais de dois hidrantes para o cálculo da bomba de incêndio, os dados complementares deverão ser anexados ao memorial.', logos, 6.8);
  row(page1, optionY + 41, 22, [{ label: 'Soma das perdas de carga do recalque dos hidrantes mais desfavoráveis (mca)', key: 'losses', width: 100 }], d, logos);
  footer(page1, 'Memorial de cálculo do sistema preventivo por hidrantes · DGSCI / CBMPA', logos, 817);

  const page2 = pdf.addPage([A4.width, A4.height]);
  header(page2, request, 2, 2, 'Memorial de Cálculo · Dimensionamento da Bomba', logos);
  section(page2, 104, '6', 'Cálculo da bomba de incêndio', logos);
  row(page2, 120, 50, [{ label: '6.1 · Altura geométrica entre o hidrante desfavorável e a tomada de água do reservatório (mca)', key: 'geometric_head', width: 100, fontSize: 9 }], d, logos);
  row(page2, 170, 50, [{ label: '6.2 · Pressão mínima disponível no hidrante mais desfavorável (mca)', key: 'available_pressure', width: 100, fontSize: 9 }], d, logos);
  row(page2, 220, 50, [{ label: '6.3 · Altura manométrica (m)', key: 'manometric_head', width: 100, fontSize: 9 }], d, logos);
  section(page2, 270, '7', 'Potência e dados comerciais da bomba principal', logos);
  row(page2, 286, 23, [{ label: 'Potência calculada (cv)', key: 'pump_calculated_power', width: 25 }, { label: 'Potência comercial (cv)', value: token(val(d, 'pump'), /(\d+(?:[,.]\d+)?)\s*cv/i), width: 25 }, { label: 'Pressão máxima sem vazão (mca)', value: token(val(d, 'pump'), /(?:pressão|pressao)\s*(\d+(?:[,.]\d+)?)/i) || token(val(d, 'pump'), /(\d+(?:[,.]\d+)?)\s*mca/i), width: 25 }, { label: 'Vazão (m³/h)', value: token(val(d, 'pump'), /(\d+(?:[,.]\d+)?)\s*m³?\/h/i), width: 25 }], d, logos);
  row(page2, 309, 23, [{ label: 'Diâmetro do rotor (mm)', value: token(val(d, 'pump'), /rotor\s*:?\s*(\d+)/i), width: 35 }, { label: 'Modelo comercial', value: val(d, 'pump'), width: 65, fontSize: 7 }], d, logos);
  section(page2, 332, '8', 'Bomba auxiliar (jockey)', logos);
  checksLine(page2, 348, 'Existe bomba jockey no sistema?', [{ key: 'jockey_exists', text: 'Sim' }, { key: 'jockey_exists', text: 'Não' }], d, logos, 20);
  row(page2, 368, 23, [{ label: 'Dados comerciais da bomba jockey', key: 'jockey', width: 100 }], d, logos);
  section(page2, 391, '9', 'Alimentação da bomba de incêndio', logos);
  row(page2, 407, 25, [{ label: 'Tipo de alimentação', key: 'electrical', width: 100 }], d, logos);
  section(page2, 432, '10', 'Acionamento e desligamento da bomba principal', logos);
  row(page2, 448, 22, [{ label: 'Acionamento manual / automático e desligamento', key: 'pump_start_stop', width: 100 }], d, logos);
  section(page2, 470, '11', 'Acionamento automático da bomba auxiliar (jockey)', logos);
  row(page2, 486, 22, [{ label: 'Dispositivo de acionamento', key: 'jockey_control', width: 100 }], d, logos);
  section(page2, 508, '12', 'Alarme do funcionamento do sistema preventivo', logos);
  row(page2, 524, 22, [{ label: 'Tipo e dispositivo', key: 'alarm', width: 100 }], d, logos);
  section(page2, 546, '13', 'Painel de sinalização', logos);
  row(page2, 562, 22, [{ label: 'Localização', key: 'signaling_panel', width: 100 }], d, logos);
  section(page2, 584, '14', 'Termo de responsabilidade', logos);
  box(page2, X0, 600, WIDTH, 45, 'Declaração', 'Responsabilizamo-nos pela veracidade dos dados e pelo dimensionamento do sistema, em conformidade com as normas técnicas aplicáveis.', logos, 7.2);
  row(page2, 645, 22, [{ label: 'Município e data', value: dateCity(d), width: 100 }], d, logos);
  await signatureBlock(pdf, page2, d, mode, sign, 699, logos, { third: true });
  rect(page2, X0, 744, WIDTH, 52, { line: 0.55 });
  write(page2, 'PARA USO EXCLUSIVO DO CBMPA · SEÇÃO DE ANÁLISE DE PROJETO', X0 + 4, 748, 7, logos.bold, INK, WIDTH - 8, 'center');
  rule(page2, X0, 767, X0 + WIDTH, 767, 0.45);
  footer(page2, 'O presente documento deverá ser apresentado com os anexos técnicos exigidos pelo CBMPA.', logos, 817);
}

function exits(data: Record<string, string>) {
  return val(data, 'exits').split(/\n/).filter(Boolean).map(line => [
    token(line, /^([^,|]+)/), token(line, /(?:área|area)\s*[:=]?\s*([\d,.]+)/i),
    token(line, /população\s*[:=]?\s*(\d+)/i), token(line, /largura\s*[:=]?\s*([\d,.]+)/i),
    token(line, /distância\s*[:=]?\s*([\d,.]+)/i), token(line, /saídas?\s*[:=]?\s*(\d+)/i),
  ]);
}

function measureIsSet(data: Record<string, string>, label: string, status: 'exigida' | 'existente') {
  const line = val(data, 'required_measures').split(/\n/).find(item => item.toLocaleLowerCase('pt-BR').includes(label.toLocaleLowerCase('pt-BR'))) || '';
  return /^(sim|1|x)$/i.test(token(line, new RegExp(`${status}\\s*[:=]\\s*(sim|não|nao|1|0|x)`, 'i')));
}

async function descriptive(pdf: PDFDocument, request: MemorialPdfRequest, mode: 'preview' | 'signed', sign: MemorialPdfSignature | undefined, logos: Logos) {
  const d = request.data;
  const page1 = pdf.addPage([A4.width, A4.height]);
  header(page1, request, 1, 4, 'Memorial Descritivo', logos);
  section(page1, 104, '1', 'Identificação da edificação', logos);
  let y = commonIdentification(page1, d, request, logos, 120, { descriptive: true });
  section(page1, y, '2', 'Identificação do proprietário ou responsável legal', logos);
  row(page1, y + 16, 20, [{ label: 'Nome completo', key: 'owner_name', width: 72 }, { label: 'CPF', key: 'owner_cpf', width: 28 }], d, logos);
  row(page1, y + 36, 20, [{ label: 'E-mail', key: 'owner_email', width: 48 }, { label: 'Telefone', key: 'owner_phone', width: 26 }, { label: 'Celular', key: 'owner_mobile', width: 26 }], d, logos);
  section(page1, y + 56, '3', 'Identificação do responsável técnico', logos);
  row(page1, y + 72, 20, [{ label: 'Nome completo', key: 'technical_name', width: 60 }, { label: 'Registro CREA/CAU', key: 'technical_council', width: 40 }], d, logos);
  row(page1, y + 92, 20, [{ label: 'E-mail', key: 'technical_email', width: 60 }, { label: 'ART/RRT', key: 'art_rrt', width: 40 }], d, logos);
  y += 112;
  section(page1, y, '4', 'Tipo de serviço', logos);
  checksLine(page1, y + 16, '', [
    { text: 'Análise de projeto técnico', selected: /análise/i.test(val(d, 'service_type')) },
    { text: 'Ampliação de área', selected: /ampliação/i.test(val(d, 'service_type')) },
    { text: 'Modificação / substituição', selected: /modificação|substituição/i.test(val(d, 'service_type')) },
  ], d, logos, 22);
  row(page1, y + 38, 22, [{ label: 'Protocolo anterior', key: 'previous_protocol', width: 35 }, { label: 'Área anteriormente aprovada (m²)', key: 'previous_area', width: 30 }, { label: 'Área total (m²)', key: 'built_area', width: 35 }], d, logos);
  section(page1, y + 60, '5', 'Características da edificação', logos);
  row(page1, y + 76, 22, [{ label: 'Anterior ao regulamento vigente?', key: 'existing_before_regulation', width: 35 }, { label: 'Área total (m²)', key: 'built_area', width: 20 }, { label: 'Área útil / risco (m²)', key: 'usable_area', width: 20 }, { label: 'Área ampliada (m²)', key: 'expanded_area', width: 25 }], d, logos);
  row(page1, y + 98, 22, [{ label: 'Ocupação / divisão', key: 'occupancy', width: 28 }, { label: 'Carga de incêndio (MJ/m²)', key: 'fire_load', width: 24 }, { label: 'Risco', key: 'risk', width: 20 }, { label: 'Altura (m)', key: 'building_height', width: 12 }, { label: 'Pavimentos', key: 'floors', width: 16 }], d, logos);
  row(page1, y + 120, 22, [{ label: 'Classificação quanto à altura', key: 'height_class', width: 35 }, { label: 'Possui subsolo?', key: 'basement', width: 25 }, { label: 'Pavimentos de subsolo', key: 'basement_floors', width: 20 }, { label: 'Isolamento de risco?', key: 'risk_isolation', width: 20 }], d, logos);
  row(page1, y + 142, 22, [{ label: 'Tabela das medidas de segurança utilizada', key: 'measures_table', width: 100 }], d, logos);
  const special = val(d, 'special_installations').split(/\n|;/).filter(Boolean);
  const specialItems = ['Caldeira', 'Central de GLP', 'Central de gás', 'Elevador de emergência', 'Explosivo', 'Subestação', 'Gerador', 'Armazenamento de inflamáveis', 'Outros'];
  section(page1, y + 164, '5.9', 'Instalações sujeitas a normas específicas', logos);
  specialItems.forEach((label, index) => {
    const col = index % 3; const line = Math.floor(index / 3);
    const width = WIDTH / 3; const x = X0 + col * width; const top = y + 180 + line * 20;
    rect(page1, x, top, width, 20, { line: 0.45 });
    checkbox(page1, x + 5, top + 6, special.some(item => item.toLowerCase().includes(label.toLowerCase())), 8);
    write(page1, label, x + 18, top + 6, 6.5, logos.regular, INK, width - 23);
  });
  footer(page1, 'Memorial descritivo · DGSCI / CBMPA', logos, 817);

  const page2 = pdf.addPage([A4.width, A4.height]);
  header(page2, request, 2, 4, 'Memorial Descritivo · Medidas de Segurança', logos);
  section(page2, 104, '6', 'Medidas de segurança contra incêndio e emergência existentes e documentos obrigatórios', logos);
  const measures = [
    'Saídas de emergência', 'Iluminação de emergência', 'Sinalização de emergência', 'Extintores', 'Acesso de viatura',
    'Detecção de incêndio', 'Alarme de incêndio', 'Brigada de incêndio', 'Brigada profissional', 'Hidrantes ou mangotinhos',
    'Compartimentação vertical', 'Compartimentação horizontal', 'Isolamento de risco', 'Plano de intervenção',
    'Controle de materiais de acabamento/revestimento', 'Chuveiros automáticos', 'Resfriamento', 'Espuma',
    'Segurança estrutural contra incêndio', 'Escada pressurizada', 'Gases limpos', 'Proteção contra descargas atmosféricas',
  ];
  const mx = X0; const mw = WIDTH; const heads = [240, 63, 63, mw - 366];
  let cy = 120;
  table(page2, mx, cy, heads, ['Medida de segurança contra incêndio', 'Exigida', 'Existente', 'Documento obrigatório'], [], 0, logos, { headerHeight: 25, fontSize: 6.2 });
  let cursor = cy + 25;
  measures.forEach((label, index) => {
    const h = 21;
    let x = mx;
    const values = [label, '', '', token(val(d, 'required_measures').split(/\n/).find(line => line.toLowerCase().includes(label.toLowerCase())) || '', /documento\s*[:=]\s*(.+)$/i)];
    heads.forEach((w, col) => {
      rect(page2, x, cursor, w, h, { line: 0.45 });
      if (col === 0) write(page2, label, x + 4, cursor + 6, 6.3, logos.regular, INK, w - 7);
      if (col === 1 || col === 2) checkbox(page2, x + (w - 8) / 2, cursor + 6, measureIsSet(d, label, col === 1 ? 'exigida' : 'existente'));
      if (col === 3 && values[3]) wrapped(page2, values[3], x + 3, cursor + 5, w - 6, h - 7, logos.regular, 6, ENTRY);
      x += w;
    });
    cursor += h;
  });
  box(page2, X0, cursor + 3, WIDTH, 125, 'Observações do item 6', val(d, 'measures_notes'), logos, 7.5);
  footer(page2, 'Memorial descritivo · DGSCI / CBMPA', logos, 817);

  const page3 = pdf.addPage([A4.width, A4.height]);
  header(page3, request, 3, 4, 'Memorial Descritivo · Saídas e Equipamentos', logos);
  section(page3, 104, '7', 'Saídas de emergência', logos);
  const exitRows = exits(d);
  let cy3 = table(page3, X0, 120, [22, 16, 15, 16, 18, 13], ['Pavimento ou setor', 'Área (m²)', 'População', 'Largura (m)', 'Distância máxima (m)', 'Nº saídas'], [
    exitRows[0] || ['', '', '', '', '', ''], exitRows[1] || ['', '', '', '', '', ''], ['', '', '', '', '', ''], ['', '', '', '', '', ''],
  ], 20, logos, { redColumns: [0, 1, 2, 3, 4, 5], headerHeight: 26, fontSize: 7 });
  box(page3, X0, cy3, WIDTH, 39, 'Observação sobre pavimentos e descarga', val(d, 'exit_observations'), logos, 6.9);
  row(page3, cy3 + 39, 21, [{ label: 'População total', key: 'total_population', width: 50 }, { label: 'População do pavimento de maior capacidade', key: 'max_floor_population', width: 50 }], d, logos);
  section(page3, cy3 + 60, '7.2', 'Escadas, rampas, elevadores e locais com grande público', logos);
  checksLine(page3, cy3 + 76, 'Tipo de escada', [
    { key: 'stair_type', text: 'Comum' }, { key: 'stair_type', text: 'Protegida' }, { key: 'stair_type', text: 'Prova de fumaça' }, { key: 'stair_type', text: 'Sem escada' },
  ], d, logos, 20);
  row(page3, cy3 + 96, 20, [{ label: 'Largura (m)', key: 'stair_width', width: 25 }, { label: 'Material da escada', key: 'stair_material', width: 35 }, { label: 'Pressurizada?', key: 'smoke_pressurized', width: 40 }], d, logos);
  checksLine(page3, cy3 + 116, 'Existe rampa?', [{ key: 'ramp_exists', text: 'Não' }, { key: 'ramp_exists', text: 'Sim' }], d, logos, 19);
  row(page3, cy3 + 135, 20, [{ label: 'Segmentos / desnível / inclinação', key: 'ramp_segments', width: 60 }, { label: 'Largura das descargas (m)', key: 'discharge_width', width: 40 }], d, logos);
  checksLine(page3, cy3 + 155, 'Existe elevador de emergência?', [{ key: 'emergency_elevator', text: 'Não' }, { key: 'emergency_elevator', text: 'Sim' }], d, logos, 19);
  checksLine(page3, cy3 + 174, 'Local com capacidade acima de 100 pessoas?', [{ key: 'large_public_room', text: 'Não' }, { key: 'large_public_room', text: 'Sim' }], d, logos, 19);
  section(page3, cy3 + 193, '8', 'Extintores de incêndio', logos);
  row(page3, cy3 + 209, 20, [{ label: 'Distância máxima real (m) · Classe A', value: val(d, 'extinguisher_distance').split(/[;\n]/)[0]?.replace(/\D/g, ''), width: 34 }, { label: 'Classe B', value: val(d, 'extinguisher_distance').split(/[;\n]/)[1]?.replace(/\D/g, ''), width: 33 }, { label: 'Classe C', value: val(d, 'extinguisher_distance').split(/[;\n]/)[2]?.replace(/\D/g, ''), width: 33 }], d, logos);
  const ext = val(d, 'extinguishers').split(/[,;|]/).map(part => part.trim());
  table(page3, X0, cy3 + 229, [30, 20, 20, 30], ['Agente extintor', 'Carga', 'Quantidade', 'Capacidade extintora'], [[ext[0] || '', ext[1] || '', ext[2] || '', ext[3] || '']], 22, logos, { redColumns: [0, 1, 2, 3], headerHeight: 22, fontSize: 7 });
  section(page3, cy3 + 273, '9', 'Sinalização de segurança contra incêndio e emergência', logos);
  const signageItems = (key: string, codes: string[]) => codes
    .map(code => {
      const amount = token(val(d, key), new RegExp(`(?:^|[;\\n|])\\s*${code}\\s*[:=]\\s*(\\d+)`, 'i'));
      return amount ? `${code}: ${amount}` : '';
    }).filter(Boolean).join('   •   ');
  const basicCodes = Array.from({ length: 21 }, (_, index) => `S${index + 1}`);
  const equipmentCodes = Array.from({ length: 21 }, (_, index) => `E${index + 1}`);
  table(page3, X0, cy3 + 289, [23, 77], ['Sinalização básica', 'Código e quantidade de placas'], [
    ['Proibição', signageItems('signage_basic', ['P1', 'P2', 'P3', 'P4', 'P5'])],
    ['Alerta', signageItems('signage_basic', Array.from({ length: 7 }, (_, index) => `A${index + 1}`))],
    ['Orientação e salvamento', signageItems('signage_basic', basicCodes)],
    ['Equipamentos', signageItems('signage_basic', equipmentCodes)],
  ], 18, logos, { redColumns: [1], headerHeight: 20, fontSize: 6.2 });
  const complementaryY = cy3 + 289 + 20 + 4 * 18 + 5;
  table(page3, X0, complementaryY, [23, 77], ['Sinalização complementar', 'Código e quantidade de placas'], [
    ['Rotas de fuga / continuidade', signageItems('signage_complementary', ['C1', 'C2a', 'C2b', 'C2c', 'C2d', 'C2e', 'C2f'])],
    ['Mensagens escritas', signageItems('signage_complementary', ['M1', 'M2', 'M3', 'M4', 'M5'])],
    ['Indicação de obstáculos', signageItems('signage_complementary', ['O1', 'O2'])],
    ['Planta de emergência', signageItems('signage_complementary', ['P1'])],
  ], 18, logos, { redColumns: [1], headerHeight: 20, fontSize: 6.2 });
  footer(page3, 'Memorial descritivo · DGSCI / CBMPA', logos, 817);

  const page4 = pdf.addPage([A4.width, A4.height]);
  header(page4, request, 4, 4, 'Memorial Descritivo · Iluminação e Alarme', logos);
  section(page4, 104, '10', 'Sistema de iluminação de emergência', logos);
  checksLine(page4, 120, 'Sistema adotado', [
    { text: 'Conjunto de blocos autônomos', selected: /blocos autônomos|autônomas|luminária/i.test(`${val(d, 'emergency_lighting')} ${val(d, 'emergency_lighting_type')}`) },
    { text: 'Sistema centralizado com baterias', selected: /centralizado/i.test(val(d, 'emergency_lighting')) },
    { text: 'Grupo motor-gerador', selected: /gerador/i.test(val(d, 'emergency_lighting')) },
  ], d, logos, 22);
  checksLine(page4, 142, 'Função do sistema', [
    { text: 'Aclaramento', selected: true }, { text: 'Balizamento', selected: false },
  ], d, logos, 20);
  row(page4, 162, 22, [{ label: 'Tipo / localização', key: 'emergency_lighting_type', width: 55 }, { label: 'Quantidade', value: token(val(d, 'emergency_lighting'), /(\d+)\s*unidades/i), width: 20 }, { label: 'Autonomia (min)', value: token(val(d, 'emergency_lighting'), /(\d+)\s*min/i), width: 25 }], d, logos);
  section(page4, 184, '11', 'Sistema de detecção e alarme de incêndio', logos);
  checksLine(page4, 200, 'Sistema de detecção instalado?', [{ key: 'detection_exists', text: 'Não' }, { key: 'detection_exists', text: 'Sim' }], d, logos, 20);
  row(page4, 220, 21, [{ label: 'Tipos e localização dos detectores', key: 'detector_types', width: 65 }, { label: 'Raio máximo de ação (m)', key: 'detector_radius', width: 35 }], d, logos);
  checksLine(page4, 241, 'Existe sistema de alarme?', [{ key: 'alarm_exists', text: 'Não' }, { key: 'alarm_exists', text: 'Sim' }], d, logos, 20);
  row(page4, 261, 21, [{ label: 'Tipo do alarme', key: 'alarm_type', width: 45 }, { label: 'Distância até o acionador (m)', key: 'alarm_distance', width: 30 }, { label: 'Dispositivo', key: 'alarm_device', width: 25 }], d, logos);
  section(page4, 282, '12', 'Documentos apresentados no processo', logos);
  const docLabels = [
    'Memorial descritivo', 'Memorial do sistema de hidrantes', 'Memorial de chuveiros automáticos', 'Memorial de resfriamento',
    'Memorial de espuma', 'Memorial de escada pressurizada', 'Memorial de isolamento de risco', 'Memorial de compartimentação',
    'Memorial da central de GLP', 'Memorial de elevador de emergência', 'Memorial de segurança estrutural contra incêndio',
    'Laudo técnico SPDA', 'ART/RRT de projeto / levantamento arquitetônico', 'ART/RRT de segurança contra incêndio',
    'ART correspondente ao laudo técnico SPDA',
  ];
  const docs = val(d, 'documents').toLocaleLowerCase('pt-BR');
  const docMatches = [
    /memorial descritivo/i, /memorial.*hidrantes/i, /chuveiros automáticos/i, /resfriamento/i, /memorial de espuma/i,
    /escada pressurizada/i, /isolamento de risco/i, /compartimentação/i, /central de glp/i, /elevador de emergência/i,
    /segurança estrutural/i, /laudo técnico spda/i, /art.*projeto|levantamento/i, /art.*segurança contra incêndio|art.*incêndio/i,
    /art correspondente.*spda/i,
  ];
  docLabels.forEach((label, index) => {
    const col = index < 8 ? 0 : 1; const within = index < 8 ? index : index - 8;
    const x = X0 + col * (WIDTH / 2); const w = WIDTH / 2; const top = 298 + within * 22;
    rect(page4, x, top, w, 22, { line: 0.45 });
    checkbox(page4, x + 4, top + 7, docMatches[index].test(docs), 8);
    write(page4, label, x + 17, top + 7, 6.1, logos.regular, INK, w - 21);
  });
  box(page4, X0, 474, WIDTH, 43, 'Outros documentos apresentados', val(d, 'other_documents'), logos, 7);
  section(page4, 525, '13', 'Termo de responsabilidade', logos);
  box(page4, X0, 541, WIDTH, 62, 'Declaração', 'Responsabilizamo-nos, sob as penas da lei, que as informações constantes deste documento estão em conformidade com as legislações e normas técnicas vigentes para proteção da edificação.', logos, 7.6);
  row(page4, 603, 22, [{ label: 'Município e data da declaração', value: dateCity(d), width: 100 }], d, logos);
  section(page4, 636, '14', 'Assinaturas e conferência', logos);
  await signatureBlock(pdf, page4, d, mode, sign, 694, logos, { third: true });
  rect(page4, X0, 739, WIDTH, 50, { line: 0.55 });
  write(page4, 'CARIMBO CBMPA · ÁREA EXCLUSIVA DO CBMPA', X0 + 5, 743, 7, logos.bold, INK, WIDTH - 10, 'center');
  rule(page4, X0, 764, X0 + WIDTH, 764, 0.45);
  footer(page4, 'Diretoria de Serviços Técnicos · DGSCI / CBMPA', logos, 817);
}

export async function renderMemorialForm(
  pdf: PDFDocument,
  request: MemorialPdfRequest,
  mode: 'preview' | 'signed',
  signature: MemorialPdfSignature | undefined,
  logos: Logos,
) {
  switch (request.memorial_type) {
    case 'structural_safety': await structural(pdf, request, mode, signature, logos); break;
    case 'brigade': await brigade(pdf, request, mode, signature, logos); break;
    case 'hydrant_calculation': await hydrant(pdf, request, mode, signature, logos); break;
    case 'descriptive': await descriptive(pdf, request, mode, signature, logos); break;
  }
}
