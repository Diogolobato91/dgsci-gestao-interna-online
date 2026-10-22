import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ShieldCheck, CalendarDays, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ActionButton } from '@/components/workspace/Workspace';
import { canManageSupport } from './recordAccess';
import { formatContact } from './roster';

type DailyTeam = { date: string; registered: boolean; needs_review: boolean; team: { role: string; nome: string; posto: string; contato: string | null }[] };
export default function DailyRoster() {
  const { user } = useAuth();
  const [data,setData]=useState<DailyTeam|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    let active=true;
    setLoading(true);setError(false);setData(null);
    (async()=>{
      try {
        if(!supabase)throw new Error();
        const result=await supabase.rpc('get_today_duty');
        if(result.error||!result.data)throw new Error();
        if(active)setData(result.data as DailyTeam);
      } catch {if(active)setError(true);}
      finally {if(active)setLoading(false);}
    })();
    const timer=window.setInterval(refresh,60000);
    const onFocus=()=>refresh();window.addEventListener('focus',onFocus);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus);};
  },[user,revision,refresh]);
  return <section className="dashboard-duty" aria-labelledby="daily-duty-title">
    <div className="data-panel-heading"><div><span className="portal-eyebrow">SERVIÇO OPERACIONAL</span><h2 id="daily-duty-title"><ShieldCheck size={22}/> Plantão de hoje</h2>{data&&<p><CalendarDays size={15}/> {new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(data.date+'T12:00:00Z'))}</p>}</div><div className="dashboard-duty-actions"><ActionButton onClick={refresh} disabled={loading} aria-label="Atualizar plantão"><RefreshCw size={16}/></ActionButton>{canManageSupport(user)&&<Link to="/escala-mensal">Consultar escala <span aria-hidden="true">→</span></Link>}</div></div>
    {loading?<p role="status">Carregando plantão…</p>:error?<p role="alert">Não foi possível carregar o plantão. Tente atualizar.</p>:!data?.registered?<p className="dashboard-empty">Plantão de hoje ainda não cadastrado.</p>:<>
      {data.needs_review&&<p className="workspace-feedback" role="status">A equipe possui uma indisponibilidade registrada. A Administração deve revisar a escala.</p>}
      <div className="dashboard-duty-grid">{data.team.map((person,index)=><article className="dashboard-duty-person" key={person.role}><span className="dashboard-duty-number">0{index+1}</span><span className="portal-eyebrow">{person.role}</span><h3>{person.posto} {person.nome}</h3>{person.contato?<a href={'tel:+55'+person.contato.replace(/\D/g,'')}><Phone size={16}/>{formatContact(person.contato)}</a>:<span className="dashboard-contact-empty">Contato não informado</span>}</article>)}</div>
    </>}
  </section>;
}
