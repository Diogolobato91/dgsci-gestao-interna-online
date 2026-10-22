export type RosterExportMode='day'|'week'|'month';
function iso(date:Date){return date.toISOString().slice(0,10);}
export function rosterExportPeriod(day:string,month:string,mode:RosterExportMode){
 if(mode==='month'){const [year,m]=month.split('-').map(Number);return{start:month+'-01',end:iso(new Date(Date.UTC(year,m,0,12)))};}
 const date=new Date(day+'T12:00:00Z');
 if(mode==='day')return{start:day,end:day};
 date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));const start=iso(date);date.setUTCDate(date.getUTCDate()+6);return{start,end:iso(date)};
}
export function daysOfPeriod(start:string,end:string){
 const result:string[]=[];const date=new Date(start+'T12:00:00Z');
 for(let limit=0;iso(date)<=end&&limit<32;limit++){result.push(iso(date));date.setUTCDate(date.getUTCDate()+1);}return result;
}
