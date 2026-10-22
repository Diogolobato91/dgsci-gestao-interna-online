import type { jsPDF } from 'jspdf';

let logoPromise:Promise<Uint8Array>|undefined;
/** Reutiliza a logo oficial já exibida no portal; falhas permitem nova tentativa. */
export function loadPdfLogo(){
 if(!logoPromise)logoPromise=fetch('/portal/assets/dgsci-logo.png').then(async response=>{
  if(!response.ok)throw new Error('Não foi possível carregar a logo da DGSCI.');
  return new Uint8Array(await response.arrayBuffer());
 }).catch(error=>{logoPromise=undefined;throw error;});
 return logoPromise;
}
export const PDF_TABLE_TOP=44;
export function drawPdfHeader(doc:jsPDF,logo:Uint8Array,title:string,subtitle:string){
 const width=doc.internal.pageSize.getWidth();
 doc.addImage(logo,'PNG',14,9,14.34,18,'dgsci-logo','FAST');
 doc.setTextColor(35);doc.setFont('helvetica','bold');doc.setFontSize(9);
 doc.text('CORPO DE BOMBEIROS MILITAR DO PARÁ',33,14);
 doc.setFont('helvetica','normal');doc.setFontSize(7.2);
 doc.text('DEPARTAMENTO GERAL DE SEGURANÇA CONTRA INCÊNDIO E EMERGÊNCIAS',33,19);
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(title,33,26);
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(85);doc.text(subtitle,14,35);
 doc.setDrawColor(153,23,35);doc.setLineWidth(.4);doc.line(14,39,width-14,39);
 doc.setTextColor(0);
}
export function finishPdfPages(doc:jsPDF,issuedAt=new Date(),note=''){
 const count=doc.getNumberOfPages();const width=doc.internal.pageSize.getWidth();const height=doc.internal.pageSize.getHeight();
 for(let page=1;page<=count;page++){
  doc.setPage(page);doc.setDrawColor(220);doc.setLineWidth(.15);doc.line(14,height-14,width-14,height-14);
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(95);
  doc.text('DGSCI / CBMPA | Emitido em '+issuedAt.toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})+(note?' | '+note:''),14,height-9);
  doc.text(`Página ${page} de ${count}`,width-14,height-9,{align:'right'});
 }
}
