import { useAlertsByEntity } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radar, AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ZabbixAlertsSectionProps {
  equipmentId: string;
}

export function ZabbixAlertsSection({ equipmentId }: ZabbixAlertsSectionProps) {
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useAlertsByEntity(equipmentId, 'equipment');

  // Filter only Zabbix alerts
  const zabbixAlerts = alerts?.filter(a => a.type === 'zabbix_alert') || [];

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/50',
          label: 'Crítico'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          label: 'Aviso'
        };
      default:
        return {
          icon: Info,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/50',
          label: 'Info'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (zabbixAlerts.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Radar className="h-4 w-4 text-purple-500" />
        Alertas Zabbix
        <Badge variant="outline" className="ml-auto border-purple-500 text-purple-600 dark:text-purple-400">
          {zabbixAlerts.length} ativo{zabbixAlerts.length > 1 ? 's' : ''}
        </Badge>
      </h3>
      <div className="space-y-2">
        {zabbixAlerts.slice(0, 5).map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          
          return (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
                config.bgColor,
                config.borderColor
              )}
              onClick={() => navigate('/alerts?type=zabbix')}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(alert.created_at!), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        
        {zabbixAlerts.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/alerts?type=zabbix')}
          >
            Ver mais {zabbixAlerts.length - 5} alerta{zabbixAlerts.length - 5 > 1 ? 's' : ''}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}