import { useAlerts } from '@/hooks/useAlerts';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AlertListProps {
  compact?: boolean;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-l-destructive';
    case 'warning':
      return 'border-l-yellow-500';
    default:
      return 'border-l-blue-500';
  }
};

export const AlertList = ({ compact = false }: AlertListProps) => {
  const { alerts, isLoading, acknowledgeAlert, resolveAlert } = useAlerts({
    status: 'active',
  });
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum alerta ativo</p>
      </div>
    );
  }

  const displayAlerts = compact ? alerts.slice(0, 5) : alerts;

  return (
    <div className="divide-y">
      {displayAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'p-4 border-l-4 hover:bg-muted/50 transition-colors',
            getSeverityColor(alert.severity)
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              {alert.current_value && alert.threshold_value && (
                <p className="text-xs text-muted-foreground mt-1">
                  Atual: {Math.round(alert.current_value)}% | Limite: {alert.threshold_value}%
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {alert.related_entity_id && alert.related_entity_type && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (alert.related_entity_type === 'rack') {
                        navigate(`/racks/${alert.related_entity_id}`);
                      } else if (alert.related_entity_type === 'equipment') {
                        navigate(`/equipment/${alert.related_entity_id}`);
                      }
                    }}
                  >
                    Ver Detalhes
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Marcar como Lido
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-green-600 hover:text-green-700"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Resolver
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
