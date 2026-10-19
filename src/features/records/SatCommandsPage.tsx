import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDatabaseRows } from './useDatabaseRows';
import { normalizeSearch, canManageSat } from './recordAccess';
import { useAuth } from '@/contexts/AuthContext';
import RecordEditor from './RecordEditor';
type Command = { version: number; id: string; ordem: number; sat: string; commander_rank: string; commander_name: string; deputy_rank: string; deputy_name: string };
export default function SatCommandsPage() {
  const { data, loading, error, reload } = useDatabaseRows<Command>('sat_commands', 'id,version,ordem,sat,commander_rank,commander_name,deputy_rank,deputy_name', 'ordem');
  const [query, setQuery] = useState('');
  const { user } = useAuth(); const canEdit = canManageSat(user);
  const [editing,setEditing] = useState<Command | null>(null);
  const rows = data.filter(row => normalizeSearch([row.sat, row.commander_name, row.deputy_name, row.commander_rank, row.deputy_rank].join(' ')).includes(normalizeSearch(query)));
  return <section><div className="portal-section-heading"><div><p className="portal-eyebrow">CONSULTA COMPARTILHADA</p><h1>CMT e SUB SAT'S<span>.</span></h1><p>Comandantes e subcomandantes das Seções de Atividades Técnicas.</p></div></div>
    <div className="portal-search light"><Search size={18} /><label className="sr-only" htmlFor="sat-command-query">Buscar SAT ou militar</label><input id="sat-command-query" placeholder="Buscar por SAT, município, posto ou nome…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {loading ? <p role="status">Carregando relação…</p> : error ? <div role="alert"><p>{error}</p><button className="portal-primary" onClick={reload}>Tentar novamente</button></div> : <><p className="workspace-status">{rows.length} SATs na consulta</p><div className="records-table"><table className="command-table"><thead><tr><th rowSpan={2}>Ord.</th><th rowSpan={2}>SAT</th><th colSpan={2} className="command-cmt">COMANDANTE</th><th colSpan={2} className="command-sub">SUBCOMANDANTE / CHEFE SAT</th>{canEdit&&<th rowSpan={2}>Ações</th>}</tr><tr><th className="command-cmt">Posto / Grad.</th><th className="command-cmt">Nome do comandante</th><th className="command-sub">Posto / Grad.</th><th className="command-sub">Nome do subcomandante</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.ordem}</td><td>{row.sat}</td><td className="command-cmt">{row.commander_rank || '—'}</td><td className="command-cmt">{row.commander_name || 'Não informado'}</td><td className="command-sub">{row.deputy_rank || '—'}</td><td className="command-sub">{row.deputy_name || 'Não informado'}</td>{canEdit&&<td><button className="record-edit" onClick={()=>setEditing(row)}>Editar</button></td>}</tr>)}</tbody></table>{!rows.length && <p className="portal-empty">Nenhuma SAT corresponde à busca.</p>}</div></>}
    {editing&&<RecordEditor table="sat_commands" record={editing} fields={[{key:'sat',label:'SAT',required:true},{key:'commander_rank',label:'Posto / graduação do comandante'},{key:'commander_name',label:'Nome do comandante'},{key:'deputy_rank',label:'Posto / graduação do subcomandante'},{key:'deputy_name',label:'Nome do subcomandante / chefe SAT'}]} onClose={()=>setEditing(null)} onSaved={reload}/>}
  </section>;
}
