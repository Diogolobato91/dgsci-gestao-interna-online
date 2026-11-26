import { PDFDocument, StandardFonts } from 'pdf-lib';
import { memorialProtocol, type MemorialType } from './templates';
import { renderMemorialForm, type MemorialPdfRequest, type MemorialPdfSignature } from './pdf-layout';

export type { MemorialPdfRequest, MemorialPdfSignature } from './pdf-layout';

async function loadPng(pdf: PDFDocument, path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Não foi possível carregar a identidade visual institucional.');
  return pdf.embedPng(await response.arrayBuffer());
}

export async function generateMemorialPdf(
  request: MemorialPdfRequest,
  mode: 'preview' | 'signed',
  signature?: MemorialPdfSignature,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Memorial ${request.memorial_type} · Protocolo ${memorialProtocol(request.request_number)}`);
  pdf.setAuthor('DGSCI · Corpo de Bombeiros Militar do Pará');
  pdf.setSubject('Formulário técnico de segurança contra incêndio');

  const [cbmpaLogo, dgsciLogo, regular, bold] = await Promise.all([
    loadPng(pdf, '/portal/assets/cbmpa-defesa-civil.png'),
    loadPng(pdf, '/portal/assets/dgsci-logo.png'),
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);

  await renderMemorialForm(pdf, request, mode, signature, {
    cbmpaLogo,
    dgsciLogo,
    regular,
    bold,
  });
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

export type { MemorialType };
