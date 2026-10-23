import { useMemo, useState } from 'react';
import { Users, AlertTriangle, Plus, Pencil, CalendarDays, RefreshCw } from 'lucide-react';
import { usePrivateSnapshot } from './usePrivateSnapshot';
import { PageHeader, ActionButton, SearchField, DataPanel, SummaryStrip, EmptyResults, LoadState, usePagination, TablePagination } from '@/components/workspace/Workspace';
import { compareStaffMembers, normalizeRank } from '@/lib/rankHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import StaffEditor from './StaffEditor';
import StaffAbsencesManager from './StaffAbsencesManager';
import { useStaffAbsences } from './useStaffAbsences';
import { absenceOn,institutionalToday,shortDate } from './staffAvailability';
import type { Staff } from './staffAvailability';
import { formatContact } from './roster';

type Snapshot = {
  fonte: string;
  importadoEm: string;
  registros: Staff[];
};

export default function StaffPage() {
  const { data, error, reload } = usePrivateSnapshot<Snapshot>('efetivo');
  const {user}=useAuth();
  const canEdit=!!user?.allowedProfiles?.some(p=>['Secretaria','Diretoria','Subdiretoria'].includes(p));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [day,setDay]=useState(institutionalToday),[availabilityFilter,setAvailabilityFilter]=useState('Todos');
  const [revision,setRevision]=useState(0),[editing,setEditing]=useState<Partial<Staff>|null>(null),[absencesFor,setAbsencesFor]=useState<string|null>(null);
  const availability=useStaffAbsences(day,revision);
  const people=useMemo(()=>[...(data?.registros||[])].sort(compareStaffMembers),[data]);
  const refresh=()=>{reload();setRevision(v=>v+1);};

  const normalize = (value: string) =>
    value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  // Aplica ordenação hierárquica institucional antes da paginação, preservando filtros e busca
  const records = useMemo(() => {
    const list = (data?.registros || []).filter(person =>
      (category === 'Todos' || person.categoria === category) &&
      normalize(`${person.nome} ${person.mf} ${person.postoGraduacao}`).includes(normalize(query)) &&
      (availabilityFilter==='Todos'||(!availability.loading&&!availability.error&&!!absenceOn(availability.data,person.id,day)===(availabilityFilter==='Afastados')))
    );
    return [...list].sort(compareStaffMembers);
  }, [data, query, category,availabilityFilter,availability.data,availability.loading,availability.error,day]);

  const pagination = usePagination(records, query + category+availabilityFilter+day);

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Administração"
        title="Relação de efetivo"
        description="Cadastro, contatos e disponibilidade dos militares e voluntários civis da DGSCI."
        icon={Users}
        actions={canEdit&&<><ActionButton onClick={refresh}><RefreshCw size={15}/>Atualizar</ActionButton><ActionButton disabled={!data} onClick={()=>setAbsencesFor('')}><CalendarDays size={15}/>Férias e afastamentos</ActionButton><ActionButton variant="primary" disabled={!data} onClick={()=>setEditing({})}><Plus size={15}/>Novo integrante</ActionButton></>}
      />
      {!data || error ? (
        <LoadState error={error} label="Carregando efetivo…" />
      ) : (
        <>
          <SummaryStrip
            items={[
              { label: 'Efetivo cadastrado', value: data.registros.length },
              { label: 'Voluntários civis', value: data.registros.filter(person => person.categoria === 'Voluntário civil').length },
              { label: 'Disponíveis na data', value: availability.loading||availability.error?'—':data.registros.filter(p=>!absenceOn(availability.data,p.id,day)).length },
              { label: 'Afastados na data', value: availability.loading||availability.error?'—':data.registros.filter(p=>absenceOn(availability.data,p.id,day)).length },
            ]}
          />
          <div className="staff-availability-filter"><label htmlFor="staff-availability-date">Disponibilidade em <input id="staff-availability-date" type="date" min="1900-01-01" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label><label htmlFor="staff-availability-status">Situação <select id="staff-availability-status" value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)}><option>Todos</option><option>Disponíveis</option><option>Afastados</option></select></label><small>Conforme os afastamentos cadastrados. Os dias inicial e final integram o período.</small></div>
          {availability.error&&<div className="staff-warning" role="alert"><p>{availability.error} A disponibilidade não pôde ser confirmada.</p><ActionButton onClick={()=>setRevision(v=>v+1)}>Tentar novamente</ActionButton></div>}
          <DataPanel
            title="Efetivo"
            count={records.length}
            toolbar={
              <>
                <SearchField
                  id="staff-query"
                  value={query}
                  onChange={setQuery}
                  placeholder="Buscar por nome, matrícula ou posto…"
                />
                <div className="workspace-segments" role="group" aria-label="Categoria do efetivo">
                  {['Todos', 'Militar', 'Voluntário civil'].map(value => (
                    <button
                      key={value}
                      aria-pressed={category === value}
                      onClick={() => setCategory(value)}
                    >
                      {value === 'Militar' ? 'Militares' : value === 'Voluntário civil' ? 'Voluntários' : value}
                    </button>
                  ))}
                </div>
              </>
            }
            footer={<TablePagination {...pagination} />}
          >
            <div className="records-table" tabIndex={0} role="region" aria-label="Tabela de registros; deslize para consultar as demais colunas">
              <table>
                <thead>
                  <tr>
                    <th>Nome / posto</th>
                    <th>Categoria</th>
                    <th>Matrícula</th>
                    <th>CPF</th>
                    <th>Nascimento</th>
                    <th>Contato</th>
                    <th>Disponibilidade</th>
                    {canEdit&&<th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagination.rows.map(person => {
                    const rank = normalizeRank(person.postoGraduacao);
                    const absence=absenceOn(availability.data,person.id,day);
                    return (
                      <tr key={person.id}>
                        <td>
                          <strong className="table-primary">
                            {person.nome}
                            {rank.isUnknownRank && (
                              <span
                                className="workspace-badge workspace-badge-review"
                                title="Graduação não identificada na tabela institucional; sinalizada para revisão."
                              >
                                <AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                Revisar graduação
                              </span>
                            )}
                          </strong>
                          <span className="table-secondary">{person.postoGraduacao}</span>
                        </td>
                        <td>
                          <span className="workspace-badge">{person.categoria}</span>
                        </td>
                        <td className="table-mono">{person.mf || '—'}</td>
                        <td className="table-mono">
                          {person.cpf ? `***.***.***-${person.cpf.replace(/\D/g, '').slice(-2)}` : '—'}
                        </td>
                        <td>{person.dataNascimento || '—'}</td>
                        <td className="table-mono">{person.contato?<a href={'tel:'+person.contato}>{formatContact(person.contato)}</a>:'Não informado'}</td>
                        <td>{availability.loading?<span className="table-secondary">Consultando…</span>:availability.error?<span className="table-secondary">Não consultada</span>:absence?<><span className="workspace-badge workspace-badge-review">{absence.kind}</span><span className="table-secondary">Até {shortDate(absence.ends_on)}</span></>:<span className="workspace-badge staff-available">Disponível</span>}</td>
                        {canEdit&&<td><div className="record-actions"><ActionButton variant="ghost" aria-label={'Editar cadastro de '+person.nome} onClick={()=>setEditing(person)}><Pencil size={14}/>Editar</ActionButton><ActionButton variant="ghost" aria-label={'Afastamentos de '+person.nome} onClick={()=>setAbsencesFor(person.id)}><CalendarDays size={14}/>Afastamentos</ActionButton></div></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!records.length && (
                <EmptyResults
                  onClear={() => {
                    setQuery('');
                    setCategory('Todos');
                  }}
                />
              )}
            </div>
          </DataPanel>
          <p className="workspace-footnote">
            Fonte: {data.fonte}.{data.importadoEm&&` Cadastro importado em ${new Date(data.importadoEm).toLocaleDateString('pt-BR')}.`}
            A relação é organizada pela sequência institucional de postos e graduações e em ordem alfabética de nome (não representa antiguidade militar). CPF exibido parcialmente.
          </p>
        </>
      )}
      {editing&&<StaffEditor person={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);refresh();}}/>}
      {absencesFor!==null&&<StaffAbsencesManager people={people} initialPerson={absencesFor} onClose={()=>setAbsencesFor(null)} onSaved={refresh}/>}
    </section>
  );
}
