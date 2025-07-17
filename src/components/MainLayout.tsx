import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import { useLocation } from 'react-router-dom';

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/dashboard': 'Painel Principal',
    '/ajuda-vistoriador': 'Ajuda Rápida ao Vistoriador',
    '/modelos-padronizados': 'Modelos Padronizados',
    '/modelos-auto-infracao': 'Modelos de Auto de Infração',
    '/minhas-vistorias': 'Minhas Vistorias',
    '/projetos': 'Projetos',
    '/pareceres': 'Pareceres',
    '/gestao-autos': 'Gestão de Autos',
    '/escala-mensal': 'Escala Mensal',
    '/relatorios': 'Relatórios',
    '/comissao-tecnica': 'Comissão Técnica',
    '/autorizacoes': 'Autorizações',
    '/dashboard-geral': 'Dashboard Geral'
  };
  
  return routes[pathname] || 'DGSCI';
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;