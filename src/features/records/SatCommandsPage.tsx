import { useState } from 'react';
import { Shield, Pencil, RefreshCw } from 'lucide-react';
import { useDatabaseRows } from './useDatabaseRows';
import { normalizeSearch, canManageSat } from './recordAccess';
import { useAuth } from '@/contexts/AuthContext';
import RecordEditor from './RecordEditor';
import { PageHeader, ActionButton, SearchField, DataPanel, EmptyResults, LoadState, usePagination, TablePagination } from '@/components/workspace/Workspace';
type Command={version:number;id:string;ordem:number;sat:string;commander_rank:string;commander_name:string;deputy_rank:string;deputy_name:string};
export default function SatCommandsPage(){
  const {data,loading,error,reload}=useDatabaseRows<Command>('sat_commands','id,version,ordem,sat,commander_rank,commander_name,deputy_rank,deputy_name','ordem');
  const [query,setQuery]=useState('');const {user}=useAuth();const canEdit=canManageSat(user);const [editing,setEditing]=useState<Command|null>(null);
  const rows=data.filter(row=>normalizeSearch([row.sat,row.commander_name,row.deputy_name,row.commander_rank,row.deputy_rank].join(' ')).includes(normalizeSearch(query)));const pagination=usePagination(rows,query);
  return <section className="workspace-page"><PageHeader eyebrow="Consulta compartilhada" title="CMT e SUB SAT's" description="Relação dos comandantes e subcomandantes das unidades." icon={Shield} actions={<ActionButton disabled={loading} onClick={reload}><RefreshCw size={16}/>Atualizar</ActionButton>}/>
    <DataPanel title="Comando das SATs" count={rows.length} toolbar={<><SearchField id="sat-command-query" value={query} onChange={setQuery} placeholder="Buscar SAT, município ou militar…"/><div className="command-legend"><span><i className="legend-cmt"/>Comandante</span><span><i className="legend-sub"/>Subcomandante</span></div></>} footer={!loading&&!error&&<TablePagination {...pagination}/> }>
      {loading||error?<LoadState error={error} onRetry={reload}/>:<div className="records-table"><table className="command-table"><thead><tr><th>SAT / Unidade</th><th className="command-cmt">Comandante</th><th className="command-sub">Subcomandante / Chefe SAT</th>{canEdit&&<th className="table-actions-heading">Ações</th>}</tr></thead><tbody>{pagination.rows.map(row=><tr key={row.id}><td><span className="table-overline">UNIDADE {String(row.ordem).padStart(2,'0')}</span><strong className="table-primary">{row.sat}</strong></td><td className="command-cmt"><span className="command-role">CMT · {row.commander_rank||'Posto não informado'}</span><strong className="table-primary">{row.commander_name||'Não informado'}</strong></td><td className="command-sub"><span className="command-role">SUB · {row.deputy_rank||'Posto não informado'}</span><strong className="table-primary">{row.deputy_name||'Não informado'}</strong></td>{canEdit&&<td className="table-actions"><ActionButton variant="ghost" onClick={()=>setEditing(row)} aria-label={`Editar comando de ${row.sat}`}><Pencil size={15}/>Editar</ActionButton></td>}</tr>)}</tbody></table>{!rows.length&&<EmptyResults onClear={()=>setQuery('')}/>}</div>}
    </DataPanel>
    {editing&&<RecordEditor table="sat_commands" record={editing} fields={[{key:'sat',label:'SAT / Unidade',required:true},{key:'commander_rank',label:'Posto / graduação do comandante'},{key:'commander_name',label:'Nome do comandante'},{key:'deputy_rank',label:'Posto / graduação do subcomandante'},{key:'deputy_name',label:'Nome do subcomandante / chefe SAT'}]} onClose={()=>setEditing(null)} onSaved={reload}/>}
  </section>;
}
