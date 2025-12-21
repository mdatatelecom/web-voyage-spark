import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppNotification {
  id: string;
  ticket_id: string | null;
  phone_number: string;
  message_content: string;
  message_type: string;
  status: string | null;
  error_message: string | null;
  external_id: string | null;
  sent_at: string | null;
  created_at: string | null;
  ticket?: {
    ticket_number: string;
    title: string;
  } | null;
}

export interface WhatsAppHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: 'all' | 'sent' | 'error' | 'pending';
  phoneSearch?: string;
  ticketId?: string;
  messageType?: 'all' | 'notification' | 'test' | 'alert' | 'manual';
}

export const useWhatsAppHistory = (filters: WhatsAppHistoryFilters = {}) => {
  const { startDate, endDate, status, phoneSearch, ticketId, messageType } = filters;

  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp-history', startDate, endDate, status, phoneSearch, ticketId, messageType],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_notifications')
        .select(`
          *,
          ticket:support_tickets!whatsapp_notifications_ticket_id_fkey (
            ticket_number,
            title
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (phoneSearch) {
        query = query.ilike('phone_number', `%${phoneSearch}%`);
      }

      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }

      if (messageType && messageType !== 'all') {
        query = query.eq('message_type', messageType);
      }

      // Limit to 500 records for performance
      query = query.limit(500);

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppNotification[];
    },
  });

  // Get stats for the filtered period
  const stats = notifications ? {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    error: notifications.filter(n => n.status === 'error').length,
    pending: notifications.filter(n => n.status === 'pending').length,
  } : { total: 0, sent: 0, error: 0, pending: 0 };

  return {
    notifications: notifications || [],
    isLoading,
    error,
    refetch,
    stats,
  };
};

export const useResendWhatsApp = () => {
  const resend = async (notificationId: string) => {
    // Get the original notification
    const { data: notification, error: fetchError } = await supabase
      .from('whatsapp_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      throw new Error('Notificação não encontrada');
    }

    // Call edge function to resend
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        action: 'send',
        phone: notification.phone_number,
        message: notification.message_content,
        ticketId: notification.ticket_id,
        resendFromId: notificationId,
      },
    });

    if (error) throw error;
    return data;
  };

  return { resend };
};
