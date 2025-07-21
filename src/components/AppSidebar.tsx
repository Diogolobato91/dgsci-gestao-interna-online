import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { navigationConfig } from '@/config/navigation';
import { MenuSection } from '@/types/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const currentPath = location.pathname;

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

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="transition-all duration-300 ease-in-out">
      <SidebarHeader className="border-b border-border">
        <div className="p-4 flex items-center justify-center">
          <h1 className="font-bold text-primary transition-all duration-300 ease-in-out text-center">
            {state === 'collapsed' ? 'D' : 'DGSCI'}
          </h1>
        </div>
        {state !== 'collapsed' && (
          <div className="px-4 pb-2 transition-all duration-300 ease-in-out">
            <p className="text-sm text-muted-foreground text-center">
              Perfil: {user.profile}
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, sectionIndex) => (
          <SidebarGroup key={sectionIndex}>
            {section.title && state !== 'collapsed' && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <NavLink
                          to={item.path}
                          className="flex items-center gap-3 transition-all duration-200 ease-in-out"
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {state !== 'collapsed' && (
                            <span className="truncate transition-opacity duration-200 ease-in-out">
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}