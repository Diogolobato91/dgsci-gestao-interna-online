import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { navigationConfig } from '@/config/navigation';
import { MenuSection } from '@/types/navigation';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const menuItems = navigationConfig[user.profile];
  
  // Organizar itens por seção para o perfil Diretoria
  const sections: MenuSection[] = [];
  const commonItems = menuItems.filter(item => !item.section);
  
  if (commonItems.length > 0) {
    sections.push({ title: '', items: commonItems });
  }

  if (user.profile === 'Diretoria') {
    const sectionNames = [...new Set(menuItems.filter(item => item.section).map(item => item.section!))];
    
    sectionNames.forEach(sectionName => {
      const sectionItems = menuItems.filter(item => item.section === sectionName);
      if (sectionItems.length > 0) {
        sections.push({ title: sectionName, items: sectionItems });
      }
    });
  }

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Header da Sidebar */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">DGSCI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perfil: {user.profile}
        </p>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.title}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;