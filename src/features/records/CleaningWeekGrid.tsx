import {cleaningTasks,type CleaningDay} from './cleaningTypes';
import {WEEK_LABELS} from './cleaningWeekModel';
import {shortDate} from './staffAvailability';
export type CleaningPerson={id:string;nome:string};
type Props={days:CleaningDay[];selected:string[];activeDay:number;disabled:boolean;people:CleaningPerson[];onToggle:(date:string,selected:boolean)=>void;onPick:(date:string,task:string,person?:CleaningPerson)=>void;onNotes:(date:string,notes:string)=>void};
export function CleaningWeekGrid({days,selected,activeDay,disabled,people,onToggle,onPick,onNotes}:Props){
 const tasks=cleaningTasks(days);
 return <div className="cleaning-week-matrix" tabIndex={0} aria-label="Preenchimento semanal por setor e dia"><table><thead><tr><th scope="col">Setor / local</th>{days.map((day,i)=><th scope="col" key={day.service_date} className={activeDay===i?'vc-active-day':''}><label><input type="checkbox" disabled={disabled} checked={selected.includes(day.service_date)} onChange={e=>onToggle(day.service_date,e.target.checked)}/>{WEEK_LABELS[i]}<span>{shortDate(day.service_date)}</span></label><small>{day.version?'Cadastrado':'Novo'}</small></th>)}</tr></thead><tbody>{tasks.map(task=><tr key={task.key}><th scope="row">{task.label}{task.hint&&<small>{task.hint}</small>}</th>{days.map((day,i)=>{
 const a=day.assignments.find(a=>a.task===task.key)!;const legacy=!a.staff_id&&!!a.nome;
 return <td key={day.service_date} className={activeDay===i?'vc-active-day':''}><select aria-label={`${task.label} · ${shortDate(day.service_date)}`} disabled={disabled||!selected.includes(day.service_date)} value={a.staff_id||(legacy?'source':'')} onChange={e=>{if(e.target.value!=='source')onPick(day.service_date,task.key,people.find(p=>p.id===e.target.value));}}><option value="">A definir</option>{legacy&&<option value="source">{a.nome} · sem vínculo</option>}{people.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></td>;
 })}</tr>)}<tr><th scope="row">Observações</th>{days.map((day,i)=><td key={day.service_date} className={activeDay===i?'vc-active-day':''}><textarea aria-label={'Observações · '+shortDate(day.service_date)} disabled={disabled||!selected.includes(day.service_date)} maxLength={2000} value={day.notes} onChange={e=>onNotes(day.service_date,e.target.value)}/></td>)}</tr></tbody></table></div>;
}
