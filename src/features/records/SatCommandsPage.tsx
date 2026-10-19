import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDatabaseRows } from './useDatabaseRows';
import { normalizeSearch } from './recordAccess';
type Command = { id: string; ordem: number; sat: string; commander_rank: string; commander_name: string; deputy_rank: string; deputy_name: string };
export default function SatCommandsPage() {
  const { data, loading, error, reload } = useDatabaseRows<Command>('sat_commands', 'id,ordem,sat,commander_rank,commander_name,deputy_rank,deputy_name', 'ordem');
  const [query, setQuery] = useState('');
  const rows = data.filter(row => normalizeSearch([row.sat, row.commander_name, row.deputy_name, row.commander_rank, row.deputy_rank].join(' ')).includes(normalizeSearch(query)));
  return <section><div className="portal-section-heading"><div><p className="portal-eyebrow">CONSULTA COMPARTILHADA</p><h1>CMT e SUB SAT'S<span>.</span></h1><p>Comandantes e subcomandantes das Seções de Atividades Técnicas.</p></div></div>
    <div className="portal-search light"><Search size={18} /><label className="sr-only" htmlFor="sat-command-query">Buscar SAT ou militar</label><input id="sat-command-query" placeholder="Buscar por SAT, município, posto ou nome…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {loading ? <p role="status">Carregando relação…</p> : error ? <div role="alert"><p>{error}</p><button className="portal-primary" onClick={reload}>Tentar novamente</button></div> : <><p className="workspace-status">{rows.length} SATs na consulta</p><div className="records-table"><table><thead><tr>{['Ord.', 'SAT', 'Posto / Grad. CMT', 'Comandante', 'Posto / Grad. SUB', 'Chefe SAT / Subcomandante'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.ordem}</td><td>{row.sat}</td><td>{row.commander_rank || '—'}</td><td>{row.commander_name || 'Não informado'}</td><td>{row.deputy_rank || '—'}</td><td>{row.deputy_name || 'Não informado'}</td></tr>)}</tbody></table>{!rows.length && <p className="portal-empty">Nenhuma SAT corresponde à busca.</p>}</div></>}
  </section>;
}
