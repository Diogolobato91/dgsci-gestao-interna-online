import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CleaningRoster from './CleaningRoster';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Phone, Trash2, RefreshCw, ShieldCheck, ClipboardList, Sparkles, Check } from 'lucide-react';
import { PageHeader, ActionButton, LoadState } from '@/components/workspace/Workspace';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { compareStaffMembers } from '@/lib/rankHierarchy';
import { DUTY_ROLES, PLANNING_STATUS, dateISO, formatContact, validateTeam, cellColors } from './roster';
import type { RosterPerson, Plantao, Plan, PlanRow, PlanCell, PlanningStatus } from './roster';
import { fetchStaffAbsences } from './useStaffAbsences';
import { absenceOn,shortDate,staffOperationError,institutionalToday } from './staffAvailability';
import type { StaffAbsence } from './staffAvailability';

export default function RosterWorkspace() {
  const { user } = useAuth();
  const canEdit = !!user?.allowedProfiles?.some(p => ['Secretaria','Diretoria','Subdiretoria'].includes(p));
  const [params]=useSearchParams();
  const tab=params.get('aba')==='vc'?'vc':params.get('aba')==='administracao'?'administracao':'plantao';
  const [month,setMonth] = useState(() => institutionalToday().slice(0,7));
  const [day,setDay] = useState(() => institutionalToday());
  const [people,setPeople] = useState<RosterPerson[]>([]), [duties,setDuties] = useState<Plantao[]>([]);
  const [plan,setPlan] = useState<Plan|null>(null), [rows,setRows] = useState<PlanRow[]>([]);
  const [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [revision,setRevision] = useState(0), [busy,setBusy] = useState(false), [formError,setFormError] = useState('');
  const [draft,setDraft] = useState<Partial<Plantao>|null>(null);
  const [cellEdit,setCellEdit] = useState<{ row: PlanRow; date: string; cell: PlanCell }|null>(null);
  const [rowEdit,setRowEdit] = useState<Partial<PlanRow>|null>(null);
  const [notes,setNotes] = useState<string|null>(null);
  const [contactPerson,setContactPerson] = useState<RosterPerson|null>(null);
  const [removeDay,setRemoveDay] = useState<Plantao|null>(null);
  const [section,setSection] = useState('Todas');
  const [absences,setAbsences]=useState<StaffAbsence[]>([]),[draftAbsences,setDraftAbsences]=useState<StaffAbsence[]>([]);
  const [availabilityLoading,setAvailabilityLoading]=useState(false),[availabilityError,setAvailabilityError]=useState('');
  const start = month+'-01', [year,monthNo] = month.split('-').map(Number);
  const daysInMonth = new Date(year,monthNo,0).getDate(), end = `${month}-${daysInMonth}`;
  const label = new Date(year,monthNo-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    if(tab==='vc'){setLoading(false);return;}
    if (!canEdit || !supabase) { setError('Sua conta não tem acesso à escala da Administração.'); setLoading(false); return; }
    void (async () => {
      const results = await Promise.all([
        supabase.rpc('get_roster_people'),
        supabase.from('plantao_roster').select('*').gte('service_date',start).lte('service_date',end).order('service_date'),
        supabase.from('roster_plans').select('*').eq('month',start).maybeSingle(),
        supabase.from('roster_plan_rows').select('*').eq('month',start).order('source_order'),
        fetchStaffAbsences({start,end}).then(data=>({data,error:null})),
      ]);
      if (!alive) return;
      if (results.some(r => r.error)) setError('Não foi possível carregar a escala. Tente novamente.');
      else {
        setPeople((results[0].data || []).sort((a:RosterPerson,b:RosterPerson) => compareStaffMembers({nome:a.nome,postoGraduacao:a.posto_graduacao},{nome:b.nome,postoGraduacao:b.posto_graduacao})));
        setDuties(results[1].data || []); setPlan(results[2].data); setRows(results[3].data || []);
        setAbsences(results[4].data||[]);
      }
      setLoading(false);
    })().catch(() => { if(alive) {setLoading(false);setError('Não foi possível carregar a escala.');} });
    return () => { alive = false; };
  },[start,end,revision,canEdit,user?.id,tab]);
  useEffect(()=>{
    let alive=true;setDraftAbsences([]);setAvailabilityError('');
    if(!draft?.service_date||!canEdit){setAvailabilityLoading(false);return;}
    setAvailabilityLoading(true);
    void fetchStaffAbsences({start:draft.service_date,end:draft.service_date}).then(data=>{if(alive)setDraftAbsences(data);}).catch(e=>{if(alive)setAvailabilityError(e.message);}).finally(()=>{if(alive)setAvailabilityLoading(false);});
    return()=>{alive=false;};
  },[draft?.service_date,revision,canEdit,user?.id]);
  const military = people.filter(p => p.posto_graduacao.trim().toUpperCase() !== 'VC');
  const byId = new Map(people.map(p => [p.id,p]));
  const selected = duties.find(d => d.service_date === day);
  const conflicts=duties.filter(d=>[d.chief_id,d.assistant_id,d.expert_id].some(id=>absenceOn(absences,byId.get(id)?.staff_id,d.service_date)));
  const firstOffset = (new Date(year,monthNo-1,1).getDay()+6)%7;
  const calendar = Array.from({length:Math.ceil((firstOffset+daysInMonth)/7)*7},(_,i) => i>=firstOffset&&i<firstOffset+daysInMonth ? `${month}-${String(i-firstOffset+1).padStart(2,'0')}` : null);
  const planningDates = Array.from(new Set([...Array.from({length:daysInMonth},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`),...rows.flatMap(r=>Object.keys(r.cells))])).sort();
  const move = (offset:number) => { const d=new Date(year,monthNo-1+offset,1);setMonth(dateISO(d).slice(0,7));setDay(dateISO(d)); };
  const openTeam = () => {setFormError('');setDraft(selected?{...selected}:{service_date:day,chief_id:'',assistant_id:'',expert_id:'',notes:''});};
  async function save(action:()=>Promise<void>) {
    if(busy) return;setBusy(true);setFormError('');
    try {await action();setRevision(v=>v+1);} catch(e) {setFormError(e instanceof Error?e.message:'Não foi possível salvar.');} finally {setBusy(false);}
  }
  function check(result:{error: {code?:string;message?:string}|null; data:unknown[]|null}) {
    if(result.error) throw new Error(result.error.code==='23505'?'Já existe uma escala para essa data. Atualize antes de editar.':staffOperationError(result.error));
    if(!result.data?.length) throw new Error('Este registro foi alterado por outra pessoa. Feche e atualize a escala.');
  }
  async function ensurePlan() {
    if(plan) return plan;
    const result=await supabase!.from('roster_plans').insert({month:start}).select('*').single();
    if(result.error) throw new Error(result.error.code==='23505'?'A previsão foi iniciada por outra pessoa. Feche e atualize a escala.':'Não foi possível iniciar a previsão do mês.');
    return result.data as Plan;
  }
  const footer = (close:()=>void, title='Salvar', disabled=false) => <>{formError&&<p role="alert" className="form-error">{formError}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={close}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy||disabled}>{busy?'Salvando…':title}</ActionButton></div></>;
  return <section className="workspace-page roster-page">
    <PageHeader eyebrow="Administração" title="Escala mensal" description="Plantão, previsão da Administração e escala dos voluntários civis." icon={CalendarDays}/>
    <nav className="roster-navigation" aria-label="Tipos de escala">
      {[
        {id:'plantao',title:'Plantão',description:'Equipe diária de serviço',icon:ShieldCheck,path:'/escala-mensal'},
        {id:'administracao',title:'Previsão da Administração',description:'Planejamento mensal do efetivo',icon:ClipboardList,path:'/escala-mensal?aba=administracao'},
        {id:'vc',title:'Escala dos VCs',description:'Conservação e limpeza',icon:Sparkles,path:'/escala-mensal?aba=vc'},
      ].map(({id,title,description,icon:Icon,path})=><Link key={id} to={path} aria-current={tab===id?'page':undefined} className={'roster-navigation-item'+(tab===id?' is-active':'')}>
        <span className="roster-navigation-icon"><Icon size={23} aria-hidden="true"/></span>
        <span className="roster-navigation-text"><strong>{title}</strong><span>{description}</span></span>
        {tab===id&&<Check className="roster-navigation-check" size={19} aria-hidden="true"/>}
      </Link>)}
    </nav>
    {tab==='vc'?<CleaningRoster/>:<>
    <div className="roster-toolbar"><div className="roster-month"><ActionButton aria-label="Mês anterior" onClick={()=>move(-1)}><ChevronLeft size={18}/></ActionButton><h2>{label}</h2><ActionButton aria-label="Próximo mês" onClick={()=>move(1)}><ChevronRight size={18}/></ActionButton></div><div className="roster-month-controls"><label htmlFor="roster-month" className="sr-only">Mês da escala</label><input id="roster-month" type="month" min="1900-01" max="2199-12" value={month} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){setMonth(e.target.value);setDay(e.target.value+'-01');}}}/><ActionButton onClick={()=>{setMonth(institutionalToday().slice(0,7));setDay(institutionalToday());}}>Hoje</ActionButton><ActionButton onClick={()=>setRevision(v=>v+1)}><RefreshCw size={14}/>Atualizar</ActionButton></div></div>
    {loading||error?<LoadState error={error} onRetry={()=>setRevision(v=>v+1)}/>:tab==='plantao'?<>
      <div className="roster-summary"><span><strong>{duties.length-conflicts.length}</strong> dias com equipe disponível</span><span><strong>3</strong> militares por plantão</span></div>
      {!!conflicts.length&&<div className="staff-warning" role="alert"><strong>Há {conflicts.length} plantão(ões) com militar afastado</strong><p>Revise as equipes. Os afastamentos não apagam os plantões existentes.</p><div className="record-actions">{conflicts.map(d=><ActionButton key={d.id} onClick={()=>setDay(d.service_date)}>{shortDate(d.service_date)}</ActionButton>)}</div></div>}
      <div className="roster-layout"><section className="roster-calendar" aria-label={'Plantões de '+label}><div className="roster-weekdays">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><span key={d}>{d}</span>)}</div><div className="roster-grid">{calendar.map((date,i)=>date?<button key={date} aria-pressed={date===day} aria-label={`${date}: ${conflicts.some(d=>d.service_date===date)?'Revisar equipe: há militar afastado':duties.some(d=>d.service_date===date)?'Equipe disponível':'Sem equipe cadastrada'}`} className={`roster-day ${date===day?'is-selected':''} ${date===institutionalToday()?'is-today':''} ${conflicts.some(d=>d.service_date===date)?'has-conflict':''}`} onClick={()=>setDay(date)}><strong>{Number(date.slice(-2))}</strong><small>{conflicts.some(d=>d.service_date===date)?'Revisar':duties.some(d=>d.service_date===date)?'3/3 · Disponível':'A definir'}</small></button>:<div key={i} className="roster-day is-outside"/>)}</div></section>
      <aside className="roster-agenda"><div className="roster-agenda-heading"><span>EQUIPE DO DIA</span><h3>{new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</h3></div>{DUTY_ROLES.map((role,i)=>{const id=selected?.[(['chief_id','assistant_id','expert_id'] as const)[i]];const p=id?byId.get(id):null;const absence=absenceOn(absences,p?.staff_id,day);return <article key={role} className="roster-service"><span className="table-overline">{role}</span><h4>{p?`${p.posto_graduacao} ${p.nome}`:'A definir'}</h4>{p&&<><p><Phone size={13}/> {formatContact(p.resolved_contact)}</p>{absence&&<div className="staff-warning" role="alert"><strong>{absence.kind}</strong><p>{shortDate(absence.starts_on)} a {shortDate(absence.ends_on)}</p>{absence.reason&&<p>{absence.reason}</p>}</div>}{!p.staff_id&&<small>Sem vínculo com o efetivo. A disponibilidade deve ser conferida pela Administração.</small>}<ActionButton variant="ghost" onClick={()=>{setFormError('');setContactPerson({...p,contato:p.resolved_contact});}}>Consultar / editar contato</ActionButton></>}</article>;})}{selected?.notes&&<p className="roster-notes">{selected.notes}</p>}{canEdit&&<><ActionButton variant="primary" onClick={openTeam}><Pencil size={15}/>{selected?'Editar equipe':'Montar equipe'}</ActionButton>{selected&&<ActionButton variant="ghost" className="workspace-button-danger" onClick={()=>{setFormError('');setRemoveDay(selected);}}><Trash2 size={14}/>Retirar escala deste dia</ActionButton>}</>}</aside></div>
    </>:<>
      <div className="roster-plan-heading"><div><h2>Previsão mensal de serviço</h2><p>Contadores de folga e marcações da Administração. A previsão não altera automaticamente a equipe do plantão.</p>{plan?.source_label&&<small>{plan.source_label}{plan.source_updated&&` · Atualização informada na origem: ${plan.source_updated}`}</small>}</div><div className="record-actions"><ActionButton onClick={()=>{setFormError('');setNotes(plan?.notes||'');}}><Pencil size={14}/>Observações</ActionButton><ActionButton variant="primary" onClick={()=>{setFormError('');setRowEdit({nome:'',posto_graduacao:'SD',section:DUTY_ROLES[0],cells:{}});}}><Plus size={15}/>Adicionar militar</ActionButton></div></div>
      <div className="roster-legend" aria-label="Legenda da previsão">{Object.entries(PLANNING_STATUS).filter(([k])=>k).map(([k,v])=><span key={k}><i style={{backgroundColor:v.bg}}/>{v.label}</span>)}</div><p className="roster-source-hint">As demais cores de fundo foram preservadas da planilha, sem atribuir situações por aproximação.</p><label className="roster-section-filter">Função <select value={section} onChange={e=>setSection(e.target.value)}><option>Todas</option>{DUTY_ROLES.map(r=><option key={r}>{r}</option>)}</select></label>
      {!rows.length?<div className="roster-empty"><CalendarDays size={30}/><strong>Previsão ainda não cadastrada neste mês</strong><p>Adicione os militares para iniciar o planejamento.</p></div>:<div className="roster-matrix-scroll" tabIndex={0} aria-label="Previsão mensal. Role horizontalmente para consultar os dias."><table className="roster-matrix"><thead><tr><th>Militar / função</th>{planningDates.map(d=><th key={d} scope="col"><span>{d.slice(8)}{d.slice(0,7)!==month&&`/${d.slice(5,7)}`}</span><small>{new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</small></th>)}</tr></thead><tbody>{rows.filter(r=>section==='Todas'||r.section===section).map(r=><tr key={r.id}><th scope="row"><button onClick={()=>{setFormError('');setRowEdit({...r});}}><strong style={{color:/^#[a-f0-9]{6}$/i.test(r.name_color)?r.name_color:undefined}}>{r.posto_graduacao} {r.nome}</strong><small>{r.section} · editar</small></button></th>{planningDates.map(d=>{const c=r.cells[d];return <td key={d}><button style={cellColors(c)} aria-label={`${r.nome}, ${d}: ${c?.value||'sem contador'}, ${PLANNING_STATUS[c?.status||'']?.label||'marcação da origem'}. Editar`} onClick={()=>{setFormError('');setCellEdit({row:r,date:d,cell:c?{...c}:{value:'',status:''}});}}>{c?.value||'—'}</button></td>;})}</tr>)}</tbody></table></div>}{plan?.notes&&<section className="roster-source-notes"><h3>Observações da Administração</h3><p>{plan.notes}</p></section>}
    </>}
    </>}
    <Dialog open={!!draft} onOpenChange={o=>{if(!o&&!busy)setDraft(null);}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><DialogTitle>{draft?.id?'Editar equipe de plantão':'Montar equipe de plantão'}</DialogTitle><DialogDescription>Preencha as três funções com militares distintos. O contato é consultado no cadastro.</DialogDescription></DialogHeader>{draft&&<form className="record-form" onSubmit={e=>{e.preventDefault();void save(async()=>{
      if(!validateTeam([draft.chief_id||'',draft.assistant_id||'',draft.expert_id||''],people))throw new Error('Selecione três militares distintos.');
      if(availabilityLoading||availabilityError)throw new Error('Atualize a disponibilidade antes de salvar a equipe.');
      if([draft.chief_id,draft.assistant_id,draft.expert_id].some(id=>absenceOn(draftAbsences,byId.get(id||'')?.staff_id,draft.service_date!)))throw new Error('Há militar afastado nessa data. Revise a equipe antes de salvar.');
      const values={service_date:draft.service_date,chief_id:draft.chief_id,assistant_id:draft.assistant_id,expert_id:draft.expert_id,notes:draft.notes?.trim()||''};
      check(draft.id?await supabase!.from('plantao_roster').update(values).eq('id',draft.id).eq('version',draft.version).select('id'):await supabase!.from('plantao_roster').insert(values).select('id'));
      setDay(values.service_date!);setMonth(values.service_date!.slice(0,7));setDraft(null);
    });}}><div className="form-field"><label htmlFor="plantao-date">Data *</label><input id="plantao-date" type="date" required value={draft.service_date} onChange={e=>setDraft({...draft,service_date:e.target.value})}/></div>{DUTY_ROLES.map((role,i)=>{const key=(['chief_id','assistant_id','expert_id'] as const)[i];const p=byId.get(draft[key]||'');const absence=absenceOn(draftAbsences,p?.staff_id,draft.service_date!);return <div className="form-field" key={key}><label htmlFor={'plantao-'+key}>{role} *</label><select id={'plantao-'+key} required value={draft[key]||''} onChange={e=>setDraft({...draft,[key]:e.target.value})}><option value="">Selecione o militar</option>{military.map(p=><option key={p.id} value={p.id} disabled={!!absenceOn(draftAbsences,p.staff_id,draft.service_date!)}>{p.posto_graduacao} {p.nome}{absenceOn(draftAbsences,p.staff_id,draft.service_date!)?' · Afastado nessa data':''}{!p.staff_id?' · Sem vínculo com efetivo':''}</option>)}</select>{p&&<small>{formatContact(p.resolved_contact)}</small>}{absence&&<p className="form-error" role="alert">{absence.kind}: {shortDate(absence.starts_on)} a {shortDate(absence.ends_on)}. Selecione outro militar.</p>}</div>;})}<div className="form-field"><label htmlFor="plantao-notes">Observações</label><textarea id="plantao-notes" maxLength={4000} rows={3} value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>{availabilityLoading&&<p role="status">Consultando disponibilidade…</p>}{availabilityError&&<div className="staff-warning" role="alert"><p>{availabilityError}</p><ActionButton onClick={()=>setRevision(v=>v+1)}>Tentar novamente</ActionButton></div>}{footer(()=>setDraft(null),'Salvar equipe',availabilityLoading||!!availabilityError)}</form>}</DialogContent></Dialog>
    <Dialog open={!!cellEdit} onOpenChange={o=>{if(!o&&!busy)setCellEdit(null);}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Editar previsão do dia</DialogTitle><DialogDescription>{cellEdit?.row.nome} · {cellEdit?.date.split('-').reverse().join('/')}</DialogDescription></DialogHeader>{cellEdit&&<form className="record-form" onSubmit={e=>{e.preventDefault();void save(async()=>{const row=cellEdit.row;check(await supabase!.from('roster_plan_rows').update({cells:{...row.cells,[cellEdit.date]:cellEdit.cell}}).eq('id',row.id).eq('version',row.version).select('id'));setCellEdit(null);});}}><div className="form-field"><label htmlFor="cell-value">Contador / indicação da previsão</label><input id="cell-value" maxLength={20} value={cellEdit.cell.value} onChange={e=>setCellEdit({...cellEdit,cell:{...cellEdit.cell,value:e.target.value}})}/></div><div className="form-field"><label htmlFor="cell-status">Situação</label><select id="cell-status" value={cellEdit.cell.status} onChange={e=>{const status=e.target.value as PlanningStatus;setCellEdit({...cellEdit,cell:{...cellEdit.cell,status,bg:PLANNING_STATUS[status].bg,fg:PLANNING_STATUS[status].fg}});}}>{Object.entries(PLANNING_STATUS).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}</select></div>{footer(()=>setCellEdit(null),'Salvar previsão')}</form>}</DialogContent></Dialog>
    <Dialog open={!!rowEdit} onOpenChange={o=>{if(!o&&!busy)setRowEdit(null);}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>{rowEdit?.id?'Editar militar na previsão':'Adicionar militar à previsão'}</DialogTitle><DialogDescription>O cadastro se aplica à previsão de {label}.</DialogDescription></DialogHeader>{rowEdit&&<form className="record-form" onSubmit={e=>{e.preventDefault();void save(async()=>{await ensurePlan();const values={month:start,nome:rowEdit.nome?.trim(),posto_graduacao:rowEdit.posto_graduacao,section:rowEdit.section};check(rowEdit.id?await supabase!.from('roster_plan_rows').update(values).eq('id',rowEdit.id).eq('version',rowEdit.version).select('id'):await supabase!.from('roster_plan_rows').insert({...values,source_order:Math.max(0,...rows.map(r=>r.source_order))+1}).select('id'));setRowEdit(null);});}}><div className="form-field"><label htmlFor="row-name">Nome de guerra *</label><input id="row-name" required minLength={2} maxLength={160} value={rowEdit.nome} onChange={e=>setRowEdit({...rowEdit,nome:e.target.value})}/></div><div className="form-field"><label htmlFor="row-rank">Posto / graduação *</label><input id="row-rank" required maxLength={40} value={rowEdit.posto_graduacao} onChange={e=>setRowEdit({...rowEdit,posto_graduacao:e.target.value})}/></div><div className="form-field"><label htmlFor="row-section">Função *</label><select id="row-section" value={rowEdit.section} onChange={e=>setRowEdit({...rowEdit,section:e.target.value})}>{DUTY_ROLES.map(r=><option key={r}>{r}</option>)}</select></div>{footer(()=>setRowEdit(null),'Salvar militar')}</form>}</DialogContent></Dialog>
    <Dialog open={notes!==null} onOpenChange={o=>{if(!o&&!busy)setNotes(null);}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><DialogTitle>Observações da Administração</DialogTitle><DialogDescription>Orientações e afastamentos do mês.</DialogDescription></DialogHeader><form className="record-form" onSubmit={e=>{e.preventDefault();void save(async()=>{const currentPlan=await ensurePlan();check(await supabase!.from('roster_plans').update({notes:notes||''}).eq('month',start).eq('version',currentPlan.version).select('month'));setNotes(null);});}}><div className="form-field"><label htmlFor="plan-notes">Observações</label><textarea id="plan-notes" rows={12} maxLength={12000} value={notes||''} onChange={e=>setNotes(e.target.value)}/></div>{footer(()=>setNotes(null),'Salvar observações')}</form></DialogContent></Dialog>
    <Dialog open={!!contactPerson} onOpenChange={o=>{if(!o&&!busy)setContactPerson(null);}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Contato do militar</DialogTitle><DialogDescription>{contactPerson?.posto_graduacao} {contactPerson?.nome}</DialogDescription></DialogHeader>{contactPerson&&<form className="record-form" onSubmit={e=>{e.preventDefault();void save(async()=>{const phone=(contactPerson.contato||'').replace(/\D/g,'');if(!/^\d{10,11}$/.test(phone))throw new Error('Informe o telefone com DDD (10 ou 11 dígitos).');const result=await supabase!.rpc('set_roster_contact',{p_id:contactPerson.id,p_contato:phone,p_version:contactPerson.version});if(result.error)throw new Error(result.error.code==='40001'?'O contato foi alterado. Feche e atualize a escala.':'Não foi possível salvar o contato.');setContactPerson(null);});}}><p>Contato em uso: <strong>{formatContact(contactPerson.resolved_contact)}</strong></p><small>{contactPerson.contact_source}. O contato será atualizado também no cadastro aprovado vinculado por CPF e matrícula.</small><div className="form-field"><label htmlFor="roster-contact">Contato (DDD + telefone)</label><input id="roster-contact" type="tel" maxLength={20} required value={contactPerson.contato||''} onChange={e=>setContactPerson({...contactPerson,contato:e.target.value})}/></div>{footer(()=>setContactPerson(null),'Salvar contato')}</form>}</DialogContent></Dialog>
    <Dialog open={!!removeDay} onOpenChange={o=>{if(!o&&!busy)setRemoveDay(null);}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Retirar a escala deste dia?</DialogTitle><DialogDescription>As três funções voltarão a ficar a definir. Os cadastros dos militares serão preservados.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();void save(async()=>{check(await supabase!.from('plantao_roster').delete().eq('id',removeDay!.id).eq('version',removeDay!.version).select('id'));setRemoveDay(null);});}}>{footer(()=>setRemoveDay(null),'Retirar escala')}</form></DialogContent></Dialog>
  </section>;
}
