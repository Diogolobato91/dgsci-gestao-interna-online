import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CLEANING_TASKS } from './cleaningTypes';
import type { CleaningDay } from './cleaningTypes';
import { shortDate } from './staffAvailability';
export function buildCleaningPdf(rows:CleaningDay[],month:string){
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 autoTable(doc,{startY:44,margin:{top:44,left:14,right:14,bottom:25},theme:'grid',rowPageBreak:'avoid',
 head:[['DATA',...CLEANING_TASKS.map(t=>t.label)]],
 body:rows.map(r=>[shortDate(r.service_date),...CLEANING_TASKS.map(t=>r.assignments.find(a=>a.task===t.key)?.nome||'A definir')]),
 styles:{font:'helvetica',fontSize:8,cellPadding:3.5,overflow:'linebreak',lineColor:[220,220,220],lineWidth:.15},
 headStyles:{fillColor:[153,23,35],textColor:255,fontSize:8},alternateRowStyles:{fillColor:[248,248,248]},
 didDrawPage:()=>{doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('CORPO DE BOMBEIROS MILITAR DO PARÁ | DGSCI',14,16);doc.setFontSize(17);doc.text('Conservação e limpeza - Escala dos VCs',14,26);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Competência: '+month.split('-').reverse().join('/')+' | Dias cadastrados no sistema',14,35);doc.setFontSize(8);doc.text('Recolher o lixo até 13h30. Dar o pronto ao chefe do plantão até o fim do expediente.',14,196);doc.text('Corredores da frente e dos fundos: varrer e passar pano. Sala do coronel: segunda a sexta.',14,201);}});
 const noted=rows.filter(r=>r.notes);if(noted.length){doc.addPage();doc.setFontSize(14);doc.text('Observações da escala',14,18);autoTable(doc,{startY:26,head:[['Data','Observação']],body:noted.map(r=>[shortDate(r.service_date),r.notes]),styles:{fontSize:9,cellPadding:4},headStyles:{fillColor:[153,23,35]}});}
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${page}/${doc.getNumberOfPages()}`,282,202,{align:'right'});}
 return doc;
}
