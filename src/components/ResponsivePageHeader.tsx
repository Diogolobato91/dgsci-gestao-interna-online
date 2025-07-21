import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface ResponsivePageHeaderProps {
  title: string;
}

const ResponsivePageHeader: React.FC<ResponsivePageHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger>
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
            {user && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                Bem-vindo, {user.matricula}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
          size="sm"
        >
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};

export default ResponsivePageHeader;