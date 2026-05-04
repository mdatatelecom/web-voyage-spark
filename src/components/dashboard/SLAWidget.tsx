import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTicketStats } from '@/hooks/useTicketStats';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Info,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSlaTarget, setSlaTarget, DEFAULT_SLA_TARGET } from '@/lib/sla-utils';
import { getSlaStatus } from '@/lib/sla-status';

interface SLAWidgetProps {
  className?: string;
}

export const SLAWidget = ({ className }: SLAWidgetProps) => {
  const { data: stats, isLoading } = useTicketStats();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<number>(getSlaTarget());
  const [targetDraft, setTargetDraft] = useState<string>(String(target));
  const [targetOpen, setTargetOpen] = useState(false);

  const slaRaw = stats?.slaBreakdown?.complianceRaw ?? stats?.slaCompliance ?? 100;
  const sla = stats?.slaCompliance ?? Math.round(slaRaw);
  const overdue = stats?.overdueTickets ?? 0;
  const critical = stats?.urgentTickets?.filter(t => t.deadlineStatus === 'critical').length ?? 0;
  const breakdown = stats?.slaBreakdown;

  const slaStatus = getSlaStatus(sla, target);
  const isCritical = slaStatus.status === 'critical';

  const handleSaveTarget = () => {
    const n = Number(targetDraft);
    const saved = setSlaTarget(Number.isFinite(n) ? n : DEFAULT_SLA_TARGET);
    setTarget(saved);
    setTargetDraft(String(saved));
    setTargetOpen(false);
    queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
  };

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
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Performance SLA
        </CardTitle>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Detalhes do cálculo">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-2 text-sm">
                <div className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" /> Detalhes do cálculo
                </div>
                <p className="text-xs text-muted-foreground">
                  Tickets com prazo já avaliáveis (resolvidos/fechados ou em aberto vencidos).
                </p>
                <div className="grid grid-cols-2 gap-y-1 pt-1">
                  <span className="text-muted-foreground">Avaliáveis</span>
                  <span className="text-right font-medium">{breakdown?.evaluable ?? 0}</span>
                  <span className="text-green-500">No prazo</span>
                  <span className="text-right font-medium text-green-500">{breakdown?.onTime ?? 0}</span>
                  <span className="text-red-500">Fora do prazo</span>
                  <span className="text-right font-medium text-red-500">{breakdown?.breached ?? 0}</span>
                  <span className="text-amber-500">Inconsistentes</span>
                  <span className="text-right font-medium text-amber-500">{breakdown?.inconsistent ?? 0}</span>
                  <span className="text-muted-foreground">Datas inválidas</span>
                  <span className="text-right font-medium">{breakdown?.invalidDates ?? 0}</span>
                  <span className="text-muted-foreground">Compliance (bruto)</span>
                  <span className="text-right font-medium">
                    {(breakdown?.complianceRaw ?? slaRaw).toFixed(2)}%
                  </span>
                </div>
                {breakdown?.inconsistent ? (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-amber-500 font-medium mb-1">
                      Resolvidos sem data de resolução:
                    </p>
                    <ul className="text-xs space-y-0.5 max-h-24 overflow-auto">
                      {breakdown.inconsistentTickets.slice(0, 5).map((t, i) => (
                        <li key={i} className="font-mono">
                          {t.ticket_number || t.id}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Ajustar meta"
                onClick={() => setTargetDraft(String(target))}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Ajustar meta de SLA</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="sla-target">Meta (%)</Label>
                <Input
                  id="sla-target"
                  type="number"
                  min={1}
                  max={100}
                  value={targetDraft}
                  onChange={e => setTargetDraft(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor entre 1 e 100. Padrão: {DEFAULT_SLA_TARGET}%.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTargetOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTarget}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/tickets/metrics')}
          >
            Ver Detalhes
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
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
            <span className="text-muted-foreground">Meta: {target}%</span>
            <span className={cn(
              'font-medium',
              sla >= target ? 'text-green-500' : 'text-muted-foreground'
            )}>
              {sla >= target ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Meta atingida
                </span>
              ) : (
                `${Math.max(0, target - sla)}% abaixo da meta`
              )}
            </span>
          </div>
          <div className="relative h-3">
            <Progress
              value={sla}
              className={cn(
                'h-3',
                slaStatus.status === 'good' && '[&>div]:bg-green-500',
                slaStatus.status === 'warning' && '[&>div]:bg-amber-500',
                slaStatus.status === 'critical' && '[&>div]:bg-red-500'
              )}
            />
            <div
              className="absolute top-0 h-3 w-px bg-foreground/60"
              style={{ left: `${target}%` }}
              aria-hidden
            />
          </div>
          <div className="relative text-xs text-muted-foreground h-4">
            <span className="absolute left-0">0%</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${target}%` }}>{target}%</span>
            <span className="absolute right-0">100%</span>
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
