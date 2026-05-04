import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, X } from 'lucide-react';
import { useTicketStats } from '@/hooks/useTicketStats';

const SESSION_KEY = 'sla-inconsistency-toast-shown';
const DISMISS_KEY = 'sla-inconsistency-dismissed';

export const SLAInconsistencyBanner = () => {
  const { data: stats } = useTicketStats();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });
  const [open, setOpen] = useState(false);

  const inconsistent = stats?.slaBreakdown?.inconsistent ?? 0;
  const invalidDates = stats?.slaBreakdown?.invalidDates ?? 0;
  const tickets = stats?.slaBreakdown?.inconsistentTickets ?? [];
  const total = inconsistent + invalidDates;

  useEffect(() => {
    if (total > 0 && typeof window !== 'undefined') {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, '1');
        toast.warning('Inconsistências de SLA detectadas', {
          description: `${inconsistent} sem resolved_at, ${invalidDates} com data inválida.`,
        });
      }
    }
  }, [total, inconsistent, invalidDates]);

  if (total === 0 || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <>
      <Alert className="border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600 dark:text-amber-400">
          Inconsistências de SLA detectadas
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            <strong>{inconsistent}</strong> chamado(s) resolvidos sem <code>resolved_at</code> e{' '}
            <strong>{invalidDates}</strong> com <code>due_date</code> inválido. Foram tratados como
            fora do prazo.
          </span>
          <div className="flex gap-2">
            {inconsistent > 0 && (
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                Ver detalhes
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} title="Dispensar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chamados inconsistentes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Os chamados abaixo estão marcados como resolvidos/fechados, porém sem data de resolução.
          </p>
          <ul className="text-sm font-mono space-y-1 max-h-72 overflow-auto pr-2">
            {tickets.map((t, i) => (
              <li key={i} className="border-b border-border/40 py-1">
                {t.ticket_number || t.id}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
};
