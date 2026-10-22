import {logActivity} from '@/features/audit/activity';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Copy, Pencil, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ActionButton, LoadState } from '@/components/workspace/Workspace';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { canManageSupport } from './recordAccess';
import { institutionalToday, shortDate } from './staffAvailability';
import { CLEANING_TASKS, emptyCleaningDay } from './cleaningTypes';
import type { CleaningDay } from './cleaningTypes';

type Volunteer={id:string;nome:string};
export default function CleaningRoster({compact=false}:{compact?:boolean}){
 const {user}=useAuth();const manage=canManageSupport(user);
 const [month,setMonth]=useState(()=>institutionalToday().slice(0,7));
 const [today,setToday]=useState(institutionalToday);
 const [rows,setRows]=useState<CleaningDay[]>([]),[people,setPeople]=useState<Volunteer[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [draft,setDraft]=useState<CleaningDay|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
 const [exportBusy,setExportBusy]=useState(false),[exportError,setExportError]=useState('');
 const [copyTo,setCopyTo]=useState('');const [copy,setCopy]=useState(false);
 const start=compact?today:month+'-01';
 const end=compact?today:month+'-'+new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 useEffect(()=>{let active=true;setLoading(true);setError('');setRows([]);setPeople([]);
 (async()=>{try{
  if(!supabase)throw new Error();
  const result=await supabase.from('cleaning_roster').select('service_date,assignments,notes,version,updated_at').gte('service_date',start).lte('service_date',end).order('service_date');
  if(result.error)throw result.error;
  if(!compact&&manage){const response=await supabase.rpc('get_cleaning_volunteers');if(response.error)throw response.error;if(active)setPeople(response.data??[]);}
  if(active)setRows(result.data??[]);
 }catch{if(active)setError('Não foi possível carregar a escala dos VCs.');}finally{if(active)setLoading(false);}})();
 return()=>{active=false;};},[start,end,compact,manage,revision,user?.id]);
 useEffect(()=>{if(!compact)return;const update=()=>{setToday(institutionalToday());setRevision(n=>n+1);};const timer=window.setInterval(update,60000);window.addEventListener('focus',update);return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);};},[compact]);
 const open=(row:CleaningDay,duplicate=false)=>{setDraft({...row,assignments:row.assignments.map(a=>({...a}))});setCopy(duplicate);setCopyTo('');setFormError('');};
 if(compact)return <section className="dashboard-cleaning" aria-labelledby="cleaning-today-title"><div className="cleaning-heading"><div><span className="portal-eyebrow">ROTINA DE APOIO · {shortDate(today)}</span><h2 id="cleaning-today-title">Escala Faxina VC's</h2></div><Link to="/escala-mensal?aba=vc">Consultar escala <ArrowRight size={15}/></Link></div>
 {loading?<p role="status">Carregando responsáveis…</p>:error?<div role="alert"><p>{error}</p><ActionButton onClick={()=>setRevision(n=>n+1)}>Tentar novamente</ActionButton></div>:!rows.length?<p className="dashboard-contact-empty">Escala de hoje ainda não cadastrada.</p>:<><dl className="cleaning-today-grid">{CLEANING_TASKS.map(t=><div key={t.key}><dt>{t.label}{'hint'in t&&<small>{t.hint}</small>}</dt><dd>{rows[0].assignments.find(a=>a.task===t.key)?.nome||'A definir'}</dd></div>)}</dl><p className="cleaning-reminder">Informar a conclusão ao chefe do plantão até o fim do expediente.</p></>}
 </section>;
 return <section className="cleaning-workspace"><div className="cleaning-heading"><div><h2>Escala dos VCs</h2><p>Conservação e limpeza das áreas da DGSCI.</p></div><div className="record-actions"><label htmlFor="cleaning-month" className="sr-only">Mês da escala dos VCs</label><input id="cleaning-month" type="month" min="1900-01" max="2199-12" value={month} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value))setMonth(e.target.value);}}/><ActionButton disabled={loading} onClick={()=>setRevision(n=>n+1)} aria-label="Atualizar escala dos VCs"><RefreshCw size={16}/></ActionButton><ActionButton disabled={loading||!!error||!rows.length||exportBusy} onClick={async()=>{setExportBusy(true);setExportError('');try{const {buildCleaningPdf}=await import('./cleaningPdf');void logActivity('download_request','cleaning_roster','pdf');(await buildCleaningPdf(rows,month)).save('escala-vcs-'+month+'.pdf');}catch{setExportError('Não foi possível gerar o PDF. Confira a conexão e tente novamente.');}finally{setExportBusy(false);}}}><Download size={16}/>Baixar PDF</ActionButton>{manage&&<ActionButton variant="primary" onClick={()=>open(emptyCleaningDay(month===institutionalToday().slice(0,7)?institutionalToday():month+'-01'))}>Cadastrar dia</ActionButton>}</div></div>
 {exportError&&<p className="form-error" role="alert">{exportError}</p>}
 {loading||error?<LoadState error={error} onRetry={()=>setRevision(n=>n+1)}/>:!rows.length?<p className="dashboard-empty">Nenhum dia cadastrado neste mês.</p>:<div className="cleaning-table-scroll" tabIndex={0} aria-label="Escala dos VCs. Role horizontalmente para consultar todas as áreas."><table className="cleaning-table"><thead><tr><th scope="col">Data</th>{CLEANING_TASKS.map(t=><th scope="col" key={t.key}>{t.label}</th>)}{manage&&<th scope="col">Ações</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.service_date} className={row.service_date===today?'is-today':''}><th scope="row">{shortDate(row.service_date)}{row.service_date===today&&<small>Hoje</small>}</th>{CLEANING_TASKS.map(t=><td key={t.key}>{row.assignments.find(a=>a.task===t.key)?.nome||'A definir'}</td>)}{manage&&<td><div className="record-actions"><ActionButton onClick={()=>open(row)} aria-label={'Editar '+shortDate(row.service_date)}><Pencil size={15}/></ActionButton><ActionButton onClick={()=>open(row,true)} aria-label={'Copiar '+shortDate(row.service_date)}><Copy size={15}/></ActionButton></div></td>}</tr>)}</tbody></table></div>}
 <div className="cleaning-instructions"><strong>Orientações de serviço</strong><p>Recolher o lixo até 13h30. Nos corredores da frente e dos fundos, varrer e passar pano. Informar a conclusão ao chefe do plantão até o fim do expediente. Sala do coronel: segunda a sexta.</p><p>Somente os dias cadastrados são exibidos. A escala não se repete automaticamente.</p></div>
 {draft&&<Dialog open onOpenChange={value=>{if(!value&&!busy)setDraft(null);}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><DialogTitle>{copy?'Copiar escala':draft.version?'Editar escala dos VCs':'Cadastrar escala dos VCs'}</DialogTitle><DialogDescription>{copy?'Escolha a nova data e ajuste os responsáveis antes de salvar.':'Selecione os responsáveis por área. Nomes importados sem vínculo permanecem identificados para conferência.'}</DialogDescription></DialogHeader><form className="record-form" onSubmit={async e=>{e.preventDefault();if(!supabase||busy)return;setBusy(true);setFormError('');try{
 const values={service_date:copy?copyTo:draft.service_date,assignments:draft.assignments,notes:draft.notes};
 const result=draft.version&&!copy?await supabase.from('cleaning_roster').update(values).eq('service_date',draft.service_date).eq('version',draft.version).select('service_date'):await supabase.from('cleaning_roster').insert(values).select('service_date');
 if(result.error)throw new Error(result.error.code==='23505'?'Já existe escala nessa data. Edite o registro existente.':result.error.code==='22023'?result.error.message:'Não foi possível salvar. Confira os dados e sua permissão.');
 if(!result.data?.length)throw new Error('A escala foi alterada por outra pessoa. Feche e atualize antes de editar.');
 setMonth(values.service_date.slice(0,7));setDraft(null);setRevision(n=>n+1);
 }catch(e){setFormError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}}>
 <div className="form-field"><label htmlFor="cleaning-date">{copy?'Nova data':'Data'} *</label><input id="cleaning-date" type="date" min="1900-01-01" max="2199-12-31" required disabled={!!draft.version&&!copy} value={copy?copyTo:draft.service_date} onChange={e=>copy?setCopyTo(e.target.value):setDraft({...draft,service_date:e.target.value})}/></div>
 {CLEANING_TASKS.map(t=>{const assignment=draft.assignments.find(a=>a.task===t.key)!;const legacy=!assignment.staff_id&&!!assignment.nome;return <div className="form-field" key={t.key}><label htmlFor={'cleaning-'+t.key}>{t.label}{'hint'in t?' · '+t.hint:''}</label><select id={'cleaning-'+t.key} value={assignment.staff_id||(legacy?'source':'')} onChange={e=>{const p=people.find(p=>p.id===e.target.value);setDraft({...draft,assignments:draft.assignments.map(a=>a.task===t.key?{...a,staff_id:p?.id??null,nome:p?.nome??(e.target.value==='source'?assignment.nome:'')}:a)});}}><option value="">A definir / sem designação</option>{legacy&&<option value="source">{assignment.nome} · nome da origem, sem vínculo</option>}{people.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>;})}
 <div className="form-field"><label htmlFor="cleaning-notes">Observações para consulta</label><textarea id="cleaning-notes" maxLength={2000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setDraft(null)}>Cancelar</ActionButton><ActionButton type="submit" disabled={busy} variant="primary">{busy?'Salvando…':'Salvar escala'}</ActionButton></div>
 </form></DialogContent></Dialog>}
 </section>;
}
