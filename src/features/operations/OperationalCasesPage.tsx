import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, FileSearch, Gavel, Pencil, Plus, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ActionButton,
  DataPanel,
  EmptyResults,
  LoadState,
  PageHeader,
  SearchField,
  SummaryStrip,
  TablePagination,
  usePagination,
} from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import './operations.css';

export type OperationalKind = 'project' | 'infraction' | 'technical_committee';
type CaseStatus = 'open' | 'in_review' | 'waiting' | 'approved' | 'rejected' | 'closed';
type OperationalCase = {
  id: string;
  case_number: number;
  kind: OperationalKind;
  subject: string;
  requester_name: string;
  cnpj: string;
  reference: string;
  status: CaseStatus;
  assigned_to: string;
  notes: string;
  outcome: string;
  opened_on: string;
  decided_on: string | null;
  version: number;
  updated_at: string;
};

type Draft = Pick<OperationalCase, 'subject' | 'requester_name' | 'cnpj' | 'reference' | 'status' | 'assigned_to' | 'notes' | 'outcome' | 'opened_on'>;

const config = {
  project: {
    eyebrow: 'Operacional Análise',
    title: 'Projetos',
    description: 'Registre a entrada, análise e decisão dos projetos técnicos.',
    singular: 'projeto',
    prefix: 'PRJ',
    icon: FileSearch,
  },
  infraction: {
    eyebrow: 'Operacional Multas',
    title: 'Gestão de Autos',
    description: 'Acompanhe autos, defesas, regularizações e decisões administrativas.',
    singular: 'auto',
    prefix: 'AUT',
    icon: Gavel,
  },
  technical_committee: {
    eyebrow: 'Subdiretoria',
    title: 'Comissão Técnica',
    description: 'Organize processos submetidos à Comissão Técnica e suas deliberações.',
    singular: 'processo',
    prefix: 'CT',
    icon: ClipboardCheck,
  },
} as const;

const statusLabels: Record<CaseStatus, string> = {
  open: 'Aberto',
  in_review: 'Em análise',
  waiting: 'Aguardando informação',
  approved: 'Deferido',
  rejected: 'Indeferido',
  closed: 'Encerrado',
};

const emptyDraft = (): Draft => ({
  subject: '',
  requester_name: '',
  cnpj: '',
  reference: '',
  status: 'open',
  assigned_to: '',
  notes: '',
  outcome: '',
  opened_on: new Date().toISOString().slice(0, 10),
});

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const protocol = (row: OperationalCase) => `${config[row.kind].prefix}-${String(row.case_number).padStart(6, '0')}`;
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : '—';
const cleanCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14);
const formatCnpj = (value: string) => value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

export default function OperationalCasesPage({ kind }: { kind: OperationalKind }) {
  const pageConfig = config[kind];
  const [rows, setRows] = useState<OperationalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CaseStatus>('all');
  const [editing, setEditing] = useState<OperationalCase | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('operational_cases')
      .select('*')
      .eq('kind', kind)
      .order('opened_on', { ascending: false })
      .order('case_number', { ascending: false });
    if (loadError) setError('Não foi possível carregar os processos. Confira sua permissão e tente novamente.');
    else {
      setRows((data ?? []) as OperationalCase[]);
      setError('');
    }
    setLoading(false);
  }, [kind]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return rows.filter(row => {
      if (status !== 'all' && row.status !== status) return false;
      return !term || normalize(`${protocol(row)} ${row.subject} ${row.requester_name} ${row.cnpj} ${row.reference} ${row.assigned_to}`).includes(term);
    });
  }, [query, rows, status]);
  const pagination = usePagination(filtered, `${kind}-${status}-${query}`, 15);
  const active = rows.filter(row => ['open', 'in_review', 'waiting'].includes(row.status)).length;
  const decided = rows.filter(row => ['approved', 'rejected', 'closed'].includes(row.status)).length;

  const openNew = () => { setEditing(null); setDraft(emptyDraft()); setError(''); };
  const openEdit = (row: OperationalCase) => {
    setEditing(row);
    setDraft({
      subject: row.subject,
      requester_name: row.requester_name,
      cnpj: row.cnpj,
      reference: row.reference,
      status: row.status,
      assigned_to: row.assigned_to,
      notes: row.notes,
      outcome: row.outcome,
      opened_on: row.opened_on,
    });
    setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    const cnpj = cleanCnpj(draft.cnpj);
    if (draft.cnpj && cnpj.length !== 14) { setError('Informe um CNPJ com 14 dígitos ou deixe o campo vazio.'); return; }
    setBusy(true);
    setError('');
    const payload = { ...draft, cnpj, subject: draft.subject.trim(), requester_name: draft.requester_name.trim(), reference: draft.reference.trim(), assigned_to: draft.assigned_to.trim(), notes: draft.notes.trim(), outcome: draft.outcome.trim() };
    const result = editing
      ? await supabase.from('operational_cases').update({ ...payload, version: editing.version }).eq('id', editing.id).eq('version', editing.version)
      : await supabase.from('operational_cases').insert({ ...payload, kind });
    if (result.error) setError(result.error.code === '40001' ? 'Este processo foi atualizado por outra pessoa. Recarregue e tente novamente.' : 'Não foi possível salvar o processo. Revise os campos e tente novamente.');
    else { setEditing(undefined); await load(); }
    setBusy(false);
  };

  return <section className="workspace-page operations-page">
    <PageHeader
      eyebrow={pageConfig.eyebrow}
      title={pageConfig.title}
      description={pageConfig.description}
      icon={pageConfig.icon}
      actions={<><ActionButton onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Atualizar</ActionButton><ActionButton variant="primary" onClick={openNew}><Plus size={16} aria-hidden="true" />Novo {pageConfig.singular}</ActionButton></>}
    />
    <SummaryStrip items={[{ label: 'Total', value: rows.length }, { label: 'Em andamento', value: active }, { label: 'Finalizados', value: decided }]} />
    {error && editing === undefined && <p className="operations-error" role="alert">{error}</p>}
    <DataPanel title={pageConfig.title} count={filtered.length} toolbar={<div className="operations-toolbar"><SearchField id={`${kind}-search`} value={query} onChange={setQuery} placeholder="Buscar protocolo, interessado, CNPJ ou assunto…" /><label><span>Situação</span><select value={status} onChange={event => setStatus(event.target.value as 'all' | CaseStatus)}><option value="all">Todas</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>} footer={<TablePagination {...pagination} />}>
      {loading ? <LoadState /> : pagination.rows.length ? <div className="records-table"><table><thead><tr><th>Processo</th><th>Interessado</th><th>Situação</th><th>Responsável</th><th>Entrada</th><th className="table-actions-heading">Ações</th></tr></thead><tbody>{pagination.rows.map(row => <tr key={row.id}><td><strong className="table-primary">{protocol(row)}</strong><span className="table-secondary table-clamp">{row.subject}</span></td><td><strong>{row.requester_name || 'Não informado'}</strong>{row.cnpj && <span className="table-secondary">{formatCnpj(row.cnpj)}</span>}</td><td><span className={`operations-status is-${row.status}`}>{statusLabels[row.status]}</span></td><td>{row.assigned_to || 'Não definido'}</td><td>{shortDate(row.opened_on)}</td><td className="table-actions"><ActionButton variant="ghost" onClick={() => openEdit(row)} aria-label={`Editar ${protocol(row)}`}><Pencil size={15} aria-hidden="true" />Editar</ActionButton></td></tr>)}</tbody></table></div> : <EmptyResults onClear={() => { setQuery(''); setStatus('all'); }} />}
    </DataPanel>

    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open && !busy) setEditing(undefined); }}>
      <DialogContent className="record-dialog operations-dialog">
        <DialogHeader><DialogTitle>{editing ? `Editar ${protocol(editing)}` : `Novo ${pageConfig.singular}`}</DialogTitle><DialogDescription>Preencha os dados administrativos do processo. Alterações ficam registradas na auditoria.</DialogDescription></DialogHeader>
        <form id="operational-case-form" className="record-form operations-form" onSubmit={save}>
          {error && <p className="operations-error" role="alert" aria-live="polite">{error}</p>}
          <label className="form-wide">Assunto<input required minLength={3} maxLength={240} value={draft.subject} onChange={event => setDraft(current => ({ ...current, subject: event.target.value }))} /></label>
          <label>Interessado<input maxLength={180} value={draft.requester_name} onChange={event => setDraft(current => ({ ...current, requester_name: event.target.value }))} /></label>
          <label>CNPJ<input inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={draft.cnpj} onChange={event => setDraft(current => ({ ...current, cnpj: event.target.value }))} /></label>
          <label>Referência<input maxLength={120} value={draft.reference} onChange={event => setDraft(current => ({ ...current, reference: event.target.value }))} /></label>
          <label>Data de entrada<input required type="date" value={draft.opened_on} onChange={event => setDraft(current => ({ ...current, opened_on: event.target.value }))} /></label>
          <label>Situação<select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value as CaseStatus }))}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Responsável<input maxLength={180} value={draft.assigned_to} onChange={event => setDraft(current => ({ ...current, assigned_to: event.target.value }))} /></label>
          <label className="form-wide">Observações<textarea rows={4} maxLength={8000} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></label>
          <label className="form-wide">Decisão ou resultado<textarea rows={4} maxLength={8000} value={draft.outcome} onChange={event => setDraft(current => ({ ...current, outcome: event.target.value }))} /></label>
        </form>
        <DialogFooter><ActionButton onClick={() => setEditing(undefined)} disabled={busy}>Cancelar</ActionButton><ActionButton form="operational-case-form" type="submit" variant="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar processo'}</ActionButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
