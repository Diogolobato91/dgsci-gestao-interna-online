import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Ban, RefreshCw, AlertTriangle } from 'lucide-react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { ActionButton,LoadState } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import { fetchStaffAbsences } from './useStaffAbsences';
import { ABSENCE_KINDS,institutionalToday,shortDate,validPeriod,staffOperationError } from './staffAvailability';
import type { Staff,StaffAbsence,RosterConflict } from './staffAvailability';

export default function StaffAbsencesManager({people,initialPerson,onClose,onSaved}:{people:Staff[];initialPerson:string;onClose:()=>void;onSaved:()=>void}) {
  const [personId,setPersonId]=useState(initialPerson),[records,setRecords]=useState<StaffAbsence[]>([]);
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
  const [draft,setDraft]=useState<Partial<StaffAbsence>|null>(null),[cancel,setCancel]=useState<StaffAbsence|null>(null);
  const [cancelReason,setCancelReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [conflicts,setConflicts]=useState<RosterConflict[]>([]),[checking,setChecking]=useState(false),[conflictError,setConflictError]=useState('');
  const names=new Map(people.map(p=>[p.id,`${p.postoGraduacao} ${p.nome}`]));
  const today=institutionalToday();
  useEffect(()=>{let alive=true;setLoading(true);setLoadError('');
    void fetchStaffAbsences({staffId:personId||undefined,includeCancelled:true}).then(rows=>{if(alive)setRecords(rows);}).catch(e=>{if(alive)setLoadError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[personId,revision]);
  useEffect(()=>{let alive=true;setConflicts([]);setConflictError('');
    if(!draft?.staff_id||!validPeriod(draft.starts_on||'',draft.ends_on||'')||!supabase){setChecking(false);return;}
    setChecking(true);
    void Promise.resolve(supabase.rpc('get_absence_roster_conflicts',{p_staff_id:draft.staff_id,p_start:draft.starts_on,p_end:draft.ends_on})).then(({data,error})=>{
      if(!alive)return;if(error)setConflictError('Não foi possível conferir os plantões desse período.');else setConflicts(data||[]);setChecking(false);
    }).catch(()=>{if(alive){setConflictError('Não foi possível conferir os plantões desse período.');setChecking(false);}});return()=>{alive=false;};
  },[draft?.staff_id,draft?.starts_on,draft?.ends_on,revision]);
  const saved=()=>{setRevision(v=>v+1);onSaved();};
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog staff-absences-dialog"><DialogHeader><DialogTitle>{draft?(draft.id?'Editar afastamento':'Registrar férias ou afastamento'):cancel?'Cancelar registro':'Férias, licenças e afastamentos'}</DialogTitle><DialogDescription>Períodos incluem o dia inicial e o dia final. Os cancelamentos permanecem no histórico.</DialogDescription></DialogHeader>
    {draft?<form className="record-form" onSubmit={async e=>{e.preventDefault();if(!supabase||busy||checking||conflictError)return;setBusy(true);setError('');try{
      if(!validPeriod(draft.starts_on||'',draft.ends_on||''))throw new Error('Confira o início e o término do período.');
      const values={staff_id:draft.staff_id,kind:draft.kind,starts_on:draft.starts_on,ends_on:draft.ends_on,reason:draft.reason?.trim()||''};
      const result=draft.id?await supabase.from('staff_absences').update(values).eq('id',draft.id).eq('version',draft.version).select('id'):await supabase.from('staff_absences').insert(values).select('id');
      if(result.error)throw new Error(staffOperationError(result.error));if(!result.data?.length)throw new Error('O registro mudou. Feche e atualize a consulta.');
      setMessage(conflicts.length?`Registro salvo. ${conflicts.length} plantão(ões) precisam de revisão na Escala Mensal.`:'Registro salvo. A disponibilidade na escala foi atualizada.');setDraft(null);saved();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}}>
      <div className="form-field"><label htmlFor="absence-person">Integrante *</label><select id="absence-person" required disabled={!!draft.id} value={draft.staff_id||''} onChange={e=>setDraft({...draft,staff_id:e.target.value})}><option value="">Selecione no efetivo</option>{people.map(p=><option key={p.id} value={p.id}>{p.postoGraduacao} {p.nome}</option>)}</select></div>
      <div className="form-grid"><div className="form-field"><label htmlFor="absence-kind">Tipo *</label><select id="absence-kind" required value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as StaffAbsence['kind']})}>{ABSENCE_KINDS.map(k=><option key={k}>{k}</option>)}</select></div><div className="form-field"/>
      <div className="form-field"><label htmlFor="absence-start">Início *</label><input id="absence-start" type="date" min="1900-01-01" required value={draft.starts_on||''} onChange={e=>setDraft({...draft,starts_on:e.target.value})}/></div>
      <div className="form-field"><label htmlFor="absence-end">Término *</label><input id="absence-end" type="date" min={draft.starts_on||'1900-01-01'} required value={draft.ends_on||''} onChange={e=>setDraft({...draft,ends_on:e.target.value})}/></div>
      <div className="form-field form-field-wide"><label htmlFor="absence-reason">Motivo / referência do documento</label><textarea id="absence-reason" rows={3} maxLength={1000} placeholder="Ex.: portaria ou referência administrativa" value={draft.reason||''} onChange={e=>setDraft({...draft,reason:e.target.value})}/></div></div>
      {checking&&<p role="status">Conferindo plantões do período…</p>}{conflictError&&<div className="staff-warning" role="alert"><p>{conflictError}</p><ActionButton onClick={()=>setRevision(v=>v+1)}>Tentar novamente</ActionButton></div>}
      {!!conflicts.length&&<div className="staff-warning" role="alert"><strong><AlertTriangle size={16}/> Há {conflicts.length} plantão(ões) nesse período</strong><p>O afastamento será registrado e essas equipes precisarão de revisão. Nenhum plantão será apagado.</p><ul>{conflicts.map(c=><li key={c.id}>{shortDate(c.service_date)} · {c.duty_role}</li>)}</ul></div>}
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>{setDraft(null);setError('');}}>Voltar ao histórico</ActionButton><ActionButton type="submit" variant="primary" disabled={busy||checking||!!conflictError}>{busy?'Salvando…':'Salvar afastamento'}</ActionButton></div>
    </form>:cancel?<form className="record-form" onSubmit={async e=>{e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');try{
      const result=await supabase.from('staff_absences').update({cancelled_at:new Date().toISOString(),cancellation_reason:cancelReason.trim()}).eq('id',cancel.id).eq('version',cancel.version).select('id');
      if(result.error)throw new Error(staffOperationError(result.error));if(!result.data?.length)throw new Error('O registro mudou. Feche e atualize a consulta.');
      setCancel(null);setMessage('Cancelamento registrado. A disponibilidade foi atualizada.');saved();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cancelar.');}finally{setBusy(false);}}}><p><strong>{names.get(cancel.staff_id)}</strong><br/>{cancel.kind} · {shortDate(cancel.starts_on)} a {shortDate(cancel.ends_on)}</p><div className="form-field"><label htmlFor="absence-cancel-reason">Motivo do cancelamento *</label><textarea id="absence-cancel-reason" required minLength={3} maxLength={500} rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/></div>{error&&<p role="alert" className="form-error">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setCancel(null)}>Voltar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}>{busy?'Cancelando…':'Confirmar cancelamento'}</ActionButton></div></form>:<div className="detail-body">
      <div className="staff-absence-toolbar"><div className="form-field"><label htmlFor="absence-filter-person">Consultar integrante</label><select id="absence-filter-person" value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Todos os integrantes</option>{people.map(p=><option value={p.id} key={p.id}>{p.postoGraduacao} {p.nome}</option>)}</select></div><ActionButton onClick={()=>setRevision(v=>v+1)} aria-label="Atualizar afastamentos"><RefreshCw size={16}/></ActionButton><ActionButton variant="primary" onClick={()=>{setError('');setMessage('');setDraft({staff_id:personId,kind:'Férias',starts_on:today,ends_on:today,reason:''});}}><Plus size={16}/>Registrar período</ActionButton></div>
      {message&&<p role="status" className="staff-success">{message}</p>}
      {loading||loadError?<LoadState error={loadError} onRetry={()=>setRevision(v=>v+1)}/>:records.length?<div className="staff-absence-list">{records.map(a=><article className={'staff-absence-card '+(a.cancelled_at?'is-cancelled':'')} key={a.id}><div><span className={'workspace-badge '+(a.cancelled_at?'':a.starts_on<=today&&a.ends_on>=today?'workspace-badge-review':'')}>{a.cancelled_at?'Cancelado':a.starts_on>today?'Programado':a.ends_on<today?'Encerrado':'Em vigor'}</span><h3>{a.kind} · {names.get(a.staff_id)||'Integrante cadastrado'}</h3><p><CalendarDays size={14}/> {shortDate(a.starts_on)} a {shortDate(a.ends_on)}</p>{a.reason&&<p className="staff-absence-reason">{a.reason}</p>}{a.cancelled_at&&<small>Cancelado em {shortDate(a.cancelled_at)} · {a.cancellation_reason}</small>}</div>{!a.cancelled_at&&<div className="staff-absence-card-actions"><ActionButton variant="ghost" onClick={()=>{setError('');setDraft({...a});}}><Pencil size={14}/>Editar</ActionButton><ActionButton variant="ghost" className="workspace-button-danger" onClick={()=>{setError('');setCancelReason('');setCancel(a);}}><Ban size={14}/>Cancelar registro</ActionButton></div>}</article>)}</div>:<div className="roster-empty"><CalendarDays size={28}/><strong>Nenhum afastamento registrado</strong><p>Use “Registrar período” para adicionar férias, licenças ou afastamentos.</p></div>}
    </div>}
  </DialogContent></Dialog>;
}
