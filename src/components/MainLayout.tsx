import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import ResponsivePageHeader from './ResponsivePageHeader';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/dashboard': 'Painel Principal',
    '/sat-regionais': 'SAT\'s Regionais',
    '/ajuda-vistoriador': 'Ajuda Rápida ao Vistoriador',
    '/modelos-padronizados': 'Modelos Padronizados',
    '/modelos-auto-infracao': 'Modelos de Auto de Infração',
    
    '/projetos': 'Projetos',
    '/pareceres': 'Pareceres',
    '/gestao-autos': 'Gestão de Autos',
    '/escala-mensal': 'Escala Mensal',
    '/relatorios': 'Relatórios',
    '/comissao-tecnica': 'Comissão Técnica',
    '/autorizacoes': 'Autorizações',
    '/dashboard-geral': 'Dashboard Geral',
    '/relacao-efetivo': 'Relação de Efetivo'
  };
  
  return routes[pathname] || 'DGSCI';
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ResponsivePageHeader title={pageTitle} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;