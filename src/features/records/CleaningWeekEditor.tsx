import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {ActionButton,LoadState} from '@/components/workspace/Workspace';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cleaningTasks,type CleaningDay,type CleaningLocation} from './cleaningTypes';
import {cleaningWeekChanges,prepareCleaningWeek,setCleaningResponsible,WEEK_LABELS} from './cleaningWeekModel';
import {CleaningWeekGrid} from './CleaningWeekGrid';
import {shortDate} from './staffAvailability';
type Person={id:string;nome:string};
export default function CleaningWeekEditor({initialDate,people,locations,onClose,onSaved,onLocation}:{initialDate:string;people:Person[];locations:CleaningLocation[];onClose:()=>void;onSaved:(date:string)=>void;onLocation:(location:CleaningLocation)=>void}){
 const [date,setDate]=useState(initialDate),[anchor,setAnchor]=useState(initialDate),[reload,setReload]=useState(0);
 const [days,setDays]=useState<CleaningDay[]>([]),[original,setOriginal]=useState<CleaningDay[]>([]),[selected,setSelected]=useState<string[]>([]);
 const [activeDay,setActiveDay]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[localBusy,setLocalBusy]=useState(false),[localName,setLocalName]=useState('');
 const locationsRef=useRef(locations);locationsRef.current=locations;
 const changes=cleaningWeekChanges(days,original,selected);
 const dirty=cleaningWeekChanges(days.filter(d=>d.version>0),original,days.map(d=>d.service_date)).length>0||days.some(d=>!d.version&&(d.notes||d.assignments.some(a=>a.nome)));
 const requestClose=()=>{if(!busy&&!localBusy&&(!dirty||window.confirm('Descartar o preenchimento ainda não salvo?')))onClose();};
 useEffect(()=>{let active=true;setLoading(true);setError('');
 (async()=>{try{
  if(!supabase)throw new Error();
  const template=prepareCleaningWeek(anchor,[],[]);
  const result=await supabase.from('cleaning_roster').select('service_date,assignments,notes,version,updated_at').gte('service_date',template[0].service_date).lte('service_date',template[6].service_date).order('service_date');
  if(result.error)throw result.error;
  const prepared=prepareCleaningWeek(anchor,result.data??[],locationsRef.current);
  if(active){setDays(prepared);setOriginal(prepared);setSelected(prepared.map(d=>d.service_date));setActiveDay(0);}
 }catch{if(active)setError('Não foi possível carregar a semana. Seu preenchimento foi preservado; tente novamente.');}finally{if(active)setLoading(false);}})();
 return()=>{active=false;};},[anchor,reload]);
 const tasks=cleaningTasks(days);
 return <Dialog open onOpenChange={open=>{if(!open)requestClose();}}><DialogContent className="record-dialog cleaning-week-dialog"><DialogHeader><DialogTitle>Montar/editar semana dos VCs</DialogTitle><DialogDescription>Escolha o responsável de cada setor em cada dia. Os dias existentes são carregados para edição; nenhum preenchimento é repetido automaticamente.</DialogDescription></DialogHeader>
 <div className="cleaning-week-toolbar"><div className="form-field"><label htmlFor="vc-week-date">Data da semana</label><input id="vc-week-date" type="date" min="1900-01-01" max="2199-12-31" value={date} disabled={busy||localBusy||loading} onChange={e=>setDate(e.target.value)}/></div><ActionButton disabled={!date||busy||localBusy||loading} onClick={()=>{if(dirty&&!window.confirm('Descartar o preenchimento e carregar outra semana?'))return;if(date===anchor)setReload(n=>n+1);else setAnchor(date);}}>Carregar semana</ActionButton></div>
 {loading?<LoadState label="Carregando os sete dias…"/>:!days.length?<LoadState error={error} onRetry={()=>setReload(n=>n+1)}/>:<form onSubmit={async e=>{e.preventDefault();if(!supabase||busy||localBusy||!changes.length)return;setBusy(true);setError('');try{const response=await supabase.rpc('save_cleaning_week',{p_days:changes.map(({service_date,assignments,notes,version})=>({service_date,assignments,notes,version}))});if(response.error)throw new Error(['22023','40001'].includes(response.error.code)?response.error.message:'Não foi possível salvar a semana. Confira a conexão e sua permissão.');onSaved(changes[0].service_date);}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}}>
 <p className="cleaning-week-period">{shortDate(days[0].service_date)} a {shortDate(days[6].service_date)} · Selecione os dias que deseja salvar.</p>
 <div className="cleaning-week-mobile-tabs" role="group" aria-label="Dia para preencher">{days.map((day,i)=><ActionButton key={day.service_date} aria-pressed={activeDay===i} variant={activeDay===i?'primary':'secondary'} onClick={()=>setActiveDay(i)}>{WEEK_LABELS[i].slice(0,3)}<small>{shortDate(day.service_date).slice(0,5)}</small></ActionButton>)}</div>
 <CleaningWeekGrid days={days} selected={selected} activeDay={activeDay} disabled={busy||localBusy} people={people} onToggle={(date,checked)=>setSelected(current=>checked?[...current,date]:current.filter(d=>d!==date))} onPick={(date,task,person)=>setDays(current=>setCleaningResponsible(current,date,task,person))} onNotes={(date,notes)=>setDays(current=>current.map(day=>day.service_date===date?{...day,notes}:day))}/>
 <div className="cleaning-add-location"><div className="form-field"><label htmlFor="vc-week-location">Adicionar setor/local</label><input id="vc-week-location" maxLength={100} placeholder="Ex.: Banheiro do 2º andar" disabled={busy||localBusy} value={localName} onChange={e=>setLocalName(e.target.value)}/></div><ActionButton disabled={busy||localBusy||localName.trim().length<2||tasks.length>=40} onClick={async()=>{if(!supabase||localBusy)return;setLocalBusy(true);setError('');try{let location=locationsRef.current.find(l=>l.label.trim().toLocaleLowerCase()===localName.trim().toLocaleLowerCase());if(!location){const response=await supabase.from('cleaning_locations').insert({label:localName.trim()}).select('id,label').single();if(response.error)throw new Error(response.error.code==='23505'?'Esse local já foi cadastrado. Atualize a semana para consultá-lo.':'Não foi possível adicionar o local.');location=response.data;onLocation(location);}const l=location!;setDays(current=>current.map(d=>d.assignments.some(a=>a.task==='local_'+l.id)?d:{...d,assignments:[...d.assignments,{task:'local_'+l.id,label:l.label,staff_id:null,nome:''}]}));setLocalName('');}catch(e){setError(e instanceof Error?e.message:'Não foi possível adicionar.');}finally{setLocalBusy(false);}}}>Adicionar local</ActionButton><small>O local fica disponível para reutilizar mesmo se você cancelar a edição da semana.</small></div>
 {error&&<p role="alert" className="form-error">{error}</p>}<p className="cleaning-week-help">Dias desmarcados ficam como estão. Em caso de afastamento ou conflito de edição, nenhum dia deste salvamento será gravado.</p>
 <div className="record-actions"><ActionButton disabled={busy||localBusy} onClick={requestClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy||localBusy||!changes.length}>{busy?'Salvando…':`Salvar semana · ${changes.length} ${changes.length===1?'dia':'dias'}`}</ActionButton></div></form>}
 </DialogContent></Dialog>;
}
