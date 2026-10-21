import { useLocation, Link } from 'react-router-dom';
import { ClipboardList, ArrowRight } from 'lucide-react';
export default function PendingModule() {
  const { pathname } = useLocation();
  const names = { '/projetos': 'Projetos', '/gestao-autos': 'Gestão de autos', '/relatorios': 'Relatórios' };
  return <section className="portal-empty"><ClipboardList size={38} /><h1>{names[pathname] || 'Módulo setorial'}</h1><p>Esta rotina estava representada pelo painel inicial no projeto anterior. Seu fluxo será definido com o setor responsável antes da implementação.</p><Link to="/dashboard">Consultar a biblioteca de apoio <ArrowRight size={16} /></Link></section>;
}
