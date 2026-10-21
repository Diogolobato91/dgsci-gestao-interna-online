import { useState } from 'react';
import { Plus, Pencil, MapPin, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabaseRows } from './useDatabaseRows';
import { canManageSat, normalizeSearch } from './recordAccess';
import { compareSatRegions } from './satRegionOrder';
import RecordEditor from './RecordEditor';
import { PageHeader, ActionButton, SearchField, DataPanel, EmptyResults, LoadState } from '@/components/workspace/Workspace';
type Region={id:string;gbm:string;sat:string;municipios:string;version:number;is_demo:boolean};
export default function SatRegionsPage(){
  const {user}=useAuth();const canEdit=canManageSat(user);const {data,loading,error,reload}=useDatabaseRows<Region>('sat_regions','id,gbm,sat,municipios,version,is_demo','gbm');
  const [query,setQuery]=useState('');const [exportBusy,setExportBusy]=useState(false);const [exportError,setExportError]=useState('');const [editing,setEditing]=useState<Record<string,unknown>|null>(null);
  const rows=data.filter(row=>normalizeSearch([row.gbm,row.sat,row.municipios].join(' ')).includes(normalizeSearch(query))).sort(compareSatRegions);
  return <section className="workspace-page"><PageHeader eyebrow="Consulta compartilhada" title="SAT's Regionais" description="Unidades e municípios de abrangência das Seções de Atividades Técnicas." icon={MapPin} actions={<><ActionButton disabled={loading || !!error || !rows.length || exportBusy} onClick={async()=>{setExportBusy(true);setExportError('');try{const {buildSatRegionsPdf}=await import('./satRegionsPdf');buildSatRegionsPdf(rows).save("DGSCI-SATs-Regionais.pdf");}catch{setExportError('Não foi possível gerar o PDF. Tente novamente.');}finally{setExportBusy(false);}}}><Download size={16}/>{exportBusy?'Gerando PDF…':'Baixar PDF'}</ActionButton><ActionButton onClick={reload} disabled={loading}><RefreshCw size={16}/>Atualizar</ActionButton>{canEdit&&<ActionButton variant="primary" onClick={()=>setEditing({is_demo:false})}><Plus size={17}/>Adicionar SAT</ActionButton>}</>}/>
    {exportError&&<p className="form-error" role="alert">{exportError}</p>}<DataPanel title="Unidades regionais" count={rows.length} toolbar={<SearchField id="region-search" value={query} onChange={setQuery} placeholder="Buscar unidade, SAT ou município…"/>}>
      {loading||error?<LoadState error={error} onRetry={reload}/>:<div className="records-table"><table><thead><tr><th>Unidade / SAT</th><th>Municípios de abrangência</th>{canEdit&&<th className="table-actions-heading">Ações</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong className="table-primary">{row.sat}</strong><span className="table-secondary">{row.gbm}</span></td><td className="table-long">{row.municipios||'—'}</td>{canEdit&&<td className="table-actions"><ActionButton variant="ghost" onClick={()=>setEditing(row)} aria-label={`Editar SAT ${row.sat}`}><Pencil size={15}/>Editar</ActionButton></td>}</tr>)}</tbody></table>{!rows.length&&<EmptyResults onClear={()=>setQuery('')}/>}</div>}
    </DataPanel>
    {editing&&<RecordEditor table="sat_regions" record={editing} fields={[{key:'gbm',label:'Unidade / GBM',required:true},{key:'sat',label:'SAT',required:true},{key:'municipios',label:'Municípios de abrangência',multiline:true}]} onClose={()=>setEditing(null)} onSaved={reload}/>}
  </section>;
}
