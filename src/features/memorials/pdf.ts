import { jsPDF } from 'jspdf';
import { memorialTypes, type MemorialField, type MemorialType } from './templates';

export type MemorialPdfRequest={id:string;request_number:number;memorial_type:MemorialType;protocol:string;company_name:string;cnpj:string;contact_name:string;contact_email:string;data:Record<string,string>};
export type MemorialPdfSignature={name:string;date:string};

const pageWidth=210,pageHeight=297,left=12,columnGap=7,columnWidth=(pageWidth-left*2-columnGap)/2,lineHeight=3.25;
type LayoutItem={kind:'section';title:string}|{kind:'field';field:MemorialField};
const valueOf=(field:MemorialField,data:Record<string,string>)=>String(data?.[field.key]??'').trim()||'—';

export async function generateMemorialPdf(request:MemorialPdfRequest,mode:'preview'|'signed',signature?:MemorialPdfSignature){
 const template=memorialTypes.find(item=>item.id===request.memorial_type);if(!template)throw new Error('Modelo de memorial inválido.');
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});let logo='';
 try{const response=await fetch('/portal/assets/dgsci-logo.png');if(response.ok){const bytes=await response.arrayBuffer();logo=`data:image/png;base64,${btoa(Array.from(new Uint8Array(bytes),byte=>String.fromCharCode(byte)).join(''))}`;}}catch{/* Cabeçalho textual mantém a identificação institucional. */}
 // Keep identical body geometry in preview and final PDF; signing only adds the electronic signature.
 const firstContentY=50,lastContentBottom=264;
 const header=(page:number)=>{
  pdf.setFillColor(162,25,48);pdf.rect(0,0,pageWidth,2.4,'F');if(logo)pdf.addImage(logo,'PNG',left,6,10.5,13.2);
  pdf.setTextColor(39,48,62);pdf.setFont('helvetica','bold');pdf.setFontSize(8.2);pdf.text('CORPO DE BOMBEIROS MILITAR DO PARÁ',logo?left+13:left,10.5);
  pdf.setFont('helvetica','normal');pdf.setFontSize(6.7);pdf.text('DEPARTAMENTO GERAL DE SEGURANÇA CONTRA INCÊNDIO',logo?left+13:left,14.2);
  pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.setTextColor(162,25,48);pdf.text(template.officialTitle.toLocaleUpperCase('pt-BR'),105,25,{align:'center',maxWidth:185});
  pdf.setDrawColor(174,180,190);pdf.setLineWidth(.25);pdf.line(left,29,pageWidth-left,29);pdf.setTextColor(59,69,84);pdf.setFont('helvetica','normal');pdf.setFontSize(6.5);
  pdf.text(`PROTOCOLO: ${request.protocol||'—'}   ·   SOLICITAÇÃO MEM-${String(request.request_number).padStart(6,'0')}`,left,33);pdf.text(`${page===1?'':'CONTINUAÇÃO  ·  '}${page}/${template.pages}`,pageWidth-left,33,{align:'right'});
  if(mode==='preview'){pdf.setFillColor(255,247,228);pdf.roundedRect(left,36,pageWidth-left*2,7,1.2,1.2,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(6.5);pdf.setTextColor(120,79,18);pdf.text('PRÉVIA PARA CONFERÊNCIA — DOCUMENTO AINDA NÃO ASSINADO',pageWidth/2,40.5,{align:'center'});}
 };
 const fieldLayout=(field:MemorialField)=>{
  pdf.setFont('helvetica','bold');pdf.setFontSize(6.4);const labelWidth=field.type==='textarea'?columnWidth-2:31;const labelLines=pdf.splitTextToSize(field.label,labelWidth) as string[];
  pdf.setFont('helvetica','normal');pdf.setFontSize(7);const valueWidth=field.type==='textarea'?columnWidth-2:columnWidth-34;const valueLines=pdf.splitTextToSize(valueOf(field,request.data),valueWidth) as string[];
  return{height:field.type==='textarea'?(labelLines.length+valueLines.length)*lineHeight+3.7:Math.max(labelLines.length,valueLines.length)*lineHeight+2.6,labelLines,valueLines,labelWidth,valueWidth};
 };
 const renderPage=(page:number)=>{
  if(page>1)pdf.addPage('a4','portrait');header(page);
  const top=page===1?firstContentY+4:firstContentY;
  if(page===1){pdf.setFont('helvetica','bold');pdf.setFontSize(6.8);pdf.setTextColor(68,77,92);pdf.text(`EMPRESA: ${request.company_name}`,left,firstContentY);pdf.text(`CNPJ: ${request.cnpj}`,pageWidth-left,firstContentY,{align:'right'});}
  const columns:[{y:number;items:LayoutItem[]},{y:number;items:LayoutItem[]}]=[{y:top,items:[]},{y:top,items:[]}];
  const sections=template.sections.filter(section=>section.page===page);
  for(const section of sections){
   let column=columns[0].y<=columns[1].y?columns[0]:columns[1];column.items.push({kind:'section',title:section.title});column.y+=7.8;
   for(const field of section.fields){
    const height=fieldLayout(field).height;
    if(column.y+height>lastContentBottom){const other=column===columns[0]?columns[1]:columns[0];if(other.y+7.8+height>lastContentBottom)throw new Error(`O conteúdo de “${field.label}” excede a página ${page} do modelo. Revise textos muito longos antes de gerar o PDF.`);column=other;column.items.push({kind:'section',title:`${section.title} · continuação`});column.y+=7.8;}
    column.items.push({kind:'field',field});column.y+=height;
   }
  }
  columns.forEach((column,index)=>{
   const x=left+index*(columnWidth+columnGap);let y=top;
   for(const item of column.items){
    if(item.kind==='section'){pdf.setFillColor(247,239,241);pdf.rect(x,y,columnWidth,5.5,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(6.5);pdf.setTextColor(139,31,50);pdf.text(item.title,x+1.4,y+3.7,{maxWidth:columnWidth-2.5});y+=7.8;continue;}
    const {field}=item,{labelLines,valueLines,height,labelWidth}=fieldLayout(item.field);const requiredBottom= y+height;
    if(requiredBottom>lastContentBottom)throw new Error(`O conteúdo de “${field.label}” excede a página ${page} do modelo. Revise textos muito longos antes de gerar o PDF.`);
    pdf.setFont('helvetica','bold');pdf.setFontSize(6.4);pdf.setTextColor(56,65,80);pdf.text(labelLines,x,y);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(36,45,59);
    if(field.type==='textarea'){const valueY=y+labelLines.length*lineHeight;pdf.text(valueLines,x,valueY);y+=height;}
    else{pdf.text(valueLines,x+labelWidth+2,y);y+=height;}
    y+=1.1;pdf.setDrawColor(228,231,235);pdf.setLineWidth(.15);pdf.line(x,y-.6,x+columnWidth,y-.6);
   }
  });
  if(page===template.pages){const y=274;pdf.setDrawColor(75,85,100);pdf.setLineWidth(.25);pdf.line(42,y,168,y);pdf.setFont('helvetica','bold');pdf.setFontSize(7.1);pdf.setTextColor(36,45,59);pdf.text(mode==='signed'?(signature?.name||'Subdiretoria DGSCI'):'',105,y-2,{align:'center'});pdf.setFont('helvetica','normal');pdf.setFontSize(6.5);pdf.text(mode==='signed'?`SUBDIRETORIA · Assinado eletronicamente em ${signature?.date||''}`:'ASSINATURA FINAL · SUBDIRETORIA DGSCI',105,y+3,{align:'center'});}
  pdf.setDrawColor(216,220,226);pdf.setLineWidth(.2);pdf.line(left,287,pageWidth-left,287);pdf.setFont('helvetica','normal');pdf.setFontSize(6);pdf.setTextColor(113,121,134);pdf.text('DGSCI · DOCUMENTO OPERACIONAL',left,291);pdf.text(`PÁGINA ${page} DE ${template.pages}`,pageWidth-left,291,{align:'right'});
 };
 for(let page=1;page<=template.pages;page++)renderPage(page);
 if(pdf.getNumberOfPages()!==template.pages)throw new Error('O PDF não preservou a quantidade de páginas do modelo.');
 return pdf.output('blob');
}
