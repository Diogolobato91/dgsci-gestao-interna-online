export const CLEANING_TASKS = [
  {key:'lav_corredor',label:'LAV. CORREDOR'},
  {key:'esc_fundos',label:'ESC. FUNDOS'},
  {key:'corredor_frente',label:'Corredor da frente'},
  {key:'corredor_fundos',label:'Corredor dos fundos'},
  {key:'lixo',label:'Retirada do lixo',hint:'Até 13h30'},
  {key:'sala_coronel',label:'Sala do coronel',hint:'Segunda a sexta'},
] as const;
export type CleaningAssignment = {task:string;staff_id:string|null;nome:string;label?:string|null};
export type CleaningDay = {service_date:string;assignments:CleaningAssignment[];notes:string;version:number;updated_at?:string};
export function emptyCleaningDay(day:string):CleaningDay {
  return {service_date:day,assignments:CLEANING_TASKS.map(t=>({task:t.key,staff_id:null,nome:''})),notes:'',version:0};
}

export type CleaningLocation = {id:string;label:string};
export function cleaningTasks(rows:CleaningDay[]) {
 const tasks:{key:string;label:string;hint?:string}[]=[...CLEANING_TASKS];
 for(const row of rows) for(const a of row.assignments) if(a.label&&!tasks.some(t=>t.key===a.task))tasks.push({key:a.task,label:a.label});
 return tasks;
}
/** Semana de segunda a domingo, sem deslocamento por fuso horário. */
export function cleaningWeek(date:string):string[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
 const start=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(start.getTime())||start.toISOString().slice(0,10)!==date)return [];
 start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
}
