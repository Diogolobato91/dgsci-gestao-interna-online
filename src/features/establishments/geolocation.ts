import type {Establishment} from './model';

type CachedPoint={lat?:number;lng?:number;error?:unknown;rejected?:unknown;type?:string};
type Location={lng:number;lat:number;precision:'exact'|'street'|'neighborhood'};

const CENTROIDS:Record<string,[number,number]>={
 NAZARE:[-1.4526,-48.4848],UMARIZAL:[-1.4428,-48.4839],'BATISTA CAMPOS':[-1.4593,-48.4912],MARCO:[-1.4326,-48.4632],PEDREIRA:[-1.4285,-48.4746],TELEGRAFO:[-1.4321,-48.4921],
 CREMACAO:[-1.4645,-48.4812],JURUNAS:[-1.4695,-48.4941],GUAMA:[-1.4705,-48.4682],CANUDOS:[-1.4502,-48.4612],'SAO BRAS':[-1.4491,-48.4719],'CIDADE VELHA':[-1.4638,-48.5028],
 CAMPINA:[-1.4552,-48.4998],COMERCIO:[-1.451,-48.5015],REDUTO:[-1.4498,-48.4952],FATIMA:[-1.442,-48.475],CONDOR:[-1.476,-48.483],'TERRA FIRME':[-1.456,-48.45],MONTESE:[-1.456,-48.45],
 UNIVERSITARIO:[-1.474,-48.456],SACRAMENTA:[-1.418,-48.472],BARREIRO:[-1.412,-48.482],MIRAMAR:[-1.406,-48.49],MARACANGALHA:[-1.41,-48.478],'CURIO UTINGA':[-1.435,-48.44],
 CASTANHEIRA:[-1.3921,-48.4235],SOUZA:[-1.4215,-48.4412],SOUSA:[-1.4215,-48.4412],MARAMBAIA:[-1.3995,-48.4452],'VAL DE CAES':[-1.3852,-48.4712],'VAL DE CANS':[-1.3852,-48.4712],
 MANGUEIRAO:[-1.3712,-48.4485],BENGUI:[-1.3652,-48.4612],CABANAGEM:[-1.3712,-48.4298],UNA:[-1.36,-48.45],'PARQUE VERDE':[-1.3521,-48.4498],COQUEIRO:[-1.3412,-48.4352],
 TAPANA:[-1.3415,-48.4652],PRATINHA:[-1.3521,-48.4812],TENONE:[-1.3212,-48.4512],'SAO CLEMENTE':[-1.36,-48.47],ICOARACI:[-1.2985,-48.4812],AGULHA:[-1.3021,-48.4812],
 CRUZEIRO:[-1.2985,-48.4812],'CAMPINA DE ICOARACI':[-1.305,-48.475],PARACURI:[-1.295,-48.489],'PONTA GROSSA':[-1.289,-48.495],OUTEIRO:[-1.2582,-48.4512],MOSQUEIRO:[-1.1512,-48.4112],
 ANANINDEUA:[-1.3645,-48.3742],'CENTRO ANANINDEUA':[-1.3645,-48.3742],'CIDADE NOVA':[-1.3712,-48.385],GUANABARA:[-1.389,-48.421],'AGUAS LINDAS':[-1.385,-48.395],MARITUBA:[-1.361,-48.341],BENEVIDES:[-1.361,-48.245]
};

export const normalizeGeoText=(value:unknown)=>String(value??'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
const addressKey=(address:unknown,neighborhood:unknown)=>{const a=normalizeGeoText(address);return !a||a==='-'||a.length<3?'':`${a}|${normalizeGeoText(neighborhood)}`;};
const streetKey=(value:unknown)=>normalizeGeoText(value).replace(/[.,;:\-/]/g,' ').replace(/\b(AVEN|AV)\b/g,'AVENIDA').replace(/\b(TRAVESSA|TRAV|TR|TV|TVE)\b/g,'TRAVESSA').replace(/\b(RUAS?|R)\b/g,'RUA').replace(/\b(RODOVIA|ROD)\b/g,'RODOVIA').replace(/\s+/g,' ').trim();

export async function loadLocationCaches(){
 const [addresses,streets]=await Promise.all([
  fetch('/maps/geocoded_addresses.json').then(r=>r.ok?r.json():{}).catch(()=>({})),
  fetch('/maps/verified_gis_streets.json').then(r=>r.ok?r.json():{}).catch(()=>({}))
 ]);
 const streetIndex=new Map<string,[number,number]>();
 Object.entries(streets as Record<string,[number,number]>).forEach(([key,value])=>{if(Array.isArray(value)&&value.length>=2)streetIndex.set(streetKey(key),value);});
 return {addresses:addresses as Record<string,CachedPoint>,streetIndex};
}

export function locateEstablishment(item:Establishment,caches:Awaited<ReturnType<typeof loadLocationCaches>>):Location|null{
 const exact=caches.addresses[addressKey(item.endereco,item.bairro)];
 if(exact&&!exact.error&&!exact.rejected&&Number.isFinite(exact.lat)&&Number.isFinite(exact.lng))return{lng:Number(exact.lng),lat:Number(exact.lat),precision:exact.type==='address'?'exact':'street'};
 const street=caches.streetIndex.get(streetKey(item.endereco));
 if(street)return{lng:Number(street[1]),lat:Number(street[0]),precision:'street'};
 const centroid=CENTROIDS[normalizeGeoText(item.bairro).replace(/-/g,' ')];
 return centroid?{lng:centroid[1],lat:centroid[0],precision:'neighborhood'}:null;
}

export function spreadLocation(item:Establishment,location:Location):Location{
 const hash=String(item.id).split('').reduce((sum,char)=>sum+char.charCodeAt(0),0);
 const angle=(hash%360)*Math.PI/180;
 const distance=location.precision==='neighborhood'?((hash%20)+1)*.00018:location.precision==='exact'?((hash%5)+1)*.00002:((hash%10)+1)*.00008;
 return {...location,lng:location.lng+Math.cos(angle)*distance,lat:location.lat+Math.sin(angle)*distance};
}
