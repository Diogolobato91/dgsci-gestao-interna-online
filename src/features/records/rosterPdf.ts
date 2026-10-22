import { jsPDF } from 'jspdf';
import {loadPdfLogo,drawPdfHeader,finishPdfPages,PDF_TABLE_TOP} from '@/lib/pdf/branding';
import autoTable from 'jspdf-autotable';
import { DUTY_ROLES,formatContact } from './roster';
import type { Plantao,RosterPerson } from './roster';
import { absenceOn,shortDate } from './staffAvailability';
import type { StaffAbsence } from './staffAvailability';
import { daysOfPeriod } from './rosterExport';
export async function buildRosterPdf({start,end,duties,people,absences,issuedAt=new Date()}:{start:string;end:string;duties:Plantao[];people:RosterPerson[];absences:StaffAbsence[];issuedAt?:Date}){
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const map=new Map(people.map(p=>[p.id,p]));
 const days=daysOfPeriod(start,end);const logo=await loadPdfLogo();
 autoTable(doc,{startY:PDF_TABLE_TOP,margin:{left:14,right:14,top:PDF_TABLE_TOP,bottom:24},theme:'grid',rowPageBreak:'avoid',
 head:[['DATA',...DUTY_ROLES,'OBSERVAÇÕES']],body:days.map(day=>{const duty=duties.find(d=>d.service_date===day);if(!duty)return[shortDate(day),'Não cadastrado','Não cadastrado','Não cadastrado',''];return[shortDate(day),...(['chief_id','assistant_id','expert_id']as const).map(key=>{const p=map.get(duty[key]);if(!p)return'Designação sem cadastro disponível';return `${p.posto_graduacao} ${p.nome}\n${formatContact(p.resolved_contact)}${absenceOn(absences,p.staff_id,day)?'\nREVISAR DISPONIBILIDADE':''}${!p.staff_id?'\nVínculo com efetivo a conferir':''}`;}),duty.notes||''];}),
 styles:{font:'helvetica',fontSize:8,cellPadding:3.5,overflow:'linebreak',valign:'top',lineColor:[220,220,220],lineWidth:.15},headStyles:{fillColor:[153,23,35],textColor:255,fontSize:8},alternateRowStyles:{fillColor:[248,248,248]},columnStyles:{0:{cellWidth:24},1:{cellWidth:63},2:{cellWidth:63},3:{cellWidth:63},4:{cellWidth:56}},
 didDrawPage:()=>drawPdfHeader(doc,logo,'Escala de plantão',`${shortDate(start)} a ${shortDate(end)} | Equipes e contatos para consulta`)});
 finishPdfPages(doc,issuedAt);return doc;
}
