import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { usePrivateSnapshot } from './usePrivateSnapshot';

type Authorization = { id: string; linhaFonte: number; protocolo: string; unidade?: string; referencia: string; destino: string; qtdEfetivo: number | null; periodo: string; valorDespesa: number | null; valorArrecadado: number | null; status?: string; dataAutorizacao?: string; observacao?: string };
type Balance = { id: string; linhaFonte: number; saldoDF: number | null; informadoEm: string; despesaSAT: number | null; despesaDGSCI: number | null; saldoAtual: number | null };
type Snapshot = { fonte: string; importadoEm: string; sat: Authorization[]; dgsci: Authorization[]; saldos: Balance[] };
const money = (value: number | null) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado';
const text = (value: unknown) => value === null || value === undefined || value === '' ? '—' : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : String(value);
export default function DiariasPage() {
  const { data, error } = usePrivateSnapshot<Snapshot>('diarias');
  const [view, setView] = useState('sat');
  const [query, setQuery] = useState('');
  const records = useMemo(() => ((view === 'dgsci' ? data?.dgsci : data?.sat) || []).filter(row => [row.protocolo, row.unidade, row.destino, row.referencia, row.status, row.observacao].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [data, view, query]);
  return <section>
    <div className="portal-section-heading"><div><p className="portal-eyebrow">SUBDIRETORIA</p><h1>Controle de Autorizações | Diárias<span>.</span></h1><p>Controle importado da planilha de autorizações e despesas.</p></div></div>
    {error ? <p className="source-note" role="alert">{error}</p> : !data ? <p role="status">Carregando controle…</p> : <>
      <div className="source-note"><p><strong>Importação única.</strong> {data.sat.length} registros SAT e {data.dgsci.length} registros DGSCI copiados em {new Date(data.importadoEm).toLocaleDateString('pt-BR')}. Não há sincronização automática com a planilha. A edição compartilhada será habilitada após a migração para o Supabase.</p></div>
      <div className="workspace-toolbar records-toolbar"><div role="group" aria-label="Tipo de controle">{[['sat', 'SAT / UBM'], ['dgsci', 'DGSCI'], ['saldo', 'Saldos da fonte']].map(([id, label]) => <button key={id} aria-pressed={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}</div></div>
      {view === 'saldo' ? <><p className="workspace-status">As linhas de saldo foram preservadas separadamente, como estão na fonte. Não são somadas nem tratadas como períodos equivalentes.</p><div className="records-table"><table><thead><tr>{['Linha de origem', 'Informado em', 'Saldo DF', 'Despesa SAT', 'Despesa DGSCI', 'Saldo atual'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.saldos.map(row => <tr key={row.id}><td>{row.linhaFonte}</td><td>{text(row.informadoEm)}</td><td>{money(row.saldoDF)}</td><td>{money(row.despesaSAT)}</td><td>{money(row.despesaDGSCI)}</td><td>{money(row.saldoAtual)}</td></tr>)}</tbody></table></div></> : <>
        <div className="portal-search light"><Search size={18} /><label className="sr-only" htmlFor="authorization-query">Buscar autorizações e diárias</label><input id="authorization-query" value={query} onChange={e => setQuery(e.target.value)} placeholder="Protocolo, unidade, destino ou situação..." /></div>
        <div className="records-summary"><div><span>Registros na consulta</span><strong>{records.length}</strong></div><div><span>Despesas dos registros filtrados</span><strong>{money(records.reduce((sum, row) => sum + (row.valorDespesa || 0), 0))}</strong></div></div>
        <div className="records-table"><table><thead><tr>{['Protocolo', 'Unidade', 'Referência', 'Destino', 'Efetivo', 'Período', 'Despesa', 'Arrecadado', 'Situação', 'Autorização', 'Observação'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{records.map(row => <tr key={row.id}><td>{text(row.protocolo)}</td><td>{text(row.unidade || (view === 'dgsci' ? 'DGSCI' : null))}</td><td>{text(row.referencia)}</td><td>{text(row.destino)}</td><td>{text(row.qtdEfetivo)}</td><td>{text(row.periodo)}</td><td>{money(row.valorDespesa)}</td><td>{money(row.valorArrecadado)}</td><td>{text(row.status)}</td><td>{text(row.dataAutorizacao)}</td><td>{text(row.observacao)}</td></tr>)}</tbody></table>{!records.length && <p className="portal-empty">Nenhuma autorização corresponde à busca.</p>}</div>
      </>}
    </>}
  </section>;
}
