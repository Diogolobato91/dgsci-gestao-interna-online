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
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { MenuConfig, MenuItem } from '@/types/navigation';

const integratedItems: MenuItem[] = [
  { id: 'estabelecimentos', title: 'Estabelecimentos', icon: Building2, path: '/estabelecimentos' },
  { id: 'mapa', title: 'Mapa territorial', icon: MapPin, path: '/mapa' },
  { id: 'comunicados', title: 'Comunicados', icon: MessageSquare, path: '/comunicados' },
];

// Funcionalidades comuns (sem vistoria)
const commonItemsWithoutVistoria: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Painel Principal',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  ...integratedItems,
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

// Funcionalidades completas (com vistoria) - apenas para Vistoria, Subdiretoria e Diretoria
const commonItemsComplete: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Painel Principal',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  ...integratedItems,
  {
    id: 'vistoria',
    title: 'Vistoria',
    icon: MessageSquare,
    path: '/vistoria'
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
    ...commonItemsComplete
  ],
  
  'Análise': [
    ...commonItemsWithoutVistoria,
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
    ...commonItemsWithoutVistoria,
    {
      id: 'gestao-autos',
      title: 'Gestão de Autos',
      icon: Gavel,
      path: '/gestao-autos'
    }
  ],
  
  'ADM': [
    ...commonItemsWithoutVistoria,
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
    ...commonItemsComplete,
    {
      id: 'controle-portarias',
      title: 'Controle de Portarias',
      icon: FileText,
      path: '/controle-portarias'
    },
    {
      id: 'comissao-tecnica',
      title: 'Comissão Técnica',
      icon: Users,
      path: '/comissao-tecnica'
    },
    {
      id: 'autorizacoes',
      title: 'Controle de Autorizações | Diárias',
      icon: CheckCircle,
      path: '/controle-autorizacoes-diarias'
    },
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo'
    }
  ],
  
  'Diretoria': [
    ...commonItemsComplete,
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
      title: 'Controle de Autorizações | Diárias',
      icon: CheckCircle,
      path: '/controle-autorizacoes-diarias',
      section: 'Subdiretoria'
    },
    // Seção Diretoria
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo',
      section: 'Diretoria'
    }
  ]
};