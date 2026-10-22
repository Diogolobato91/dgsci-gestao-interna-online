import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {loadPdfLogo,drawPdfHeader,finishPdfPages,PDF_TABLE_TOP} from '@/lib/pdf/branding';
import { compareSatRegions } from './satRegionOrder';
export async function buildSatRegionsPdf(rows: {gbm: string; sat: string; municipios: string}[], issuedAt = new Date()) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo=await loadPdfLogo();
  autoTable(doc, {
    startY: PDF_TABLE_TOP, margin: { top: PDF_TABLE_TOP, bottom: 23, left: 14, right: 14 },
    head: [['UNIDADE', 'SEÇÃO DE ATIVIDADES TÉCNICAS', 'MUNICÍPIOS DE ABRANGÊNCIA']],
    body: [...rows].sort(compareSatRegions).map(row => [row.gbm, row.sat, row.municipios || 'Não informado']),
    theme: 'grid', rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.4, lineColor: [224,224,224], lineWidth: .15, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [153,23,35], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248,248,248] },
    columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold' }, 1: { cellWidth: 48 }, 2: { cellWidth: 108 } },
    didDrawPage:()=>drawPdfHeader(doc,logo,'SATs Regionais','Unidades e municípios de abrangência'),
  });
  finishPdfPages(doc,issuedAt,`${rows.length} unidades`);
  return doc;
}
