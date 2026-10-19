import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabaseRows } from './useDatabaseRows';
import { canManageSat, normalizeSearch } from './recordAccess';
import RecordEditor from './RecordEditor';
type Region={id:string;gbm:string;sat:string;municipios:string;version:number;is_demo:boolean};
export default function SatRegionsPage(){
 const {user}=useAuth();const canEdit=canManageSat(user);const {data,loading,error,reload}=useDatabaseRows<Region>('sat_regions','id,gbm,sat,municipios,version,is_demo','gbm');
 const [query,setQuery]=useState('');const [editing,setEditing]=useState<Record<string,unknown>|null>(null);
 const rows=data.filter(row=>normalizeSearch([row.gbm,row.sat,row.municipios].join(' ')).includes(normalizeSearch(query)));
 return <section><div className="portal-section-heading"><div><p className="portal-eyebrow">CONSULTA COMPARTILHADA</p><h1>SAT'S Regionais<span>.</span></h1><p>Unidades e municípios de abrangência.</p></div>{canEdit&&<button className="portal-primary" onClick={()=>setEditing({is_demo:false})}>Adicionar SAT</button>}</div>
 <div className="portal-search light"><label className="sr-only" htmlFor="region-search">Buscar unidade ou município</label><input id="region-search" placeholder="Buscar unidade, SAT ou município…" value={query} onChange={event=>setQuery(event.target.value)}/></div>
 {loading?<p role="status">Carregando SATs…</p>:error?<div role="alert"><p>{error}</p><button onClick={reload}>Tentar novamente</button></div>:<div className="records-table"><table><thead><tr><th>Unidade</th><th>SAT</th><th>Municípios</th><th>Situação</th>{canEdit&&<th>Ações</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.gbm}</td><td>{row.sat}</td><td>{row.municipios||'—'}</td><td>{row.is_demo?'Demonstração — validar abrangência':'Cadastrado pelo setor'}</td>{canEdit&&<td><button className="record-edit" onClick={()=>setEditing(row)}>Editar</button></td>}</tr>)}</tbody></table>{!rows.length&&<p className="portal-empty">Nenhuma SAT encontrada.</p>}</div>}
 {editing&&<RecordEditor table="sat_regions" record={editing} fields={[{key:'gbm',label:'Unidade / GBM',required:true},{key:'sat',label:'SAT',required:true},{key:'municipios',label:'Municípios de abrangência',multiline:true}]} onClose={()=>setEditing(null)} onSaved={reload}/>}
 </section>;
}
