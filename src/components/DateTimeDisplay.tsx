import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { Clock } from 'lucide-react';

const DateTimeDisplay: React.FC = () => {
  const { currentDateTime } = useData();
  
  return (
    <div className="flex flex-col items-center space-y-1 p-3 border-b border-border">
      <div className="flex items-center space-x-2 text-sidebar-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">
          {format(currentDateTime, 'HH:mm', { locale: ptBR })}
        </span>
      </div>
      <div className="text-xs text-sidebar-foreground/70">
        {format(currentDateTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </div>
    </div>
  );
};

export default DateTimeDisplay;