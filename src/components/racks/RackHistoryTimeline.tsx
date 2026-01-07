import { useRackHistory, RackHistoryEvent } from '@/hooks/useRackHistory';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRightLeft, Download, Upload, Loader2, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RackHistoryTimelineProps {
  rackId: string;
}

const getActionConfig = (action: RackHistoryEvent['action']) => {
  switch (action) {
    case 'installed':
      return {
        icon: Download,
        color: 'bg-green-500',
        label: 'Instalado',
        textColor: 'text-green-600',
      };
    case 'removed':
      return {
        icon: Upload,
        color: 'bg-red-500',
        label: 'Removido',
        textColor: 'text-red-600',
      };
    case 'moved':
      return {
        icon: ArrowRightLeft,
        color: 'bg-blue-500',
        label: 'Movido',
        textColor: 'text-blue-600',
      };
  }
};

export const RackHistoryTimeline = ({ rackId }: RackHistoryTimelineProps) => {
  const { data: history, isLoading } = useRackHistory(rackId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico registrado</p>
        <p className="text-xs">Instalações futuras aparecerão aqui</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {history.map((event, index) => {
            const config = getActionConfig(event.action);
            const Icon = config.icon;

            return (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0',
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">
                      {event.equipment_name}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        config.textColor,
                        'bg-current/10'
                      )}
                    >
                      {config.label}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    U{event.position_u_start}
                    {event.position_u_end !== event.position_u_start && `-U${event.position_u_end}`}
                    {' • '}
                    {event.mount_side === 'rear' ? 'Traseiro' : 'Frontal'}
                  </p>

                  {event.action === 'moved' && event.previous_rack && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Movido de: {event.previous_rack.name}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                    {' • '}
                    {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};
