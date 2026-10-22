import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LockKeyhole, ChevronRight, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ActivityTracker from '@/features/audit/ActivityTracker';
import NoticeNotifications from '@/features/support/NoticeNotifications';
import { navigationConfig } from '@/config/navigation';
import { isFullAdministrator } from '@/features/records/recordAccess';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const fullAccess = isFullAdministrator(user);
  const baseItems = fullAccess ? [...new Map(Object.values(navigationConfig).flat().map(item => [item.path, item])).values()] : navigationConfig[user.profile];
  const items = fullAccess ? [...baseItems, {id:'user-management',title:'Gestão de Usuários',path:'/gestao-usuarios',icon:UsersRound,section:'Administração do sistema'},{id:'audit-system',title:'Auditoria do sistema',path:'/auditoria',icon:LockKeyhole,section:'Administração do sistema'}] : baseItems;
  const groups = [...new Set(items.map(item => item.section || 'Consulta compartilhada'))];
  const title = pathname === '/auditoria' ? 'Auditoria do sistema' : pathname === '/minha-conta' ? 'Minha conta' : pathname === '/favoritos' ? 'Meus favoritos' : items.find(item => item.path === pathname)?.title || 'Portal DGSCI';
  const integrated = ['/auditoria','/minha-conta','/escala-mensal','/gestao-usuarios','/dashboard', '/biblioteca', '/favoritos', '/comunicados', '/modelos-padronizados', '/ajuda-vistoriador', '/modelos-auto-infracao', '/estabelecimentos', '/mapa', '/relacao-efetivo', '/controle-portarias', '/sat-regionais', '/cmt-sub-sats', '/dashboard-geral', '/autorizacoes', '/controle-autorizacoes-diarias'].includes(pathname);
  useEffect(() => { setOpen(false); document.title = `${title} · DGSCI`; window.scrollTo(0, 0); }, [pathname, title]);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if(event.key==='Escape'){setOpen(false);menuButton.current?.focus();}
      if(event.key==='Tab'){
        const elements=Array.from(document.querySelectorAll<HTMLElement>('#portal-sidebar a, #portal-sidebar button:not([disabled])'));
        const first=elements[0],last=elements[elements.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [open]);
  return <div className="dgsci-shell">
    <ActivityTracker/><a className="portal-skip" href="#workspace-main">Pular para o conteúdo</a>
    {open && <button className="shell-backdrop" aria-label="Fechar navegação" onClick={() => { setOpen(false); menuButton.current?.focus(); }} />}
    <aside id="portal-sidebar" className={`shell-sidebar ${open ? 'is-open' : ''}`} aria-label="Navegação principal">
      <div className="shell-brand"><img src="/portal/assets/dgsci-logo.png" alt="" width="42" height="42" /><div><strong>DGSCI<span>.</span></strong><small>GESTÃO E APOIO OPERACIONAL</small></div><button ref={closeButton} className="shell-close" onClick={() => { setOpen(false); menuButton.current?.focus(); }} aria-label="Fechar menu"><X size={19} /></button></div>
      <div className="shell-profile"><span>{fullAccess ? 'PERFIL DE ACESSO' : 'SETOR'}</span><strong>{fullAccess ? 'Superadministrador' : user.profile}</strong></div>
      <nav>{groups.map(group => <div className="shell-nav-group" key={group}><p>{group}</p>{items.filter(item => (item.section || 'Consulta compartilhada') === group).map(({ id, path, title, icon: Icon }) => <NavLink key={id} to={path} className={({ isActive }) => `shell-nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{title}</span><ChevronRight size={13} /></NavLink>)}</div>)}
        <div className="shell-nav-group"><p>MINHA CONSULTA</p><NavLink to="/minha-conta" className={({isActive})=>`shell-nav-item ${isActive?'active':''}`}><UserRound size={18}/><span>Minha conta</span><ChevronRight size={13}/></NavLink><NavLink to="/favoritos" className={({ isActive }) => `shell-nav-item ${isActive ? 'active' : ''}`}><span>Meus favoritos</span><ChevronRight size={13} /></NavLink></div>
      </nav>
      <div className="shell-bottom"><LockKeyhole size={15} /><p>DGSCI / CBMPA<br /><span>Portal de apoio à rotina operacional</span></p></div>
    </aside>
    <div className="shell-content">
      <header className="shell-topbar"><div><button ref={menuButton} className="shell-menu" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} aria-controls="portal-sidebar"><Menu size={21} /></button><span>Portal DGSCI</span><i>/</i><strong>{title}</strong></div><div><NoticeNotifications/><NavLink to="/minha-conta" className="shell-account" title="Minha conta"><UserRound size={16}/><span>{user.matricula}</span></NavLink><span className="shell-stage"><span />Em desenvolvimento</span><button onClick={logout} className="shell-exit"><LogOut size={15} /><span>Sair</span></button></div></header>
      <main id="workspace-main" className="shell-main" tabIndex={-1}>{!integrated && <div className="portal-note"><p><strong>Rotina demonstrativa do projeto anterior.</strong> Dados e alterações desta tela são exemplos locais. A persistência compartilhada será implementada na próxima etapa.</p></div>}<Suspense fallback={<p className="workspace-status" role="status">Carregando módulo…</p>}><Outlet /></Suspense></main>
    </div>
  </div>;
}
