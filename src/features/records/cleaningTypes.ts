export const CLEANING_TASKS = [
  {key:'lav_corredor',label:'LAV. CORREDOR'},
  {key:'esc_fundos',label:'ESC. FUNDOS'},
  {key:'corredor_frente',label:'Corredor da frente'},
  {key:'corredor_fundos',label:'Corredor dos fundos'},
  {key:'lixo',label:'Retirada do lixo',hint:'Até 13h30'},
  {key:'sala_coronel',label:'Sala do coronel',hint:'Segunda a sexta'},
] as const;
export type CleaningAssignment = {task:string;staff_id:string|null;nome:string};
export type CleaningDay = {service_date:string;assignments:CleaningAssignment[];notes:string;version:number;updated_at?:string};
export function emptyCleaningDay(day:string):CleaningDay {
  return {service_date:day,assignments:CLEANING_TASKS.map(t=>({task:t.key,staff_id:null,nome:''})),notes:'',version:0};
}
