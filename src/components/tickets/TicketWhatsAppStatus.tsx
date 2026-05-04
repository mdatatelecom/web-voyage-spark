import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface NotificationRow {
  id: string;
  ticket_id: string | null;
  message_type: string;
  phone_number: string;
  status: string | null;
  error_message: string | null;
  created_at: string | null;
  sent_at: string | null;
  attempts: number | null;
  next_retry_at: string | null;
  payload: any;
}

interface Props {
  ticketId: string;
}

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'sent':
      return (
        <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1">
          <CheckCircle2 className="h-3 w-3" /> Enviado
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Falhou
        </Badge>
      );
    case 'retrying':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Em fila
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> Pendente
        </Badge>
      );
  }
};

const channelLabel = (type: string, phone: string) => {
  if (type?.includes('group')) return `Grupo (${phone})`;
  if (type?.includes('technician')) return `Técnico (${phone})`;
  return `Contato (${phone})`;
};

export function TicketWhatsAppStatus({ ticketId }: Props) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_notifications')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setRows(data as NotificationRow[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchRows();
    // Trigger retry worker (no-op if queue is empty)
    supabase.functions.invoke('whatsapp-retry-worker', { body: {} }).catch(() => {});

    const channel = supabase
      .channel(`wa-notif-${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_notifications', filter: `ticket_id=eq.${ticketId}` },
        () => fetchRows()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchRows]);

  const handleResend = async (row: NotificationRow) => {
    setRetrying(row.id);
    try {
      const payload = row.payload || {};
      const action = payload.action || (row.message_type?.includes('group') ? 'send-group' : 'send');
      const body: any = { action, message: payload.message, ticketId };
      if (action === 'send-group') body.groupId = payload.groupId;
      else body.phone = payload.phone || row.phone_number;

      const { data, error } = await supabase.functions.invoke('send-whatsapp', { body });
      if (error || !data?.success) {
        toast.warning('Reenvio falhou', { description: data?.message || error?.message });
      } else {
        toast.success('Notificação reenviada');
      }
      fetchRows();
    } catch (err: any) {
      toast.warning('Reenvio falhou', { description: err?.message });
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Notificações WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider>
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card text-sm"
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium truncate">{channelLabel(row.message_type, row.phone_number)}</span>
                <span className="text-xs text-muted-foreground">
                  {row.created_at &&
                    formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR })}
                  {row.attempts ? ` · ${row.attempts} tentativa(s)` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {row.error_message ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{statusBadge(row.status)}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{row.error_message}</TooltipContent>
                  </Tooltip>
                ) : (
                  statusBadge(row.status)
                )}
                {(row.status === 'failed' || row.status === 'retrying') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={retrying === row.id}
                    onClick={() => handleResend(row)}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${retrying === row.id ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
