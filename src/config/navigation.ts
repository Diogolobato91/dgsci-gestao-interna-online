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
  {id:'credenciamento',title:'Credenciamento',icon:FileCheck,path:'/credenciamento'},
  { id: 'estabelecimentos', title: 'Estabelecimentos', icon: Building2, path: '/estabelecimentos' },
  { id: 'sat-command', title: "CMT e SUB SAT'S", icon: Users, path: '/cmt-sub-sats' },
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
    id: 'modelos-padronizados',
    title: 'Modelos Padronizados',
    icon: FileText,
    path: '/modelos-padronizados'
  },

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
    id: 'sat-regionais',
    title: 'SAT\'s Regionais',
    icon: MapPin,
    path: '/sat-regionais'
  },
  {
    id: 'modelos-padronizados',
    title: 'Modelos Padronizados',
    icon: FileText,
    path: '/modelos-padronizados'
  },

];

export const navigationConfig: MenuConfig = {
  'Credenciamento': [...commonItemsWithoutVistoria],
  'Vistoriador': [
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
  
  'Secretaria': [
    ...commonItemsWithoutVistoria,
    {
      id: 'escala-mensal',
      title: 'Escala Mensal',
      icon: Calendar,
      path: '/escala-mensal', section: 'Administração'
    },
    {
      id: 'relatorios',
      title: 'Relatórios',
      icon: BarChart3,
      path: '/relatorios', section: 'Administração'
    },
    {
      id: 'relacao-efetivo',
      title: 'Relação de Efetivo',
      icon: UserCheck,
      path: '/relacao-efetivo', section: 'Administração'
    }
  ],
  
  'Subdiretoria': [
    ...commonItemsComplete,
    { id: 'escala-mensal', title: 'Escala Mensal', icon: Calendar, path: '/escala-mensal', section: 'Administração' },
    {
      id: 'controle-portarias',
      title: 'Controle de Portarias',
      icon: FileText,
      path: '/controle-portarias',
      section: 'Subdiretoria'
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
      path: '/relacao-efetivo', section: 'Administração'
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
      section: 'Administração'
    },
    {
      id: 'dir-relatorios',
      title: 'Relatórios',
      icon: BarChart3,
      path: '/relatorios',
      section: 'Administração'
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
      path: '/relacao-efetivo', section: 'Administração'
    }
  ]
};