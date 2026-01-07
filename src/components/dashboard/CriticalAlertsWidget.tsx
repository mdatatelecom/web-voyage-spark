import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Bell, ChevronRight, Zap } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function CriticalAlertsWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { alerts, activeCount } = useAlerts({ status: 'active' });
  const [newAlertId, setNewAlertId] = useState<string | null>(null);

  const criticalAlerts = alerts?.filter(a => a.severity === 'critical') || [];
  const warningAlerts = alerts?.filter(a => a.severity === 'warning') || [];
  const criticalCount = criticalAlerts.length;
  const warningCount = warningAlerts.length;

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('critical-alerts-widget')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          setNewAlertId(payload.new.id);
          setTimeout(() => setNewAlertId(null), 3000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleNavigateToEntity = (alert: any) => {
    if (alert.related_entity_type === 'rack') {
      navigate(`/racks/${alert.related_entity_id}`);
    } else if (alert.related_entity_type === 'equipment') {
      navigate(`/equipment/${alert.related_entity_id}`);
    }
  };

  const displayAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 5);

  if (!activeCount || activeCount === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Bell className="h-5 w-5" />
            Sistema Estável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum alerta ativo no momento. Todos os sistemas estão operando normalmente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      criticalCount > 0 
        ? "border-destructive/50 bg-destructive/5 shadow-lg shadow-destructive/10" 
        : "border-yellow-500/50 bg-yellow-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className={cn(
              "h-5 w-5",
              criticalCount > 0 ? "text-destructive" : "text-yellow-500"
            )} />
            Alertas Críticos
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge 
                variant="destructive" 
                className="animate-pulse font-bold"
              >
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge 
                variant="outline" 
                className="border-yellow-500 text-yellow-600 dark:text-yellow-400"
              >
                {warningCount} aviso{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all duration-300 cursor-pointer hover:bg-accent/50",
              alert.severity === 'critical' 
                ? "border-l-4 border-l-destructive bg-background" 
                : "border-l-4 border-l-yellow-500 bg-background",
              newAlertId === alert.id && "ring-2 ring-destructive ring-offset-2 animate-pulse"
            )}
            onClick={() => handleNavigateToEntity(alert)}
          >
            <div className="flex items-start gap-3">
              {alert.severity === 'critical' ? (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-medium text-sm leading-tight">{alert.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => navigate('/alerts')}
        >
          Ver Todos os Alertas ({activeCount})
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
