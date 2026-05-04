import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { CheckCircle2, Info, Settings2, AlertTriangle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getSlaTarget,
  setSlaTarget,
  DEFAULT_SLA_TARGET,
  type SLABreakdown,
} from '@/lib/sla-utils';
import { getSlaStatus } from '@/lib/sla-status';

interface SLAComplianceCardProps {
  compliance: number;
  breakdown?: SLABreakdown;
}

export const SLAComplianceCard = ({ compliance, breakdown }: SLAComplianceCardProps) => {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<number>(getSlaTarget());
  const [draft, setDraft] = useState<string>(String(target));
  const [open, setOpen] = useState(false);

  const status = getSlaStatus(compliance, target);
  const Icon =
    status.status === 'good' ? CheckCircle2 : status.status === 'warning' ? TrendingDown : AlertTriangle;

  const handleSave = () => {
    const n = Number(draft);
    const saved = setSlaTarget(Number.isFinite(n) ? n : DEFAULT_SLA_TARGET);
    setTarget(saved);
    setDraft(String(saved));
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
  };

  return (
    <Card className={cn(status.gradientClass, status.borderClass)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">SLA Compliance</p>
            <p className={cn('text-3xl font-bold', status.color)}>{compliance}%</p>
            <p className="text-xs text-muted-foreground mt-1">Meta: {target}%</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon className={cn('h-10 w-10 opacity-60', status.color)} />
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes do cálculo">
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
                      <span className="text-right font-medium text-amber-500">
                        {breakdown?.inconsistent ?? 0}
                      </span>
                      <span className="text-muted-foreground">Datas inválidas</span>
                      <span className="text-right font-medium">{breakdown?.invalidDates ?? 0}</span>
                      <span className="text-muted-foreground">Compliance (bruto)</span>
                      <span className="text-right font-medium">
                        {(breakdown?.complianceRaw ?? compliance).toFixed(2)}%
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
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Ajustar meta"
                    onClick={() => setDraft(String(target))}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Ajustar meta de SLA</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="sla-target-metrics">Meta (%)</Label>
                    <Input
                      id="sla-target-metrics"
                      type="number"
                      min={1}
                      max={100}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor entre 1 e 100. Padrão: {DEFAULT_SLA_TARGET}%.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
