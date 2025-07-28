import { 
  LayoutDashboard, 
  HelpCircle, 
  FileText, 
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Calendar,
  Users,
  CheckCircle,
  TrendingUp,
  Shield,
  FileCheck,
  Gavel,
  Building2,
  MapPin,
  UserCheck
} from 'lucide-react';
import { MenuConfig, MenuItem } from '@/types/navigation';

// Funcionalidades comuns a todos os perfis
const commonItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Painel Principal',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'sat-regionais',
    title: 'SAT\'s Regionais',
    icon: MapPin,
    path: '/sat-regionais'
  },
  {
    id: 'ajuda-vistoriador',
    title: 'Ajuda Rápida ao Vistoriador',
    icon: HelpCircle,
    path: '/ajuda-vistoriador'
  },
  {
    id: 'modelos-padronizados',
    title: 'Modelos Padronizados',
    icon: FileText,
    path: '/modelos-padronizados'
  },
  {
    id: 'modelos-auto-infracao',
    title: 'Modelos de Auto de Infração',
    icon: AlertTriangle,
    path: '/modelos-auto-infracao'
  }
];

export const navigationConfig: MenuConfig = {
  'Vistoria': [
    ...commonItems
  ],
  
  'Análise': [
    ...commonItems,
    {
      id: 'projetos',
      title: 'Projetos',
      icon: FileCheck,
      path: '/projetos'
    },
    {
      id: 'pareceres',
      title: 'Pareceres',
      icon: FileText,
      path: '/pareceres'
    }
  ],
  
  'Multas': [
    ...commonItems,
    {
      id: 'gestao-autos',
      title: 'Gestão de Autos',
      icon: Gavel,
      path: '/gestao-autos'
    }
  ],
  
  'ADM': [
    ...commonItems,
    {
      id: 'escala-mensal',
      title: 'Escala Mensal',
      icon: Calendar,
      path: '/escala-mensal'
    },
    {
      id: 'relatorios',
      title: 'Relatórios',
      icon: BarChart3,
      path: '/relatorios'
    },
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo'
    }
  ],
  
  'Subdiretoria': [
    ...commonItems,
    {
      id: 'comissao-tecnica',
      title: 'Comissão Técnica',
      icon: Users,
      path: '/comissao-tecnica'
    },
    {
      id: 'autorizacoes',
      title: 'Autorizações',
      icon: CheckCircle,
      path: '/autorizacoes'
    },
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo'
    }
  ],
  
  'Diretoria': [
    ...commonItems,
    // Seção Operacional Análise
    {
      id: 'dir-projetos',
      title: 'Projetos',
      icon: FileCheck,
      path: '/projetos',
      section: 'Operacional Análise'
    },
    {
      id: 'dir-pareceres',
      title: 'Pareceres',
      icon: FileText,
      path: '/pareceres',
      section: 'Operacional Análise'
    },
    // Seção Operacional Multas
    {
      id: 'dir-gestao-autos',
      title: 'Gestão de Autos',
      icon: Gavel,
      path: '/gestao-autos',
      section: 'Operacional Multas'
    },
    // Seção Administrativo
    {
      id: 'dir-escala-mensal',
      title: 'Escala Mensal',
      icon: Calendar,
      path: '/escala-mensal',
      section: 'Administrativo'
    },
    {
      id: 'dir-relatorios',
      title: 'Relatórios',
      icon: BarChart3,
      path: '/relatorios',
      section: 'Administrativo'
    },
    // Seção Subdiretoria
    {
      id: 'dir-comissao-tecnica',
      title: 'Comissão Técnica',
      icon: Users,
      path: '/comissao-tecnica',
      section: 'Subdiretoria'
    },
    {
      id: 'dir-autorizacoes',
      title: 'Autorizações',
      icon: CheckCircle,
      path: '/autorizacoes',
      section: 'Subdiretoria'
    },
    // Seção Diretoria
    {
      id: 'dashboard-geral',
      title: 'Dashboard Geral',
      icon: TrendingUp,
      path: '/dashboard-geral',
      section: 'Diretoria'
    },
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo',
      section: 'Diretoria'
    }
  ]
};