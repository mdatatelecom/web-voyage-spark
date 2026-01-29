import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardHat, AlertCircle, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function EpiMonitorWidget() {
  const navigate = useNavigate();
  const { alerts } = useAlerts({ status: 'active', type: 'epi_alert' });

  const epiAlerts = alerts || [];
  const criticalCount = epiAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = epiAlerts.filter(a => a.severity === 'warning').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <HardHat className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-destructive';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  if (epiAlerts.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-base">
            <HardHat className="h-5 w-5" />
            Segurança do Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm">
              Nenhum alerta de EPI ativo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      criticalCount > 0 
        ? "border-amber-600/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" 
        : "border-amber-500/30 bg-amber-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-5 w-5 text-amber-500" />
            Segurança do Trabalho
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge 
                variant="destructive" 
                className="font-bold"
              >
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge 
                variant="outline" 
                className="border-amber-500 text-amber-600 dark:text-amber-400"
              >
                {warningCount} aviso{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {epiAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border border-l-4 bg-background transition-all duration-300 cursor-pointer hover:bg-accent/50",
              getSeverityBorder(alert.severity)
            )}
            onClick={() => navigate('/alerts?type=epi')}
          >
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              <div className="space-y-1">
                <p className="font-medium text-sm leading-tight">{alert.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.created_at!), { 
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
          onClick={() => navigate('/alerts?type=epi')}
        >
          Ver Todos os Alertas EPI ({epiAlerts.length})
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
