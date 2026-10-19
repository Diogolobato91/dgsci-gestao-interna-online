import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { usePrivateSnapshot } from './usePrivateSnapshot';

type Staff = { id: string; postoGraduacao: string; nome: string; mf: string; cpf: string; dataNascimento: string; categoria: string };
type Snapshot = { fonte: string; importadoEm: string; registros: Staff[] };
export default function StaffPage() {
  const { data, error } = usePrivateSnapshot<Snapshot>('efetivo');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const records = useMemo(() => (data?.registros || []).filter(person => (category === 'Todos' || person.categoria === category) && normalize(`${person.nome} ${person.mf} ${person.postoGraduacao}`).includes(normalize(query))), [data, query, category]);
  return <section>
    <div className="portal-section-heading"><div><p className="portal-eyebrow">CADASTRO DO EFETIVO</p><h1>Relação de efetivo<span>.</span></h1><p>Militares e voluntários civis do DGSCI.</p></div><Users size={30} /></div>
    {error ? <p className="source-note" role="alert">{error}</p> : !data ? <p role="status">Carregando efetivo…</p> : <>
      <div className="source-note"><p><strong>{data.fonte}.</strong> Importação única de {data.registros.length} pessoas. Esta cópia está no ambiente privado; a migração e edição compartilhada dependem da definição do projeto Supabase.</p></div>
      <div className="portal-search light"><Search size={18} /><label className="sr-only" htmlFor="staff-query">Buscar no efetivo</label><input id="staff-query" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, matrícula ou posto..." /></div>
      <div className="workspace-toolbar records-toolbar"><div role="group" aria-label="Categoria do efetivo">{['Todos', 'Militar', 'Voluntário civil'].map(value => <button key={value} className={category === value ? 'active' : ''} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><span role="status">{records.length} pessoa(s)</span></div>
      <div className="records-table"><table><thead><tr><th>Posto / graduação</th><th>Nome</th><th>Matrícula</th><th>CPF</th><th>Nascimento</th></tr></thead><tbody>{records.map(person => <tr key={person.id}><td>{person.postoGraduacao}</td><td>{person.nome}</td><td>{person.mf || 'Não informado'}</td><td>{person.cpf ? `***.***.***-${person.cpf.replace(/\D/g, '').slice(-2)}` : 'Não informado'}</td><td>{person.dataNascimento || 'Não informado'}</td></tr>)}</tbody></table>{!records.length && <p className="portal-empty">Nenhuma pessoa corresponde à busca.</p>}</div>
    </>}
  </section>;
}
