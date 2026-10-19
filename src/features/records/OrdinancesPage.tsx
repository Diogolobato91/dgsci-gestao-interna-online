import { useState } from 'react';
import { Plus, Search, ExternalLink, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Ordinance | null>(null);
  const [yearForm, setYearForm] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedYear = years.data.length && !years.data.some(row => row.year === year) ? Math.max(...years.data.map(row => row.year)) : year;
  const rows = records.data.filter(row => row.year === selectedYear && normalizeSearch([row.numero, row.bg, row.assunto, row.conclusao].join(' ')).includes(normalizeSearch(query))).sort((a, b) => (a.source_row ?? Infinity) - (b.source_row ?? Infinity) || a.id.localeCompare(b.id));
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
  return <section>
    <div className="portal-section-heading"><div><p className="portal-eyebrow">SUBDIRETORIA</p><h1>Controle de Portarias<span>.</span></h1><p>Consulta e manutenção das portarias por ano.</p></div></div>
    <div className="workspace-toolbar records-toolbar"><div><label htmlFor="ordinance-year">Ano</label><select id="ordinance-year" value={selectedYear} onChange={event => setYear(Number(event.target.value))}>{[...years.data].reverse().map(row => <option key={row.year} value={row.year}>{row.year}</option>)}</select></div><div><button onClick={() => { setError(''); setYearForm(true); }}><Plus size={16} />Adicionar ano</button><button disabled={!years.data.length || records.loading} onClick={() => { setEditing(null); setDraft(newDraft(selectedYear)); setError(''); }}><Plus size={16} />Nova portaria</button><button onClick={reload} disabled={records.loading || years.loading}>Atualizar</button></div></div>
    <div className="portal-search light"><Search size={18} /><label className="sr-only" htmlFor="ordinance-query">Buscar portarias</label><input id="ordinance-query" placeholder="Buscar por portaria, BG, assunto ou conclusão…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {message && <p role="status" className="workspace-status">{message}</p>}
    {(years.error || records.error) && <p role="alert">{years.error || records.error}</p>}
    {years.loading || records.loading ? <p role="status">Carregando portarias…</p> : <><p className="workspace-status">{rows.length} registros em {selectedYear}</p><div className="records-table ordinances-table"><table><thead><tr>{['Portaria', 'BG', 'Assunto', 'Conclusão', 'Arquivo', 'Ações'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.numero || 'Não informado'}</td><td>{row.bg || '—'}</td><td>{row.assunto || '—'}</td><td>{row.conclusao || '—'}</td><td>{safeFileUrl(row.file_url) ? <a href={safeFileUrl(row.file_url)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />{row.file_label && !/^https?:/i.test(row.file_label) ? row.file_label : 'Abrir arquivo'}</a> : row.file_label || 'Não informado'}</td><td><button className="record-edit" onClick={() => { setEditing(row); setDraft({year: row.year, numero: row.numero, bg: row.bg, assunto: row.assunto, conclusao: row.conclusao, file_label: row.file_label, file_url: row.file_url}); setError(''); }}><Pencil size={15} />Editar</button></td></tr>)}</tbody></table>{!rows.length && <p className="portal-empty">Nenhuma portaria encontrada para este ano e busca.</p>}</div></>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) { setDraft(null); setEditing(null); setError(''); } }}><DialogContent className="record-dialog"><DialogHeader><DialogTitle>{editing ? 'Editar portaria' : 'Nova portaria'}</DialogTitle><DialogDescription>Os dados serão salvos no controle da Subdiretoria.</DialogDescription></DialogHeader>{draft && <form className="record-form" onSubmit={save}>
      <label htmlFor="edit-year">Ano</label><select id="edit-year" value={draft.year} onChange={event => setDraft({...draft, year: Number(event.target.value)})}>{[...years.data].reverse().map(row => <option key={row.year} value={row.year}>{row.year}</option>)}</select>
      {(['numero', 'bg', 'assunto', 'conclusao', 'file_label', 'file_url'] as const).map((key, index) => <div key={key}><label htmlFor={'edit-' + key}>{['Portaria', 'BG', 'Assunto', 'Conclusão', 'Nome do arquivo', 'Link do arquivo'][index]}</label>{['assunto', 'conclusao'].includes(key) ? <textarea id={'edit-' + key} rows={4} value={draft[key]} onChange={event => setDraft({...draft, [key]: event.target.value})} /> : <input id={'edit-' + key} type={key === 'file_url' ? 'url' : 'text'} value={draft[key]} onChange={event => setDraft({...draft, [key]: event.target.value})} />}</div>)}
      {error && <p role="alert">{error}</p>}<div className="record-actions"><button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button><button className="portal-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar portaria'}</button></div>
    </form>}</DialogContent></Dialog>
    <Dialog open={yearForm} onOpenChange={open => { if (!busy) { setYearForm(open); setError(''); } }}><DialogContent className="record-dialog"><DialogHeader><DialogTitle>Adicionar ano</DialogTitle><DialogDescription>Crie um novo ano para cadastrar portarias.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async event => { event.preventDefault(); if (!supabase || busy) return; setBusy(true); setError(''); try { const {error: problem} = await supabase.from('ordinance_years').insert({year: newYear}); if (problem) throw new Error(problem.code === '23505' ? 'Este ano já está cadastrado.' : 'Não foi possível criar o ano.'); setYear(newYear); setYearForm(false); setMessage('Ano adicionado.'); years.reload(); } catch(reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o ano.'); } finally {setBusy(false);} }}><label htmlFor="new-ordinance-year">Ano</label><input id="new-ordinance-year" type="number" min={1900} max={2200} required value={newYear} onChange={event => setNewYear(Number(event.target.value))} />{error && <p role="alert">{error}</p>}<button className="portal-primary" disabled={busy}>{busy ? 'Salvando…' : 'Adicionar ano'}</button></form></DialogContent></Dialog>
  </section>;
}
