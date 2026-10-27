import { lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import LoginForm from "@/components/LoginForm";
import MainLayout from "@/components/MainLayout";
const AccreditationPage=lazy(()=>import('@/features/accreditation/AccreditationPage'));
const AuditPage=lazy(()=>import('@/features/audit/AuditHistory'));
const MyAccount = lazy(() => import('@/features/users/MyAccountPage'));
const UserManagement = lazy(() => import('@/features/users/UserManagementPage'));
const SatCommands = lazy(() => import('@/features/records/SatCommandsPage'));

const EscalaMensal = lazy(() => import("@/pages/EscalaMensal"));
const DashboardGeral = lazy(() => import("@/pages/DashboardGeral"));
const ComissaoTecnica = lazy(() => import("@/pages/ComissaoTecnica"));
const SATRegionais = lazy(() => import("@/pages/SATRegionais"));
const RelacaoEfetivo = lazy(() => import("@/pages/RelacaoEfetivo"));
const Pareceres = lazy(() => import("@/pages/Pareceres"));
const Autorizacoes = lazy(() => import("@/pages/Autorizacoes"));
const ControlePortarias = lazy(() => import("@/pages/ControlePortarias"));
import NotFound from "./pages/NotFound";

import SupportLibrary from '@/features/support/SupportLibrary';
import EstablishmentsWorkspace from '@/features/establishments/EstablishmentsWorkspace';
import PendingModule from '@/features/support/PendingModule';
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

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
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
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="credenciamento" element={<AccreditationPage/>}/>
        <Route path="auditoria" element={<AuditPage/>}/>
        <Route path="minha-conta" element={<MyAccount/>}/>
        <Route path="gestao-usuarios" element={<UserManagement />} />
        <Route path="dashboard" element={<SupportLibrary />} />
        <Route path="biblioteca" element={<SupportLibrary />} />
        <Route path="comunicados" element={<SupportLibrary />} />
        <Route path="favoritos" element={<SupportLibrary />} />
        <Route path="estabelecimentos" element={<EstablishmentsWorkspace />} />
        <Route path="mapa" element={<Navigate to="/estabelecimentos" replace />} />
        <Route path="cmt-sub-sats" element={<SatCommands />} />
        <Route path="vistoria" element={<Navigate to="/dashboard" replace />} />
        <Route path="sat-regionais" element={<SATRegionais />} />
        <Route path="ajuda-vistoriador" element={<Navigate to="/modelos-padronizados" replace />} />
        <Route path="modelos-padronizados" element={<SupportLibrary />} />
        <Route path="modelos-auto-infracao" element={<SupportLibrary />} />
        
        <Route path="projetos" element={<PendingModule />} />
        <Route path="pareceres" element={<Pareceres />} />
        <Route path="gestao-autos" element={<PendingModule />} />
        <Route path="escala-mensal" element={<EscalaMensal />} />
        <Route path="relatorios" element={<PendingModule />} />
        <Route path="controle-portarias" element={<ControlePortarias />} />
        <Route path="comissao-tecnica" element={<ComissaoTecnica />} />
        <Route path="autorizacoes" element={<Autorizacoes />} />
        <Route path="dashboard-geral" element={<DashboardGeral />} />
        <Route path="controle-autorizacoes-diarias" element={<Autorizacoes />} />
        <Route path="relacao-efetivo" element={<RelacaoEfetivo />} />
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
          <AppRoutes />
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
