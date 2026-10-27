import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {loadPdfLogo,drawPdfHeader,finishPdfPages,PDF_TABLE_TOP} from '@/lib/pdf/branding';
import {compareSatRegions} from './satRegionOrder';
export type SatRegionPdfRow={gbm:string;sat:string;municipios:string;crb?:string;risp?:string};
/** Compacta sem cortar células. Listas maiores voltam ao formato paginado legível. */
export async function buildSatRegionsPdf(rows:SatRegionPdfRow[],issuedAt=new Date()){
 const logo=await loadPdfLogo();
 const body=[...rows].sort(compareSatRegions).map(r=>[r.crb||'—',r.risp||'—',r.gbm,r.sat,r.municipios||'Não informado no documento']);
 function render(fontSize:number,padding:number){
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  autoTable(doc,{
   startY:PDF_TABLE_TOP,margin:{top:PDF_TABLE_TOP,bottom:18,left:12,right:12},
   head:[['CRB','RISP','UNIDADE','CAT / SAT','MUNICÍPIOS E/OU BAIRROS ATENDIDOS']],body,
   theme:'grid',rowPageBreak:'avoid',
   styles:{font:'helvetica',fontSize,cellPadding:{top:padding,bottom:padding,left:1.2,right:1.2},lineColor:[205,205,205],lineWidth:.12,valign:'middle',overflow:'linebreak'},
   headStyles:{fillColor:[153,23,35],textColor:255,fontSize:7,fontStyle:'bold',cellPadding:1.3},
   alternateRowStyles:{fillColor:[248,248,248]},
   columnStyles:{0:{cellWidth:13,fontStyle:'bold'},1:{cellWidth:14},2:{cellWidth:16,fontStyle:'bold'},3:{cellWidth:28,fontStyle:'bold'},4:{cellWidth:115}},
   didDrawPage:()=>drawPdfHeader(doc,logo,'SATs Regionais','CRB, RISP, unidades e regiões de atendimento'),
  });
  return doc;
 }
 for(const [font,padding]of [[8,1],[7.5,.8],[7,.65]]){
  const doc=render(font,padding);
  if(doc.getNumberOfPages()===1){finishPdfPages(doc,issuedAt,`${rows.length} unidades`);return doc;}
 }
 const doc=render(8,1.5);finishPdfPages(doc,issuedAt,`${rows.length} unidades`);return doc;
}
