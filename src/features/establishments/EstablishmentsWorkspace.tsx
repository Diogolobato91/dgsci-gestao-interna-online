import {lazy,Suspense,useDeferredValue,useEffect,useMemo,useState} from 'react';
import {Building2,MapPinned,BarChart3,RefreshCw,Search,ChevronLeft,ChevronRight,MapPinOff,Pencil} from 'lucide-react';
import {PageHeader,ActionButton} from '@/components/workspace/Workspace';
import {useAuth} from '@/contexts/AuthContext';
import {canManageSupport} from '@/features/records/recordAccess';
import EstablishmentEditor from './EstablishmentEditor';
import {useEstablishments} from './useEstablishments';
import type {Establishment} from './model';
import {useLocation} from 'react-router-dom';

const views=[{id:'overview',title:'Indicadores',Icon:BarChart3},{id:'map',title:'Mapa territorial',Icon:MapPinned},{id:'companies',title:'Estabelecimentos',Icon:Building2}] as const;
const TerritorialMap=lazy(()=>import('./TerritorialMap'));
const statusLabels:Record<string,string>={REGULAR:'Regulares',VENCIDO:'Vencidos',PARADO:'Pendentes / parados',SEM_SISGAT:'Sem SISGAT',DESATIVADO:'Desativados'};
const value=(item:Establishment,key:string,fallback='Não informado')=>String(item[key]??'').trim()||fallback;

function Overview({companies}:{companies:Establishment[]}){
 const statuses=useMemo(()=>companies.reduce<Record<string,number>>((all,item)=>{const key=value(item,'normalizedStatus','NÃO INFORMADO');all[key]=(all[key]??0)+1;return all;},{}),[companies]);
 const neighborhoods=useMemo(()=>Object.entries(companies.reduce<Record<string,number>>((all,item)=>{const key=value(item,'bairro','Não informado');all[key]=(all[key]??0)+1;return all;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8),[companies]);
 const sectors=useMemo(()=>Object.entries(companies.reduce<Record<string,number>>((all,item)=>{const key=value(item,'setor','Não informado');all[key]=(all[key]??0)+1;return all;},{})).sort((a,b)=>b[1]-a[1]),[companies]);
 return <div className="establishment-overview">
  <div className="workspace-summary establishment-summary"><div><span>Total cadastrado</span><strong>{companies.length.toLocaleString('pt-BR')}</strong><small>Registros da base institucional</small></div><div><span>Regulares</span><strong>{(statuses.REGULAR??0).toLocaleString('pt-BR')}</strong><small>{companies.length?Math.round((statuses.REGULAR??0)/companies.length*100):0}% da base</small></div><div><span>Exigem acompanhamento</span><strong>{((statuses.VENCIDO??0)+(statuses.PARADO??0)+(statuses.SEM_SISGAT??0)).toLocaleString('pt-BR')}</strong><small>Vencidos, pendentes ou sem SISGAT</small></div></div>
  <div className="establishment-overview-grid">
   <section className="data-panel"><div className="data-panel-heading"><BarChart3 size={17}/><h2>Situação dos cadastros</h2></div><div className="establishment-bars">{Object.entries(statusLabels).map(([key,label])=>{const count=statuses[key]??0;const pct=companies.length?count/companies.length*100:0;return <div key={key}><div><span>{label}</span><strong>{count.toLocaleString('pt-BR')}</strong></div><progress max="100" value={pct} aria-label={`${label}: ${count}`}/></div>;})}</div></section>
   <section className="data-panel"><div className="data-panel-heading"><MapPinned size={17}/><h2>Distribuição por setor</h2></div><div className="establishment-sector-list">{sectors.map(([name,count])=><div key={name}><span>{name}</span><strong>{count.toLocaleString('pt-BR')}</strong></div>)}</div></section>
   <section className="data-panel establishment-neighborhoods"><div className="data-panel-heading"><Building2 size={17}/><h2>Bairros com mais cadastros</h2></div><ol>{neighborhoods.map(([name,count])=><li key={name}><span>{name}</span><strong>{count.toLocaleString('pt-BR')}</strong></li>)}</ol></section>
  </div>
 </div>;
}

function Companies({companies,canEdit,onEdit}:{companies:Establishment[];canEdit:boolean;onEdit:(item:Establishment)=>void}){
 const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[page,setPage]=useState(0);const deferred=useDeferredValue(query);const size=25;
 const filtered=useMemo(()=>{const q=deferred.toLocaleLowerCase('pt-BR').trim();return companies.filter(item=>(status==='all'||item.normalizedStatus===status)&&(!q||`${item.razao} ${item.cnpj} ${item.endereco} ${item.bairro} ${item.divisao}`.toLocaleLowerCase('pt-BR').includes(q)));},[companies,deferred,status]);
 useEffect(()=>setPage(0),[deferred,status]);const pages=Math.max(1,Math.ceil(filtered.length/size)),slice=filtered.slice(page*size,page*size+size);
 return <section className="data-panel establishments-table-panel">
  <div className="data-panel-toolbar"><label className="workspace-search"><Search size={16}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar razão social, CNPJ, endereço ou divisão"/></label><div className="workspace-filter"><label htmlFor="est-status">Situação</label><select id="est-status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></div>
  {slice.length?<div className="records-table"><table><thead><tr><th>Estabelecimento</th><th>Localização</th><th>Divisão</th><th>Situação</th>{canEdit&&<th className="table-actions-heading">Ações</th>}</tr></thead><tbody>{slice.map(item=><tr key={item.id}><td><span className="table-primary">{value(item,'razao')}</span><span className="table-secondary">{value(item,'cnpj')}</span></td><td className="table-long"><span className="table-primary">{value(item,'endereco')}</span><span className="table-secondary">{value(item,'bairro')}</span></td><td><span className="table-primary">{value(item,'divisao')}</span><span className="table-secondary">{value(item,'setor')}</span></td><td><span className={`establishment-status status-${value(item,'normalizedStatus','unknown').toLowerCase()}`}>{statusLabels[value(item,'normalizedStatus')]??value(item,'situacao')}</span></td>{canEdit&&<td className="table-actions"><ActionButton onClick={()=>onEdit(item)}><Pencil size={14}/>Editar</ActionButton></td>}</tr>)}</tbody></table></div>:<div className="workspace-empty"><span><MapPinOff/></span><strong>Nenhum estabelecimento encontrado</strong><p>Revise a pesquisa ou o filtro de situação.</p></div>}
  <div className="workspace-pagination"><span>{filtered.length.toLocaleString('pt-BR')} resultado(s)</span><div><ActionButton disabled={page===0} onClick={()=>setPage(p=>p-1)} aria-label="Página anterior"><ChevronLeft size={16}/></ActionButton><strong>{page+1} de {pages}</strong><ActionButton disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)} aria-label="Próxima página"><ChevronRight size={16}/></ActionButton></div></div>
 </section>;
}

export default function EstablishmentsWorkspace(){
 const location=useLocation();const {user}=useAuth();const canEdit=canManageSupport(user);const {snapshot,loading,error,reload}=useEstablishments();const [editor,setEditor]=useState<{item:Establishment|null}|null>(null);const [view,setView]=useState<(typeof views)[number]['id']>(location.pathname==='/mapa'?'map':'overview');
 useEffect(()=>setView(location.pathname==='/mapa'?'map':'overview'),[location.pathname]);const companies=snapshot?.companies??[];
 return <section className="establishments-workspace workspace-page">
  <PageHeader eyebrow="Base institucional" title="Estabelecimentos" description="Indicadores, localização territorial e consulta aos cadastros da DGSCI." icon={Building2} actions={<><ActionButton disabled={loading} onClick={reload}><RefreshCw size={16}/>{loading?'Consultando…':'Atualizar cadastros'}</ActionButton>{canEdit&&<ActionButton variant="primary" onClick={()=>setEditor({item:null})}>Cadastrar estabelecimento</ActionButton>}</>}/>
  <div className="establishments-tabs"><div className="workspace-segments" role="group" aria-label="Visualização dos estabelecimentos">{views.map(({id,title,Icon})=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}><Icon size={16}/>{title}</button>)}</div><p role="status" aria-live="polite">{loading?'Consultando banco de estabelecimentos…':error||(snapshot?.timestamp?`Dados atualizados em ${new Date(snapshot.timestamp).toLocaleString('pt-BR',{timeZone:'America/Belem'})}`:'Base institucional')}</p></div>
  {loading&&!snapshot
   ?<div className="data-panel workspace-load"><RefreshCw className="workspace-spinner"/><span>Carregando cadastros…</span></div>
   :view==='overview'?<Overview companies={companies}/>:view==='map'?<Suspense fallback={<div className="data-panel workspace-load"><RefreshCw className="workspace-spinner"/><span>Preparando o mapa territorial…</span></div>}><TerritorialMap companies={companies} canEdit={canEdit} onEdit={item=>setEditor({item})}/></Suspense>:<Companies companies={companies} canEdit={canEdit} onEdit={item=>setEditor({item})}/>
  }
  {error&&<p className="form-error" role="alert">{error}{snapshot?' A última consulta foi mantida na tela.':''}</p>}
  <p className="workspace-footnote">Os cadastros são consultados diretamente no banco da DGSCI. A base cartográfica está hospedada no próprio sistema e não utiliza a conta ou a API do Mapbox.</p>
  {snapshot?.import&&<p className="workspace-footnote">Base inicial: {snapshot.import.record_count.toLocaleString('pt-BR')} registros · Importada em {new Date(snapshot.import.imported_at).toLocaleString('pt-BR',{timeZone:'America/Belem'})}.</p>}
  {editor&&<EstablishmentEditor item={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);reload();}}/>}
 </section>;
}
