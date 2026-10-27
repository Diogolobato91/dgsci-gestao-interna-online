import {cleaningTasks,cleaningWeek,emptyCleaningDay,type CleaningDay,type CleaningLocation} from './cleaningTypes';
export const WEEK_LABELS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
export function prepareCleaningWeek(date:string,existing:CleaningDay[],locations:CleaningLocation[]):CleaningDay[]{
 const days=cleaningWeek(date).map(service_date=>existing.find(d=>d.service_date===service_date)??emptyCleaningDay(service_date));
 const tasks=cleaningTasks(days);
 for(const l of locations)if(!tasks.some(t=>t.key==='local_'+l.id))tasks.push({key:'local_'+l.id,label:l.label});
 return days.map(day=>({...day,assignments:tasks.map(t=>({...day.assignments.find(a=>a.task===t.key)??{task:t.key,staff_id:null,nome:'',label:t.key.startsWith('local_')?t.label:null}}))}));
}
export function setCleaningResponsible(days:CleaningDay[],date:string,task:string,person?:{id:string;nome:string}):CleaningDay[]{
 return days.map(day=>day.service_date!==date?day:{...day,assignments:day.assignments.map(a=>a.task!==task?a:{...a,staff_id:person?.id??null,nome:person?.nome??''})});
}
function content(day:CleaningDay){return JSON.stringify({assignments:day.assignments,notes:day.notes});}
export function cleaningWeekChanges(days:CleaningDay[],original:CleaningDay[],selected:string[]):CleaningDay[]{
 return days.filter(day=>selected.includes(day.service_date)&&(!day.version||content(day)!==content(original.find(o=>o.service_date===day.service_date)??emptyCleaningDay(day.service_date))));
}
