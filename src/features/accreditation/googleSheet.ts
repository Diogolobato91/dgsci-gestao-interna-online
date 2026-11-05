import type {Accreditation} from './model';

export const ACCREDITATION_SHEET_URL='https://docs.google.com/spreadsheets/d/1Z4GC69_lE6z2ubKMqmP3UQrvoOwCjVof6Owyw3YJVzM/edit?usp=sharing';
const SHEET_ID='1Z4GC69_lE6z2ubKMqmP3UQrvoOwCjVof6Owyw3YJVzM';
const SHEETS={company:'0',professional:'1179762174'} as const;
type Cell={v?:unknown;f?:string}|null;
type Gviz={table?:{cols?:{label?:string}[];rows?:{c?:Cell[]}[]}};

type SheetKind=keyof typeof SHEETS;
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
const cellText=(cell:Cell)=>String(cell?.f??cell?.v??'').replace(/\s+/g,' ').trim();
const aliases={
 modality:['modalidade relacao geral','modalidade'],
 name:['empresas e profissionais','empresa profissional','empresa','profissional','razao social','nome'],
 contact:['contato','telefone','whatsapp'],
 region:['regiao','risp','crb'],
 protocol:['protocolo','processo'],
 validUntil:['validade','valido ate','vencimento'],
};
function columnFor(headers:string[], alternatives:string[]){return headers.findIndex(header=>alternatives.some(alias=>header===alias||header.includes(alias)));}
function parseDate(value:string){
 const iso=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(iso)return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
 const br=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(br)return `${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;
 const gviz=value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);if(gviz)return `${gviz[1]}-${String(Number(gviz[2])+1).padStart(2,'0')}-${gviz[3].padStart(2,'0')}`;
 return '';
}
function stableId(kind:SheetKind,index:number,row:string[]){
 let hash=2166136261;for(const char of row.join('\u001f')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return `${kind}-${index}-${(hash>>>0).toString(36)}`;
}
export function gvizToAccreditations(payload:Gviz,kind:SheetKind,loadedAt:string):Accreditation[]{
 const sourceRows=(payload.table?.rows||[]).map(row=>(row.c||[]).map(cellText));
 const labels=(payload.table?.cols||[]).map(column=>normalize(column.label));
 const headerIndex=sourceRows.findIndex(row=>{const normalized=row.map(normalize);return columnFor(normalized,aliases.name)>=0&&columnFor(normalized,aliases.modality)>=0&&columnFor(normalized,aliases.validUntil)>=0;});
 const headers=headerIndex>=0?sourceRows[headerIndex].map(normalize):labels;
 const start=headerIndex>=0?headerIndex+1:0;
 const modality=columnFor(headers,aliases.modality),name=columnFor(headers,aliases.name),contact=columnFor(headers,aliases.contact),region=columnFor(headers,aliases.region),protocol=columnFor(headers,aliases.protocol),validUntil=columnFor(headers,aliases.validUntil);
 if(modality<0||name<0||validUntil<0)throw new Error('A estrutura da planilha oficial foi alterada.');
 return sourceRows.slice(start).map((row,index)=>{
  const valid_until=parseDate(row[validUntil]||'');
  if(!row[name]?.trim()||!valid_until)return null;
  return {id:stableId(kind,index,row),kind,modality:row[modality]?.trim()||'Não informada',name:row[name].trim(),contact:contact>=0?row[contact].trim():'',region:region>=0?row[region].trim():'',protocol:protocol>=0?row[protocol].trim():'',valid_until,version:1,updated_at:loadedAt,updated_by_name:'Planilha oficial'};
 }).filter((row):row is Accreditation=>row!==null);
}
function loadSheet(kind:SheetKind):Promise<Gviz>{
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');const target=window as typeof window&{google?:{visualization?:{Query?:{setResponse?:((value:Gviz)=>void)}}}};
  const prior=target.google?.visualization?.Query?.setResponse;
  const timer=window.setTimeout(()=>finish(new Error('A planilha oficial não respondeu.')),15000);
  const finish=(error?:Error,payload?:Gviz)=>{window.clearTimeout(timer);script.remove();if(target.google?.visualization?.Query)target.google.visualization.Query.setResponse=prior;if(error)reject(error);else resolve(payload!);};
  target.google??={};target.google.visualization??={};target.google.visualization.Query??={};target.google.visualization.Query.setResponse=(payload:Gviz)=>finish(undefined,payload);
  script.async=true;script.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEETS[kind]}&headers=0`;
  script.onerror=()=>finish(new Error('Não foi possível consultar a planilha oficial.'));
  document.head.append(script);
 });
}
export async function loadAccreditationsFromGoogle(){
 const loadedAt=new Date().toISOString();const companies=await loadSheet('company');const professionals=await loadSheet('professional');
 return [...gvizToAccreditations(companies,'company',loadedAt),...gvizToAccreditations(professionals,'professional',loadedAt)];
}
