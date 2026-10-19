import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { usePrivateSnapshot } from './usePrivateSnapshot';
import { PageHeader, SearchField, DataPanel, SummaryStrip, EmptyResults, LoadState, usePagination, TablePagination } from '@/components/workspace/Workspace';
type Staff = { id:string;postoGraduacao:string;nome:string;mf:string;cpf:string;dataNascimento:string;categoria:string };
type Snapshot={fonte:string;importadoEm:string;registros:Staff[]};
export default function StaffPage(){
  const {data,error}=usePrivateSnapshot<Snapshot>('efetivo');const [query,setQuery]=useState('');const [category,setCategory]=useState('Todos');
  const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const records=useMemo(()=>(data?.registros||[]).filter(person=>(category==='Todos'||person.categoria===category)&&normalize(`${person.nome} ${person.mf} ${person.postoGraduacao}`).includes(normalize(query))),[data,query,category]);
  const pagination=usePagination(records,query+category);
  return <section className="workspace-page"><PageHeader eyebrow="Pessoal" title="Relação de efetivo" description="Consulta dos militares e voluntários civis da DGSCI." icon={Users}/>
    {!data||error?<LoadState error={error} label="Carregando efetivo…"/>:<>
      <SummaryStrip items={[{label:'Efetivo cadastrado',value:data.registros.length},{label:'Militares',value:data.registros.filter(person=>person.categoria==='Militar').length},{label:'Voluntários civis',value:data.registros.filter(person=>person.categoria==='Voluntário civil').length}]}/>
      <DataPanel title="Efetivo" count={records.length} toolbar={<><SearchField id="staff-query" value={query} onChange={setQuery} placeholder="Buscar por nome, matrícula ou posto…"/><div className="workspace-segments" role="group" aria-label="Categoria do efetivo">{['Todos','Militar','Voluntário civil'].map(value=><button key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value==='Militar'?'Militares':value==='Voluntário civil'?'Voluntários':value}</button>)}</div></>} footer={<TablePagination {...pagination}/> }>
        <div className="records-table"><table><thead><tr><th>Nome / posto</th><th>Categoria</th><th>Matrícula</th><th>CPF</th><th>Nascimento</th></tr></thead><tbody>{pagination.rows.map(person=><tr key={person.id}><td><strong className="table-primary">{person.nome}</strong><span className="table-secondary">{person.postoGraduacao}</span></td><td><span className="workspace-badge">{person.categoria}</span></td><td className="table-mono">{person.mf||'—'}</td><td className="table-mono">{person.cpf?`***.***.***-${person.cpf.replace(/\D/g,'').slice(-2)}`:'—'}</td><td>{person.dataNascimento||'—'}</td></tr>)}</tbody></table>{!records.length&&<EmptyResults onClear={()=>{setQuery('');setCategory('Todos');}}/>}</div>
      </DataPanel><p className="workspace-footnote">Fonte: {data.fonte}. Cadastro importado em {new Date(data.importadoEm).toLocaleDateString('pt-BR')}. CPF exibido parcialmente.</p>
    </>}
  </section>;
}
