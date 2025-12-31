import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useTicketStats';
import { useNavigate } from 'react-router-dom';
import { 
  Gauge, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAWidgetProps {
  className?: string;
}

export const SLAWidget = ({ className }: SLAWidgetProps) => {
  const { data: stats, isLoading } = useTicketStats();
  const navigate = useNavigate();

  const sla = stats?.slaCompliance ?? 100;
  const overdue = stats?.overdueTickets ?? 0;
  const critical = stats?.urgentTickets?.filter(t => t.deadlineStatus === 'critical').length ?? 0;

  // SLA status colors and alerts
  const getSLAStatus = () => {
    if (sla >= 90) return { color: 'text-green-500', bgColor: 'bg-green-500', status: 'good', label: 'Excelente' };
    if (sla >= 80) return { color: 'text-amber-500', bgColor: 'bg-amber-500', status: 'warning', label: 'Atenção' };
    return { color: 'text-red-500', bgColor: 'bg-red-500', status: 'critical', label: 'Crítico' };
  };

  const slaStatus = getSLAStatus();
  const isCritical = slaStatus.status === 'critical';

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        className,
        'transition-all duration-300',
        isCritical && 'border-red-500/50 shadow-red-500/20 shadow-lg animate-pulse'
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Performance SLA
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/tickets/metrics')}
        >
          Ver Detalhes
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* SLA Percentage */}
          <div className="text-center">
            <div className={cn(
              'text-4xl font-bold',
              slaStatus.color
            )}>
              {sla}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">SLA Geral</p>
            <Badge 
              variant="outline" 
              className={cn(
                'mt-2',
                slaStatus.status === 'good' && 'border-green-500 text-green-500',
                slaStatus.status === 'warning' && 'border-amber-500 text-amber-500',
                slaStatus.status === 'critical' && 'border-red-500 text-red-500'
              )}
            >
              {slaStatus.status === 'good' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {slaStatus.status === 'warning' && <TrendingDown className="h-3 w-3 mr-1" />}
              {slaStatus.status === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {slaStatus.label}
            </Badge>
          </div>

          {/* Overdue Count */}
          <div className="text-center">
            <div className={cn(
              'text-4xl font-bold',
              overdue > 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {overdue}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Atrasados</p>
            {overdue > 0 && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Ação Necessária
              </Badge>
            )}
          </div>

          {/* Critical Count */}
          <div className="text-center">
            <div className={cn(
              'text-4xl font-bold',
              critical > 0 ? 'text-orange-500' : 'text-muted-foreground'
            )}>
              {critical}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Críticos</p>
            {critical > 0 && (
              <Badge variant="outline" className="mt-2 border-orange-500 text-orange-500">
                <Clock className="h-3 w-3 mr-1" />
                &lt; 4h restantes
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meta: 90%</span>
            <span className={cn(
              'font-medium',
              sla >= 90 ? 'text-green-500' : 'text-muted-foreground'
            )}>
              {sla >= 90 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Meta atingida
                </span>
              ) : (
                `${90 - sla}% abaixo da meta`
              )}
            </span>
          </div>
          <Progress 
            value={sla} 
            className={cn(
              'h-3',
              slaStatus.status === 'good' && '[&>div]:bg-green-500',
              slaStatus.status === 'warning' && '[&>div]:bg-amber-500',
              slaStatus.status === 'critical' && '[&>div]:bg-red-500'
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="border-l border-muted-foreground/30 pl-1 ml-[80%]">90%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Alert Banner for Critical SLA */}
        {isCritical && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500">
                SLA abaixo de 80%
              </p>
              <p className="text-xs text-muted-foreground">
                Ação imediata necessária para recuperar o nível de serviço
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => navigate('/tickets?status=open&priority=high')}
            >
              Ver Urgentes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
