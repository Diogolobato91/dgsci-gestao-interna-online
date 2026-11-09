import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { ActionButton, DataPanel, LoadState, PageHeader, SummaryStrip } from '@/components/workspace/Workspace';
import { logActivity } from '@/features/audit/activity';
import { supabase } from '@/lib/supabase';
import type { OperationalKind } from './OperationalCasesPage';
import './operations.css';

type ReportRow = { id: string; case_number: number; kind: OperationalKind; subject: string; requester_name: string; cnpj: string; status: string; assigned_to: string; opened_on: string; decided_on: string | null };
const kindLabels: Record<OperationalKind, string> = { project: 'Projetos', infraction: 'Autos', technical_committee: 'Comissão Técnica' };
const statusLabels: Record<string, string> = { open: 'Aberto', in_review: 'Em análise', waiting: 'Aguardando', approved: 'Deferido', rejected: 'Indeferido', closed: 'Encerrado' };
const prefixes: Record<OperationalKind, string> = { project: 'PRJ', infraction: 'AUT', technical_committee: 'CT' };
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function OperationalReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: problem } = await supabase.from('operational_cases').select('id,case_number,kind,subject,requester_name,cnpj,status,assigned_to,opened_on,decided_on').gte('opened_on', from).lte('opened_on', to).order('opened_on', { ascending: false });
    if (problem) setError('Não foi possível gerar o relatório. Confira o período e sua permissão.');
    else { setRows((data ?? []) as ReportRow[]); setError(''); }
    setLoading(false);
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    active: rows.filter(row => ['open', 'in_review', 'waiting'].includes(row.status)).length,
    decided: rows.filter(row => ['approved', 'rejected', 'closed'].includes(row.status)).length,
    cnpjs: new Set(rows.map(row => row.cnpj).filter(Boolean)).size,
  }), [rows]);
  const byKind = useMemo(() => Object.entries(kindLabels).map(([kind, label]) => ({ kind: kind as OperationalKind, label, total: rows.filter(row => row.kind === kind).length, active: rows.filter(row => row.kind === kind && ['open', 'in_review', 'waiting'].includes(row.status)).length })), [rows]);

  const exportCsv = () => {
    const header = ['Protocolo', 'Módulo', 'Assunto', 'Interessado', 'CNPJ', 'Situação', 'Responsável', 'Entrada', 'Decisão'];
    const lines = rows.map(row => [
      `${prefixes[row.kind]}-${String(row.case_number).padStart(6, '0')}`,
      kindLabels[row.kind], row.subject, row.requester_name, row.cnpj, statusLabels[row.status] ?? row.status, row.assigned_to, row.opened_on, row.decided_on ?? '',
    ]);
    const blob = new Blob([`\uFEFF${[header, ...lines].map(line => line.map(csvCell).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-dgsci-${from}-${to}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    void logActivity('download_request', 'operational_report', `${from}:${to}`);
  };

  return <section className="workspace-page operations-page">
    <PageHeader eyebrow="Administração" title="Relatórios" description="Consolide os processos operacionais por período, módulo e situação." icon={BarChart3} actions={<><ActionButton onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Atualizar</ActionButton><ActionButton variant="primary" onClick={exportCsv} disabled={!rows.length}><Download size={16} aria-hidden="true" />Exportar CSV</ActionButton></>} />
    <div className="operations-period"><label>Início<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Fim<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label></div>
    <SummaryStrip items={[{ label: 'Registros no período', value: rows.length }, { label: 'Em andamento', value: totals.active }, { label: 'Finalizados', value: totals.decided }, { label: 'CNPJs distintos', value: totals.cnpjs }]} />
    {error && <p className="operations-error" role="alert">{error}</p>}
    <DataPanel title="Distribuição por módulo">
      {loading ? <LoadState /> : <div className="operations-report-grid">{byKind.map(item => <article key={item.kind}><span>{item.label}</span><strong>{item.total}</strong><p>{item.active} em andamento</p><div aria-hidden="true"><i style={{ width: `${rows.length ? Math.max(4, item.total / rows.length * 100) : 0}%` }} /></div></article>)}</div>}
    </DataPanel>
  </section>;
}
