import { useState } from 'react';
import { Plus, ExternalLink, Pencil, FileText, RefreshCw, Eye, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader, ActionButton, SearchField, DataPanel, EmptyResults, LoadState, usePagination, TablePagination, SummaryStrip } from '@/components/workspace/Workspace';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useDatabaseRows } from './useDatabaseRows';
import { canManageOrdinances, normalizeSearch, safeFileUrl } from './recordAccess';
type Ordinance = { id: string; year: number; numero: string; bg: string; assunto: string; conclusao: string; file_label: string; file_url: string; version: number; source_row: number | null };
type Draft = Pick<Ordinance, 'year' | 'numero' | 'bg' | 'assunto' | 'conclusao' | 'file_label' | 'file_url'>;
const newDraft = (year: number): Draft => ({ year, numero: '', bg: '', assunto: '', conclusao: '', file_label: '', file_url: '' });
export default function OrdinancesPage() {
  const { user } = useAuth();
  const allowed = canManageOrdinances(user);
  const years = useDatabaseRows<{ year: number }>('ordinance_years', 'year', 'year', allowed);
  const records = useDatabaseRows<Ordinance>('ordinances', 'id,year,numero,bg,assunto,conclusao,file_label,file_url,version,source_row', 'id', allowed);
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [viewing,setViewing] = useState<Ordinance | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Ordinance | null>(null);
  const [yearForm, setYearForm] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedYear = years.data.length && !years.data.some(row => row.year === year) ? Math.max(...years.data.map(row => row.year)) : year;
  const rows = records.data.filter(row => row.year === selectedYear && normalizeSearch([row.numero, row.bg, row.assunto, row.conclusao].join(' ')).includes(normalizeSearch(query))).sort((a, b) => (a.source_row ?? Infinity) - (b.source_row ?? Infinity) || a.id.localeCompare(b.id));
  const pagination=usePagination(rows,query+'|'+selectedYear);
  const editRecord=(row:Ordinance)=>{setEditing(row);setDraft({year:row.year,numero:row.numero,bg:row.bg,assunto:row.assunto,conclusao:row.conclusao,file_label:row.file_label,file_url:row.file_url});setError('');};
  if (!allowed) return <section><h1>Controle de Portarias</h1><p role="alert">Acesso restrito à Subdiretoria.</p></section>;
  const reload = () => { years.reload(); records.reload(); };
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!draft || !supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (![draft.numero, draft.bg, draft.assunto, draft.conclusao, draft.file_label, draft.file_url].some(value => value.trim())) throw new Error('Preencha os dados da portaria antes de salvar.');
      if (draft.file_url && !safeFileUrl(draft.file_url)) throw new Error('Informe um link de arquivo iniciado por https:// ou http://.');
      const values = { ...draft, file_url: draft.file_url.trim() };
      const response = editing
        ? await supabase.from('ordinances').update(values).eq('id', editing.id).eq('version', editing.version).select('id')
        : await supabase.from('ordinances').insert(values).select('id');
      if (response.error) throw new Error('Não foi possível salvar a portaria. Confira sua conexão e permissão.');
      if (!response.data?.length) throw new Error('Este registro foi alterado por outra pessoa. Feche a edição, atualize a lista e tente novamente.');
      setYear(draft.year); setDraft(null); setEditing(null); setMessage('Portaria salva.'); records.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  return <section className="workspace-page">
    <PageHeader eyebrow="Subdiretoria" title="Controle de Portarias" description="Organize, consulte e mantenha as portarias do departamento." icon={FileText} actions={<><ActionButton onClick={reload} disabled={records.loading||years.loading}><RefreshCw size={16}/>Atualizar</ActionButton><ActionButton variant="primary" disabled={!years.data.length||records.loading} onClick={()=>{setEditing(null);setDraft(newDraft(selectedYear));setError('');}}><Plus size={17}/>Nova portaria</ActionButton></>}/>
    <SummaryStrip items={[{label:'Portarias cadastradas',value:records.data.length},{label:'Anos disponíveis',value:years.data.length},{label:'Registros em '+selectedYear,value:records.data.filter(row=>row.year===selectedYear).length}]}/>
    <DataPanel title="Portarias" count={rows.length} toolbar={<><SearchField id="ordinance-query" value={query} onChange={setQuery} placeholder="Buscar portaria, BG ou assunto…"/><div className="workspace-filter"><label htmlFor="ordinance-year">Ano</label><select id="ordinance-year" value={selectedYear} onChange={event=>setYear(Number(event.target.value))}>{[...years.data].reverse().map(row=><option key={row.year} value={row.year}>{row.year}</option>)}</select><ActionButton variant="ghost" onClick={()=>{setError('');setYearForm(true);}}><Plus size={15}/>Adicionar ano</ActionButton></div></>} footer={!years.loading&&!records.loading&&!years.error&&!records.error&&<TablePagination {...pagination}/> }>
      {message&&<p role="status" className="workspace-feedback">{message}</p>}
      {years.loading||records.loading||years.error||records.error?<LoadState error={years.error||records.error} onRetry={reload}/>:<div className="records-table"><table><thead><tr><th>Portaria / publicação</th><th>Assunto</th><th>Arquivo</th><th className="table-actions-heading">Ações</th></tr></thead><tbody>{pagination.rows.map(row=><tr key={row.id}><td><strong className="table-primary">{row.numero||'Identificação não informada'}</strong><span className="table-secondary">BG: {row.bg||'não informado'}</span></td><td className="table-long"><span className="table-clamp">{row.assunto||'—'}</span></td><td>{safeFileUrl(row.file_url)?<a className="workspace-file-link" href={safeFileUrl(row.file_url)!} target="_blank" rel="noopener noreferrer" title={row.file_label}><ExternalLink size={15}/>Abrir arquivo</a>:<span className="table-secondary">Sem arquivo</span>}</td><td className="table-actions"><div><ActionButton variant="ghost" onClick={()=>setViewing(row)} aria-label={'Consultar '+row.numero}><Eye size={16}/>Consultar</ActionButton><ActionButton variant="ghost" onClick={()=>editRecord(row)} aria-label={'Editar '+row.numero}><Pencil size={15}/>Editar</ActionButton></div></td></tr>)}</tbody></table>{!rows.length&&<EmptyResults text="Nenhuma portaria encontrada neste ano." onClear={()=>setQuery('')}/>}</div>}
    </DataPanel>
    <Dialog open={!!viewing} onOpenChange={open=>{if(!open)setViewing(null);}}><DialogContent className="record-dialog detail-dialog"><DialogHeader><span className="dialog-context"><FileText size={17}/>PORTARIA · {viewing?.year}</span><DialogTitle>{viewing?.numero||'Portaria sem identificação'}</DialogTitle><DialogDescription>Detalhes do registro e documento de referência.</DialogDescription></DialogHeader>{viewing&&<div className="detail-body"><dl><div><dt>Publicação / BG</dt><dd>{viewing.bg||'Não informado'}</dd></div><div><dt>Assunto</dt><dd>{viewing.assunto||'Não informado'}</dd></div><div><dt>Conclusão</dt><dd>{viewing.conclusao||'Não informada'}</dd></div></dl><div className="record-actions">{safeFileUrl(viewing.file_url)&&<a className="workspace-button workspace-button-secondary" href={safeFileUrl(viewing.file_url)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir arquivo</a>}<ActionButton variant="primary" onClick={()=>{editRecord(viewing);setViewing(null);}}><Pencil size={16}/>Editar portaria</ActionButton></div></div>}</DialogContent></Dialog>
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) { setDraft(null); setEditing(null); setError(''); } }}><DialogContent className="record-dialog editor-dialog"><DialogHeader><span className="dialog-context"><FileText size={17}/>CONTROLE DE PORTARIAS</span><DialogTitle>{editing ? 'Editar portaria' : 'Nova portaria'}</DialogTitle><DialogDescription>Os dados serão salvos no controle da Subdiretoria.</DialogDescription></DialogHeader>{draft && <form className="record-form" onSubmit={save}>
      <section className="editor-section"><h3>Identificação e publicação</h3><div className="form-grid"><div className="form-field"><label htmlFor="edit-year">Ano do registro</label><select id="edit-year" value={draft.year} onChange={event=>setDraft({...draft,year:Number(event.target.value)})}>{[...years.data].reverse().map(row=><option key={row.year} value={row.year}>{row.year}</option>)}</select></div><div className="form-field"><label htmlFor="edit-bg">Publicação / BG</label><input id="edit-bg" value={draft.bg} onChange={event=>setDraft({...draft,bg:event.target.value})}/></div><div className="form-field form-field-wide"><label htmlFor="edit-numero">Identificação da portaria</label><input id="edit-numero" value={draft.numero} onChange={event=>setDraft({...draft,numero:event.target.value})}/></div></div></section>
      <section className="editor-section"><h3>Assunto e conclusão</h3>{(['assunto','conclusao'] as const).map(key=><div className="form-field" key={key}><label htmlFor={'edit-'+key}>{key==='assunto'?'Assunto':'Conclusão'}</label><textarea id={'edit-'+key} rows={key==='assunto'?3:5} value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></div>)}</section>
      <section className="editor-section"><h3>Documento de referência</h3><div className="form-field"><label htmlFor="edit-file_label">Nome do arquivo</label><input id="edit-file_label" value={draft.file_label} onChange={event=>setDraft({...draft,file_label:event.target.value})}/></div><div className="form-field"><label htmlFor="edit-file_url">Link do arquivo</label><input id="edit-file_url" type="url" placeholder="https://" value={draft.file_url} onChange={event=>setDraft({...draft,file_url:event.target.value})}/></div></section>
      {error && <p role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setDraft(null)}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar portaria'}</ActionButton></div>
    </form>}</DialogContent></Dialog>
    <Dialog open={yearForm} onOpenChange={open => { if (!busy) { setYearForm(open); setError(''); } }}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Adicionar ano</DialogTitle><DialogDescription>Crie um novo ano para cadastrar portarias.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async event => { event.preventDefault(); if (!supabase || busy) return; setBusy(true); setError(''); try { const {error: problem} = await supabase.from('ordinance_years').insert({year: newYear}); if (problem) throw new Error(problem.code === '23505' ? 'Este ano já está cadastrado.' : 'Não foi possível criar o ano.'); setYear(newYear); setYearForm(false); setMessage('Ano adicionado.'); years.reload(); } catch(reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o ano.'); } finally {setBusy(false);} }}><label htmlFor="new-ordinance-year">Ano</label><input id="new-ordinance-year" type="number" min={1900} max={2200} required value={newYear} onChange={event => setNewYear(Number(event.target.value))} />{error && <p role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setYearForm(false)}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Plus size={16}/>{busy?'Salvando…':'Adicionar ano'}</ActionButton></div></form></DialogContent></Dialog>
  </section>;
}
