import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import type { UserProfile } from '@/types/auth';
import { isFullAdministrator } from '@/features/records/recordAccess';
import LoginForm from "@/components/LoginForm";
import MainLayout from "@/components/MainLayout";
import AppErrorBoundary from '@/components/AppErrorBoundary';
const AccreditationPage=lazy(()=>import('@/features/accreditation/AccreditationPage'));
const AuditPage=lazy(()=>import('@/features/audit/AuditHistory'));
const MyAccount = lazy(() => import('@/features/users/MyAccountPage'));
const UserManagement = lazy(() => import('@/features/users/UserManagementPage'));
const SatCommands = lazy(() => import('@/features/records/SatCommandsPage'));
const SupportDesk = lazy(() => import('@/features/support-desk/SupportDesk'));
const SupportAdmin = lazy(() => import('@/features/support-desk/SupportAdmin'));
const PublicationsAdmin = lazy(() => import('@/features/publications/PublicationsAdmin'));
const OperationalCasesPage = lazy(() => import('@/features/operations/OperationalCasesPage'));
const OperationalReportsPage = lazy(() => import('@/features/operations/OperationalReportsPage'));

const EscalaMensal = lazy(() => import("@/pages/EscalaMensal"));
const DashboardGeral = lazy(() => import("@/pages/DashboardGeral"));
const SATRegionais = lazy(() => import("@/pages/SATRegionais"));
const RelacaoEfetivo = lazy(() => import("@/pages/RelacaoEfetivo"));
const Pareceres = lazy(() => import("@/pages/Pareceres"));
const Autorizacoes = lazy(() => import("@/pages/Autorizacoes"));
const ControlePortarias = lazy(() => import("@/pages/ControlePortarias"));
const NotFound = lazy(() => import('./pages/NotFound'));
const SupportLibrary = lazy(() => import('@/features/support/SupportLibrary'));
const EstablishmentsWorkspace = lazy(() => import('@/features/establishments/EstablishmentsWorkspace'));
const PublicHomePage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicHomePage })));
const PublicIntakePage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicIntakePage })));
const PublicCustomerChatPage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicCustomerChatPage })));
const PublicAccreditationDirectory = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicAccreditationDirectory })));
const PublicPublicationsPage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicPublicationsPage })));
const PublicPrivacyPage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicPrivacyPage })));
const PublicAccessibilityPage = lazy(() => import('@/features/public/PublicPortal.tsx').then(module => ({ default: module.PublicAccessibilityPage })));
import '@/features/support/portal.css';
import '@/features/support/workspace.css';

const queryClient = new QueryClient();

// Componente para proteger rotas autenticadas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="session-loading" role="status">Conferindo sessão…</p>;
  if (!user || (user.registrationStatus && user.registrationStatus !== 'approved')) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
};

// Componente para redirecionar usuários logados aprovados
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <p className="session-loading" role="status">Conferindo sessão…</p>;
  if (user && user.registrationStatus === 'approved') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AuthorizedRoute = ({ children, profiles, administratorOnly = false }: { children: React.ReactNode; profiles?: UserProfile[]; administratorOnly?: boolean }) => {
  const { user } = useAuth();
  const fullAdministrator = isFullAdministrator(user);
  const allowed = fullAdministrator || (!administratorOnly && (!profiles?.length || profiles.some(profile => user?.allowedProfiles?.includes(profile))));
  return allowed ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/atendimento" element={<PublicIntakePage />} />
      <Route path="/atendimento/:protocol" element={<PublicCustomerChatPage />} />
      <Route path="/consultar-protocolo" element={<Navigate to="/atendimento" replace />} />
      <Route path="/credenciados" element={<PublicAccreditationDirectory />} />
      <Route path="/cartilhas" element={<PublicPublicationsPage kind="booklet" />} />
      <Route path="/instrucoes-tecnicas" element={<PublicPublicationsPage kind="technical_instruction" />} />
      <Route path="/privacidade" element={<PublicPrivacyPage />} />
      <Route path="/acessibilidade" element={<PublicAccessibilityPage />} />
      {/* Rota pública - Login */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        } 
      />
      
      {/* Rotas protegidas */}
      <Route 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="credenciamento" element={<AccreditationPage/>}/>
        <Route path="auditoria" element={<AuthorizedRoute administratorOnly><AuditPage/></AuthorizedRoute>}/>
        <Route path="minha-conta" element={<MyAccount/>}/>
        <Route path="gestao-usuarios" element={<AuthorizedRoute administratorOnly><UserManagement /></AuthorizedRoute>} />
        <Route path="dashboard" element={<SupportLibrary />} />
        <Route path="atendimentos" element={<SupportDesk />} />
        <Route path="atendimentos/administracao" element={<AuthorizedRoute profiles={['Subdiretoria','Diretoria']}><SupportAdmin /></AuthorizedRoute>} />
        <Route path="gestao-publicacoes" element={<AuthorizedRoute profiles={['Subdiretoria']}><PublicationsAdmin /></AuthorizedRoute>} />
        <Route path="biblioteca" element={<SupportLibrary />} />
        <Route path="comunicados" element={<SupportLibrary />} />
        <Route path="favoritos" element={<SupportLibrary />} />
        <Route path="estabelecimentos" element={<EstablishmentsWorkspace />} />
        <Route path="mapa" element={<Navigate to="/estabelecimentos" replace />} />
        <Route path="cmt-sub-sats" element={<SatCommands />} />
        <Route path="sat-regionais" element={<SATRegionais />} />
        <Route path="ajuda-vistoriador" element={<Navigate to="/modelos-padronizados" replace />} />
        <Route path="modelos-padronizados" element={<SupportLibrary />} />
        <Route path="modelos-auto-infracao" element={<SupportLibrary />} />
        
        <Route path="projetos" element={<AuthorizedRoute profiles={['Análise','Subdiretoria','Diretoria']}><OperationalCasesPage kind="project" /></AuthorizedRoute>} />
        <Route path="pareceres" element={<AuthorizedRoute profiles={['Análise','Subdiretoria','Diretoria']}><Pareceres /></AuthorizedRoute>} />
        <Route path="gestao-autos" element={<AuthorizedRoute profiles={['Multas','Subdiretoria','Diretoria']}><OperationalCasesPage kind="infraction" /></AuthorizedRoute>} />
        <Route path="escala-mensal" element={<AuthorizedRoute profiles={['Secretaria','Subdiretoria','Diretoria']}><EscalaMensal /></AuthorizedRoute>} />
        <Route path="relatorios" element={<AuthorizedRoute profiles={['Secretaria','Subdiretoria','Diretoria']}><OperationalReportsPage /></AuthorizedRoute>} />
        <Route path="controle-portarias" element={<AuthorizedRoute profiles={['Subdiretoria']}><ControlePortarias /></AuthorizedRoute>} />
        <Route path="comissao-tecnica" element={<AuthorizedRoute profiles={['Subdiretoria','Diretoria']}><OperationalCasesPage kind="technical_committee" /></AuthorizedRoute>} />
        <Route path="autorizacoes" element={<AuthorizedRoute profiles={['Subdiretoria','Diretoria']}><Autorizacoes /></AuthorizedRoute>} />
        <Route path="dashboard-geral" element={<DashboardGeral />} />
        <Route path="controle-autorizacoes-diarias" element={<AuthorizedRoute profiles={['Subdiretoria','Diretoria']}><Autorizacoes /></AuthorizedRoute>} />
        <Route path="relacao-efetivo" element={<AuthorizedRoute profiles={['Secretaria','Subdiretoria','Diretoria']}><RelacaoEfetivo /></AuthorizedRoute>} />
      </Route>

      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppErrorBoundary>
            <Suspense fallback={<p className="session-loading" role="status">Carregando página…</p>}><AppRoutes /></Suspense>
          </AppErrorBoundary>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
