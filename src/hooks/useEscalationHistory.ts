import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, parseISO, isAfter } from 'date-fns';

export type EscalationType = 'escalation' | 'overdue_warning' | 'critical_warning' | 'all';

export interface EscalationRecord {
  id: string;
  ticket_id: string;
  ticket_number: string;
  ticket_title: string;
  notification_type: string;
  old_priority: string | null;
  new_priority: string | null;
  created_at: string;
  assigned_to: string | null;
  technician_name: string | null;
}

export interface EscalationStats {
  total: number;
  escalations: number;
  overdueWarnings: number;
  criticalWarnings: number;
}

export interface UseEscalationHistoryOptions {
  period?: '7days' | '30days' | '90days' | 'all';
  type?: EscalationType;
  technicianId?: string;
}

export const useEscalationHistory = (options: UseEscalationHistoryOptions = {}) => {
  const { period = '30days', type = 'all', technicianId } = options;

  return useQuery({
    queryKey: ['escalation-history', period, type, technicianId],
    queryFn: async (): Promise<{ records: EscalationRecord[]; stats: EscalationStats }> => {
      // Fetch notifications
      let query = supabase
        .from('ticket_deadline_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply type filter
      if (type !== 'all') {
        query = query.eq('notification_type', type);
      }

      const { data: notifications, error } = await query;

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        return {
          records: [],
          stats: { total: 0, escalations: 0, overdueWarnings: 0, criticalWarnings: 0 }
        };
      }

      // Get ticket IDs
      const ticketIds = [...new Set(notifications.map(n => n.ticket_id))];

      // Fetch tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, assigned_to')
        .in('id', ticketIds);

      const ticketMap = new Map(tickets?.map(t => [t.id, t]) || []);

      // Fetch technician profiles
      const techIds = [...new Set(tickets?.filter(t => t.assigned_to).map(t => t.assigned_to!) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', techIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Map notifications to records
      let records: EscalationRecord[] = notifications.map(n => {
        const ticket = ticketMap.get(n.ticket_id);
        return {
          id: n.id,
          ticket_id: n.ticket_id,
          ticket_number: ticket?.ticket_number || 'N/A',
          ticket_title: ticket?.title || 'Chamado não encontrado',
          notification_type: n.notification_type,
          old_priority: n.old_priority,
          new_priority: n.new_priority,
          created_at: n.created_at,
          assigned_to: ticket?.assigned_to || null,
          technician_name: ticket?.assigned_to ? profileMap.get(ticket.assigned_to) || 'Desconhecido' : null
        };
      });

      // Apply period filter
      const now = new Date();
      if (period !== 'all') {
        const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
        const startDate = subDays(startOfDay(now), days);
        records = records.filter(r => isAfter(parseISO(r.created_at), startDate));
      }

      // Apply technician filter
      if (technicianId) {
        records = records.filter(r => r.assigned_to === technicianId);
      }

      // Calculate stats
      const stats: EscalationStats = {
        total: records.length,
        escalations: records.filter(r => r.notification_type === 'escalation').length,
        overdueWarnings: records.filter(r => r.notification_type === 'overdue_warning').length,
        criticalWarnings: records.filter(r => r.notification_type === 'critical_warning').length
      };

      return { records, stats };
    },
    refetchInterval: 60000
  });
};

export const getNotificationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    escalation: 'Escalonamento',
    overdue_warning: 'Alerta de Atraso',
    critical_warning: 'Alerta Crítico'
  };
  return labels[type] || type;
};

export const getNotificationTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    escalation: 'bg-amber-500',
    overdue_warning: 'bg-red-500',
    critical_warning: 'bg-red-700'
  };
  return colors[type] || 'bg-gray-500';
};

export const getPriorityLabel = (priority: string | null): string => {
  if (!priority) return '-';
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[priority] || priority;
};
