import {DIVISIONS} from './divisions';
export type EstablishmentData=Record<string,string|number|null>;
export type Establishment=EstablishmentData&{id:string;version:number;updated_at:string;updated_by_name:string};
export type EstablishmentSnapshot={companies:Establishment[];timestamp:string|null;vistorias:unknown[];loadedTabs:{name:string;count:number}[];import:{record_count:number;imported_at:string;source_title:string}|null};
export const STATUS_OPTIONS=[['PARADO','Pendente / parado'],['REGULAR','Emitido / regular no cadastro'],['VENCIDO','Vencido / infração no cadastro'],['SEM_SISGAT','Sem cadastro no SISGAT'],['DESATIVADO','Desativado']] as const;
export const SECTORS=[['SETOR I','Centro Histórico / Comércio','#EAB308'],['SETOR II','Batista Campos / Jurunas / Cremação','#3B82F6'],['SETOR III','Umarizal / Nazaré / São Brás','#F8FAFC'],['SETOR IV','Marco / Guamá / Canudos / Utinga','#22C55E'],['SETOR V','Sacramenta / Pedreira / Telégrafo','#EC4899'],['SETOR VI','Marambaia / Souza / Mangueirão / RMB','#F97316']] as const;
export function blankEstablishment():EstablishmentData{return {razao:'',cnpj:'',divisao:'',endereco:'',bairro:'',setor:'',situacao:'',observacao:'',normalizedStatus:'PARADO',risco:'NÃO INFORMADO',statusAtivo:'NÃO INFORMADO',cargaIncendio:null};}
export function establishmentPayload(draft:EstablishmentData):EstablishmentData{
 const {id,version,updated_at,updated_by_name,...data}=draft;
 const classification=DIVISIONS[String(data.divisao) as keyof typeof DIVISIONS];
 if(!classification)throw new Error('Selecione uma divisão válida.');
 const sector=SECTORS.find(s=>s[0]===data.setor);
 return {...data,razao:String(data.razao??'').trim(),grupo:classification.grupo,grupoNome:classification.grupoNome,tab:classification.tab,divisaoDescricao:classification.descricao,divisaoExemplos:classification.exemplos,pasta:data.pasta??'',itemNum:data.pasta??'',setorNome:sector?`${sector[0]} (${sector[1]})`:'Não informado',setorHex:sector?.[2]??'#64748B',setorCor:sector?.[0]??'',endereco:data.endereco||'-',bairro:data.bairro||'NÃO INFORMADO',situacao:data.situacao||'NÃO INFORMADA',numeroImovel:data.numeroImovel||'S/N',cargaDisplay:data.cargaIncendio===null||data.cargaIncendio===''||data.cargaIncendio===undefined?'Não informada':String(data.cargaIncendio)+' MJ/m²'};
}
