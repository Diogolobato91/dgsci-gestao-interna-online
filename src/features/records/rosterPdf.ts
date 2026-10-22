import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DUTY_ROLES,formatContact } from './roster';
import type { Plantao,RosterPerson } from './roster';
import { absenceOn,shortDate } from './staffAvailability';
import type { StaffAbsence } from './staffAvailability';
import { daysOfPeriod } from './rosterExport';
export function buildRosterPdf({start,end,duties,people,absences,issuedAt=new Date()}:{start:string;end:string;duties:Plantao[];people:RosterPerson[];absences:StaffAbsence[];issuedAt?:Date}){
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const map=new Map(people.map(p=>[p.id,p]));
 const days=daysOfPeriod(start,end);
 autoTable(doc,{startY:44,margin:{left:14,right:14,top:44,bottom:24},theme:'grid',rowPageBreak:'avoid',
 head:[['DATA',...DUTY_ROLES,'OBSERVAÇÕES']],body:days.map(day=>{const duty=duties.find(d=>d.service_date===day);if(!duty)return[shortDate(day),'Não cadastrado','Não cadastrado','Não cadastrado',''];return[shortDate(day),...(['chief_id','assistant_id','expert_id']as const).map(key=>{const p=map.get(duty[key]);if(!p)return'Designação sem cadastro disponível';return `${p.posto_graduacao} ${p.nome}\n${formatContact(p.resolved_contact)}${absenceOn(absences,p.staff_id,day)?'\nREVISAR DISPONIBILIDADE':''}${!p.staff_id?'\nVínculo com efetivo a conferir':''}`;}),duty.notes||''];}),
 styles:{font:'helvetica',fontSize:8,cellPadding:3.5,overflow:'linebreak',valign:'top',lineColor:[220,220,220],lineWidth:.15},headStyles:{fillColor:[153,23,35],textColor:255,fontSize:8},alternateRowStyles:{fillColor:[248,248,248]},columnStyles:{0:{cellWidth:24},1:{cellWidth:63},2:{cellWidth:63},3:{cellWidth:63},4:{cellWidth:56}},
 didDrawPage:()=>{doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('CORPO DE BOMBEIROS MILITAR DO PARÁ | DGSCI',14,16);doc.setFontSize(18);doc.text('Escala de plantão',14,27);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`${shortDate(start)} a ${shortDate(end)} | Equipes e contatos para consulta`,14,36);doc.setFontSize(8);doc.setTextColor(90);doc.text('Emitido em '+issuedAt.toLocaleString('pt-BR',{timeZone:'America/Fortaleza'})+' | Dados sujeitos a atualização.',14,197);doc.setTextColor(0);}});
 const count=doc.getNumberOfPages();for(let page=1;page<=count;page++){doc.setPage(page);doc.setFontSize(8);doc.text(`Página ${page} de ${count}`,283,197,{align:'right'});}return doc;
}
