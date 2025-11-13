import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAlerts } from '@/hooks/useAlerts';
import { useNavigate } from 'react-router-dom';
import { AlertList } from './AlertList';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';

export const AlertBell = () => {
  const { activeCount } = useAlerts();
  const navigate = useNavigate();
  
  // Subscribe to realtime alerts
  useRealtimeAlerts();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {activeCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {activeCount > 9 ? '9+' : activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} ativas</Badge>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <AlertList compact />
        </div>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/alerts')}
          >
            Ver todos os alertas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
