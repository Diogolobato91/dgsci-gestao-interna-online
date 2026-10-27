import type {User} from '@/types/auth';
import {isFullAdministrator}from'@/features/records/recordAccess';
import {normalizeSearch}from'@/features/records/recordAccess';
export type Accreditation={id:string;kind:'company'|'professional';modality:string;name:string;contact:string;region:string;protocol:string;valid_until:string;version:number;updated_at:string;updated_by_name:string};
export const canManageAccreditations=(user:User|null)=>isFullAdministrator(user)||!!user?.allowedProfiles?.includes('Credenciamento');
export function validityState(date:string,today:string){return date>=today?'valid':'expired';}
export function filterAccreditations(rows:Accreditation[],kind:Accreditation['kind'],query:string,modality:string,state:string,today:string){
 const needle=normalizeSearch(query);
 return rows.filter(r=>r.kind===kind&&(!modality||r.modality===modality)&&(state==='all'||validityState(r.valid_until,today)===state)&&normalizeSearch([r.modality,r.name,r.contact,r.region,r.protocol].join(' ')).includes(needle));
}
export function modalityCounts(rows:Pick<Accreditation,'modality'>[]){
 const counts=new Map<string,number>();for(const row of rows){const key=row.modality.trim();counts.set(key,(counts.get(key)||0)+1);}
 return [...counts].map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));
}
export const updateLabel=(r:Pick<Accreditation,'updated_at'|'updated_by_name'>)=>`${r.updated_by_name} · ${new Date(r.updated_at).toLocaleString('pt-BR',{timeZone:'America/Belem',dateStyle:'short',timeStyle:'short'})}`;

export type AccreditationImport={kind:Accreditation['kind'];source_author:string;source_date:string;source_rows:number;imported_rows:number;duplicates:number;imported_at:string};
export function divergentRecords(rows:Accreditation[]){
 const groups=new Map<string,Accreditation[]>();
 for(const row of rows){const key=[row.kind,row.modality,row.name,row.protocol].map(s=>s.trim().toLocaleLowerCase('pt-BR')).join('\u001f');groups.set(key,[...(groups.get(key)||[]),row]);}
 return new Set([...groups.values()].filter(g=>g.length>1).flatMap(g=>g.map(r=>r.id)));
}
