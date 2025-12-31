import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeadlineSettings {
  warningHours: number;
  criticalHours: number;
  autoEscalationEnabled: boolean;
  whatsappEnabled: boolean;
}

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  contact_phone: string | null;
  technician_phone: string | null;
}

function getNotificationType(hoursUntilDue: number, criticalHours: number, warningHours: number): string {
  if (hoursUntilDue < 0) return 'overdue';
  if (hoursUntilDue <= criticalHours) return 'critical_4h';
  if (hoursUntilDue <= warningHours) return 'warning_24h';
  return 'none';
}

function escalatePriority(current: string): string {
  const escalation: Record<string, string> = {
    'low': 'medium',
    'medium': 'high',
    'high': 'critical',
    'critical': 'critical'
  };
  return escalation[current] || current;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[priority] || priority;
}

function getMessageTemplate(type: string, ticket: Ticket, hoursRemaining: number, escalated?: { old: string; new: string }): string {
  const absHours = Math.abs(hoursRemaining);
  
  switch (type) {
    case 'warning_24h':
      return `⚠️ *ALERTA DE PRAZO*\n\n` +
        `O chamado *${ticket.ticket_number}* vence em menos de 24 horas!\n\n` +
        `📋 *Título:* ${ticket.title}\n` +
        `⏰ *Prazo:* ${formatDate(ticket.due_date)}\n` +
        `🔴 *Prioridade:* ${getPriorityLabel(ticket.priority)}\n\n` +
        `Por favor, priorize a resolução deste chamado.`;

    case 'critical_4h':
      return `🚨 *PRAZO CRÍTICO*\n\n` +
        `O chamado *${ticket.ticket_number}* vence em menos de 4 HORAS!\n\n` +
        `📋 *Título:* ${ticket.title}\n` +
        `⏰ *Prazo:* ${formatDate(ticket.due_date)}\n` +
        `🔴 *Prioridade:* ${getPriorityLabel(ticket.priority)}\n\n` +
        `⚡ AÇÃO IMEDIATA NECESSÁRIA!`;

    case 'overdue':
      return `🔴 *CHAMADO ATRASADO*\n\n` +
        `O chamado *${ticket.ticket_number}* está VENCIDO!\n\n` +
        `📋 *Título:* ${ticket.title}\n` +
        `⏰ *Venceu em:* ${formatDate(ticket.due_date)}\n` +
        `⏱️ *Atraso:* ${absHours} horas\n` +
        (escalated 
          ? `\n📈 *Prioridade escalonada:* ${getPriorityLabel(escalated.old)} → ${getPriorityLabel(escalated.new)}\n` 
          : '') +
        `\n⚠️ Este chamado requer atenção IMEDIATA!`;

    case 'escalation':
      return `📈 *ESCALONAMENTO DE PRIORIDADE*\n\n` +
        `O chamado *${ticket.ticket_number}* foi escalonado automaticamente.\n\n` +
        `📋 *Título:* ${ticket.title}\n` +
        `🔄 *Prioridade:* ${getPriorityLabel(escalated?.old || '')} → ${getPriorityLabel(escalated?.new || '')}\n` +
        `📝 *Motivo:* Prazo excedido ou próximo do vencimento`;

    default:
      return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Check ticket deadlines function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch deadline settings
    const { data: settingsData } = await supabase
      .from('alert_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'ticket_deadline_warning_hours',
        'ticket_deadline_critical_hours',
        'ticket_auto_escalation_enabled',
        'ticket_deadline_whatsapp_enabled'
      ]);

    const settingsMap = new Map(settingsData?.map(s => [s.setting_key, s.setting_value]) || []);
    
    const settings: DeadlineSettings = {
      warningHours: Number(settingsMap.get('ticket_deadline_warning_hours')) || 24,
      criticalHours: Number(settingsMap.get('ticket_deadline_critical_hours')) || 4,
      autoEscalationEnabled: (settingsMap.get('ticket_auto_escalation_enabled') || 1) === 1,
      whatsappEnabled: (settingsMap.get('ticket_deadline_whatsapp_enabled') || 1) === 1,
    };

    console.log('Deadline settings:', settings);

    // 2. Fetch open tickets with due_date
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, title, due_date, priority, status, assigned_to, contact_phone, technician_phone')
      .in('status', ['open', 'in_progress'])
      .not('due_date', 'is', null);

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      throw ticketsError;
    }

    console.log(`Found ${tickets?.length || 0} open tickets with due dates`);

    const now = new Date();
    const results = {
      processed: 0,
      notified: 0,
      escalated: 0,
      skipped: 0,
    };

    for (const ticket of (tickets || [])) {
      const dueDate = new Date(ticket.due_date);
      const hoursUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      // Only process tickets within our window (overdue or due within warningHours)
      if (hoursUntilDue > settings.warningHours) {
        results.skipped++;
        continue;
      }

      const notificationType = getNotificationType(hoursUntilDue, settings.criticalHours, settings.warningHours);
      
      if (notificationType === 'none') {
        results.skipped++;
        continue;
      }

      // 3. Check if already notified for this type
      const { data: existingNotif } = await supabase
        .from('ticket_deadline_notifications')
        .select('id')
        .eq('ticket_id', ticket.id)
        .eq('notification_type', notificationType)
        .maybeSingle();

      if (existingNotif) {
        console.log(`Ticket ${ticket.ticket_number} already notified for ${notificationType}`);
        results.skipped++;
        continue;
      }

      results.processed++;

      let escalated: { old: string; new: string } | undefined;

      // 4. Handle escalation for overdue or critical tickets
      if (settings.autoEscalationEnabled && (notificationType === 'overdue' || notificationType === 'critical_4h')) {
        const newPriority = escalatePriority(ticket.priority);
        
        if (newPriority !== ticket.priority) {
          console.log(`Escalating ticket ${ticket.ticket_number} from ${ticket.priority} to ${newPriority}`);
          
          await supabase
            .from('support_tickets')
            .update({ priority: newPriority })
            .eq('id', ticket.id);

          escalated = { old: ticket.priority, new: newPriority };
          results.escalated++;
        }
      }

      // 5. Send WhatsApp notification
      if (settings.whatsappEnabled) {
        const phoneToNotify = ticket.technician_phone || ticket.contact_phone;
        
        if (phoneToNotify) {
          const message = getMessageTemplate(notificationType, ticket, hoursUntilDue, escalated);
          
          console.log(`Sending ${notificationType} notification to ${phoneToNotify} for ticket ${ticket.ticket_number}`);
          
          try {
            // Call the send-whatsapp function
            const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send',
                phone: phoneToNotify,
                message: message,
                ticketId: ticket.id,
              }
            });

            if (whatsappError) {
              console.error('WhatsApp send error:', whatsappError);
            } else {
              results.notified++;
            }
          } catch (whatsappErr) {
            console.error('Failed to send WhatsApp notification:', whatsappErr);
          }
        }
      }

      // 6. Record notification
      const notifiedUsers: string[] = [];
      if (ticket.assigned_to) notifiedUsers.push(ticket.assigned_to);

      await supabase
        .from('ticket_deadline_notifications')
        .insert({
          ticket_id: ticket.id,
          notification_type: notificationType,
          old_priority: escalated?.old || null,
          new_priority: escalated?.new || null,
          notified_users: notifiedUsers,
        });
    }

    console.log('Deadline check complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deadline check completed',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-ticket-deadlines:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
