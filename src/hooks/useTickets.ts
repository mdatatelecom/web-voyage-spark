import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Ticket = Tables<'support_tickets'>;
export type TicketInsert = TablesInsert<'support_tickets'>;
export type TicketUpdate = TablesUpdate<'support_tickets'>;
export type TicketComment = Tables<'ticket_comments'>;

export const useTickets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (ticket: TicketInsert) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticket])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Chamado criado',
        description: 'O chamado foi criado com sucesso.',
      });

      // Send WhatsApp notification if contact_phone is provided
      if (data.contact_phone) {
        try {
          const message = `🔔 *Novo Chamado Aberto*\n\n` +
            `Chamado: *${data.ticket_number}*\n` +
            `Título: ${data.title}\n` +
            `Prioridade: ${data.priority}\n\n` +
            `Seu chamado foi registrado com sucesso. Em breve entraremos em contato.\n\n` +
            `Para mais detalhes, acesse o sistema.`;

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              action: 'send',
              phone: data.contact_phone,
              message,
              ticketId: data.id,
            },
          });
        } catch (err) {
          console.error('Error sending WhatsApp notification for new ticket:', err);
          // Don't show error toast - WhatsApp notification is optional
        }
      }
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro ao criar chamado',
        description: 'Não foi possível criar o chamado.',
        variant: 'destructive',
      });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: TicketUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, updatedFields: updates };
    },
    onSuccess: async ({ data, updatedFields }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Chamado atualizado',
        description: 'O chamado foi atualizado com sucesso.',
      });

      // Send WhatsApp notification if status was changed and contact_phone exists
      if (updatedFields.status && data.contact_phone) {
        try {
          const statusMessages: Record<string, string> = {
            open: 'foi reaberto',
            in_progress: 'está em andamento',
            resolved: 'foi resolvido',
            closed: 'foi fechado',
          };
          
          const statusText = statusMessages[updatedFields.status] || `teve o status alterado para ${updatedFields.status}`;
          
          const message = `🔔 *Atualização de Chamado*\n\n` +
            `Chamado: *${data.ticket_number}*\n` +
            `Título: ${data.title}\n\n` +
            `O chamado ${statusText}.\n\n` +
            `Para mais detalhes, acesse o sistema.`;

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              action: 'send',
              phone: data.contact_phone,
              message,
              ticketId: data.id,
            },
          });
        } catch (err) {
          console.error('Error sending WhatsApp notification for ticket update:', err);
          // Don't show error toast - WhatsApp notification is optional
        }
      }
    },
    onError: (error) => {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Erro ao atualizar chamado',
        description: 'Não foi possível atualizar o chamado.',
        variant: 'destructive',
      });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Chamado excluído',
        description: 'O chamado foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Erro ao excluir chamado',
        description: 'Não foi possível excluir o chamado.',
        variant: 'destructive',
      });
    },
  });

  return {
    tickets,
    isLoading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
  };
};

export const useTicket = (ticketId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!ticketId,
  });

  const {
    data: comments,
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketComment[];
    },
    enabled: !!ticketId,
  });

  const addComment = useMutation({
    mutationFn: async ({ comment, isInternal = false }: { comment: string; isInternal?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ticket_comments')
        .insert([{
          ticket_id: ticketId,
          user_id: user.id,
          comment,
          is_internal: isInternal,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      toast({
        title: 'Comentário adicionado',
        description: 'O comentário foi adicionado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro ao adicionar comentário',
        description: 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      });
    },
  });

  return {
    ticket,
    comments,
    isLoading,
    commentsLoading,
    error,
    addComment,
  };
};
