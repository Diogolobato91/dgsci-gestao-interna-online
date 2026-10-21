import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { compareSatRegions } from './satRegionOrder';
export function buildSatRegionsPdf(rows: {gbm: string; sat: string; municipios: string}[], issuedAt = new Date()) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const stamp = issuedAt.toLocaleDateString('pt-BR');
  autoTable(doc, {
    startY: 53, margin: { top: 53, bottom: 23, left: 16, right: 16 },
    head: [['UNIDADE', 'SEÇÃO DE ATIVIDADES TÉCNICAS', 'MUNICÍPIOS DE ABRANGÊNCIA']],
    body: [...rows].sort(compareSatRegions).map(row => [row.gbm, row.sat, row.municipios || 'Não informado']),
    theme: 'grid', rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.4, lineColor: [224,224,224], lineWidth: .15, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [153,23,35], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248,248,248] },
    columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold' }, 1: { cellWidth: 48 }, 2: { cellWidth: 104 } },
    didDrawPage: () => {
      doc.setFillColor(153,23,35); doc.rect(16,15,2,25,'F');
      doc.setTextColor(30,30,30); doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.text('CORPO DE BOMBEIROS MILITAR DO PARÁ',22,20);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text('DGSCI | Segurança Contra Incêndio e Emergências',22,26);
      doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.text('SATs Regionais',22,36);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(90); doc.text('Unidades e municípios de abrangência | Relação para consulta',22,43);
      doc.setDrawColor(210); doc.line(16,278,194,278);
      doc.setFontSize(8); doc.setTextColor(95); doc.text(`Emitido em ${stamp} | ${rows.length} unidades`,16,284);
      doc.text('DGSCI / CBMPA - Abrangência sujeita a validação institucional',16,289);
    },
  });
  const pages = doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(95);doc.text(`Página ${page} de ${pages}`,194,284,{align:'right'});}
  return doc;
}
