import { jsPDF } from 'jspdf';
import {loadPdfLogo,drawPdfHeader,finishPdfPages,PDF_TABLE_TOP} from '@/lib/pdf/branding';
import autoTable from 'jspdf-autotable';
import { cleaningTasks } from './cleaningTypes';
import type { CleaningDay } from './cleaningTypes';
import { shortDate } from './staffAvailability';
export async function buildCleaningPdf(rows:CleaningDay[],month:string){
 const allTasks=cleaningTasks(rows);const tasks=allTasks.slice(0,6);const logo=await loadPdfLogo();const issuedAt=new Date();
 const subtitle='Competência: '+month.split('-').reverse().join('/');
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 autoTable(doc,{startY:PDF_TABLE_TOP,margin:{top:PDF_TABLE_TOP,left:14,right:14,bottom:34},theme:'grid',rowPageBreak:'avoid',
 head:[['DATA',...tasks.map(t=>t.label)]],
 body:rows.map(r=>[shortDate(r.service_date),...tasks.map(t=>r.assignments.find(a=>a.task===t.key)?.nome||'A definir')]),
 styles:{font:'helvetica',fontSize:8,cellPadding:3.5,overflow:'linebreak',lineColor:[220,220,220],lineWidth:.15},
 headStyles:{fillColor:[153,23,35],textColor:255,fontSize:8},alternateRowStyles:{fillColor:[248,248,248]},
 didDrawPage:()=>{drawPdfHeader(doc,logo,"Escala Faxina VC's",subtitle+' | Dias cadastrados');doc.setFontSize(8);doc.setTextColor(70);doc.text('Recolher o lixo até 13h30. Informar a conclusão ao chefe do plantão até o fim do expediente.',14,185);doc.text('Corredores: varrer e passar pano. Sala do coronel: segunda a sexta.',14,190);}});
 const extras=rows.flatMap(r=>r.assignments.filter(a=>a.label).map(a=>[shortDate(r.service_date),a.label!,a.nome||'A definir']));
 if(extras.length){doc.addPage();autoTable(doc,{startY:PDF_TABLE_TOP,margin:{top:PDF_TABLE_TOP,left:14,right:14,bottom:24},head:[['Data','Setor/local','Responsável']],body:extras,styles:{font:'helvetica',fontSize:9,cellPadding:3},headStyles:{fillColor:[153,23,35]},didDrawPage:()=>drawPdfHeader(doc,logo,"Escala Faxina VC's",subtitle+' | Setores e locais adicionais')});}
 const noted=rows.filter(r=>r.notes);if(noted.length){doc.addPage();autoTable(doc,{startY:PDF_TABLE_TOP,margin:{top:PDF_TABLE_TOP,left:14,right:14,bottom:24},head:[['Data','Observação']],body:noted.map(r=>[shortDate(r.service_date),r.notes]),styles:{font:'helvetica',fontSize:9,cellPadding:4},headStyles:{fillColor:[153,23,35]},didDrawPage:()=>drawPdfHeader(doc,logo,"Escala Faxina VC's",subtitle+' | Observações')});}
 finishPdfPages(doc,issuedAt);
 return doc;
}
