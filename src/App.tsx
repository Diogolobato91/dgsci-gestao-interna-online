import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import MainLayout from "@/components/MainLayout";
import Dashboard from "@/pages/Dashboard";
import AjudaVistoriador from "@/pages/AjudaVistoriador";
import ModelosPadronizados from "@/pages/ModelosPadronizados";
import ModelosAutoInfracao from "@/pages/ModelosAutoInfracao";
import MinhasVistorias from "@/pages/MinhasVistorias";
import EscalaMensal from "@/pages/EscalaMensal";
import DashboardGeral from "@/pages/DashboardGeral";
import ComissaoTecnica from "@/pages/ComissaoTecnica";
import SATRegionais from "@/pages/SATRegionais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente para proteger rotas autenticadas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Componente para redirecionar usuários logados
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
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
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sat-regionais" element={<SATRegionais />} />
        <Route path="ajuda-vistoriador" element={<AjudaVistoriador />} />
        <Route path="modelos-padronizados" element={<ModelosPadronizados />} />
        <Route path="modelos-auto-infracao" element={<ModelosAutoInfracao />} />
        <Route path="minhas-vistorias" element={<MinhasVistorias />} />
        <Route path="projetos" element={<Dashboard />} />
        <Route path="pareceres" element={<Dashboard />} />
        <Route path="gestao-autos" element={<Dashboard />} />
        <Route path="escala-mensal" element={<EscalaMensal />} />
        <Route path="relatorios" element={<Dashboard />} />
        <Route path="comissao-tecnica" element={<ComissaoTecnica />} />
        <Route path="autorizacoes" element={<Dashboard />} />
        <Route path="dashboard-geral" element={<DashboardGeral />} />
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
