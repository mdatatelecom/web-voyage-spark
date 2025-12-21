import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { getCategoryLabel, getPriorityLabel, getStatusLabel } from '@/constants/ticketTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper to truncate description
const truncateDescription = (text: string, maxLength: number = 200): string => {
  if (!text) return 'Não informada';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Helper to fetch related entity names
const fetchRelatedNames = async (buildingId?: string | null, equipmentId?: string | null) => {
  let buildingName = '';
  let equipmentName = '';

  if (buildingId) {
    const { data } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .maybeSingle();
    buildingName = data?.name || '';
  }

  if (equipmentId) {
    const { data } = await supabase
      .from('equipment')
      .select('name')
      .eq('id', equipmentId)
      .maybeSingle();
    equipmentName = data?.name || '';
  }

  return { buildingName, equipmentName };
};

// Build detailed WhatsApp message for ticket
const buildTicketMessage = (
  data: Tables<'support_tickets'>,
  type: 'new' | 'update',
  statusText?: string,
  buildingName?: string,
  equipmentName?: string
): string => {
  if (type === 'new') {
    let message = `🔔 *Novo Chamado Aberto*\n\n`;
    message += `📋 Chamado: *${data.ticket_number}*\n`;
    message += `📝 Título: ${data.title}\n`;
    message += `🏷️ Categoria: ${getCategoryLabel(data.category)}\n`;
    message += `⚠️ Prioridade: ${getPriorityLabel(data.priority)}\n`;
    
    if (buildingName) {
      message += `📍 Local: ${buildingName}\n`;
    }
    if (equipmentName) {
      message += `🔧 Equipamento: ${equipmentName}\n`;
    }
    if (data.due_date) {
      message += `📅 Prazo: ${format(new Date(data.due_date), "dd/MM/yyyy", { locale: ptBR })}\n`;
    }
    if (data.contact_phone) {
      message += `📞 Contato: ${data.contact_phone}\n`;
    }
    
    message += `\n📄 *Descrição:*\n${truncateDescription(data.description)}\n\n`;
    message += `🔗 Para mais detalhes, acesse o sistema.`;
    
    return message;
  } else {
    let message = `🔔 *Atualização de Chamado*\n\n`;
    message += `📋 Chamado: *${data.ticket_number}*\n`;
    message += `📝 Título: ${data.title}\n`;
    message += `\n${statusText}\n\n`;
    message += `🔗 Para mais detalhes, acesse o sistema.`;
    
    return message;
  }
};

export type Ticket = Tables<'support_tickets'> & {
  assignee_name?: string | null;
};
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
      
      // Fetch assignee names for tickets that have assigned_to
      const ticketsWithAssignees = await Promise.all(
        (data || []).map(async (ticket) => {
          if (ticket.assigned_to) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', ticket.assigned_to)
              .maybeSingle();
            return { ...ticket, assignee_name: profile?.full_name || null };
          }
          return { ...ticket, assignee_name: null };
        })
      );
      
      return ticketsWithAssignees as Ticket[];
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

      // Fetch related names for detailed message
      const { buildingName, equipmentName } = await fetchRelatedNames(
        data.related_building_id,
        data.related_equipment_id
      );

      const message = buildTicketMessage(data, 'new', undefined, buildingName, equipmentName);

      // Check for WhatsApp settings to send to group
      try {
        console.log('🔍 [CREATE] Fetching WhatsApp settings for group notification...');
        
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'whatsapp_settings')
          .maybeSingle();

        console.log('🔍 [CREATE] WhatsApp settings query result:', { 
          settingsData, 
          settingsError,
          rawValue: settingsData?.setting_value 
        });

        if (settingsError) {
          console.error('❌ [CREATE] Error fetching WhatsApp settings:', settingsError);
          return;
        }

        const whatsAppSettings = settingsData?.setting_value as {
          isEnabled?: boolean | string;
          targetType?: 'individual' | 'group';
          selectedGroupId?: string | null;
        } | null;

        // Fix: Handle both boolean and string types for isEnabled
        const isEnabled = whatsAppSettings?.isEnabled === true || 
                          whatsAppSettings?.isEnabled === 'true';

        console.log('🔍 [CREATE] Parsed WhatsApp settings:', {
          isEnabled,
          isEnabledRaw: whatsAppSettings?.isEnabled,
          isEnabledType: typeof whatsAppSettings?.isEnabled,
          targetType: whatsAppSettings?.targetType,
          selectedGroupId: whatsAppSettings?.selectedGroupId,
          shouldSendToGroup: !!(isEnabled && 
            whatsAppSettings?.targetType === 'group' && 
            whatsAppSettings?.selectedGroupId)
        });

        // Send to group if configured
        if (isEnabled && 
            whatsAppSettings?.targetType === 'group' && 
            whatsAppSettings?.selectedGroupId) {
          console.log('✅ [CREATE] Sending ticket notification to WhatsApp group:', whatsAppSettings.selectedGroupId);
          
          const result = await supabase.functions.invoke('send-whatsapp', {
            body: {
              action: 'send-group',
              groupId: whatsAppSettings.selectedGroupId,
              message,
              ticketId: data.id,
            },
          });
          
          console.log('📨 [CREATE] WhatsApp group notification result:', result);
        } else {
          console.log('⚠️ [CREATE] Not sending to group. Conditions not met:', {
            isEnabled,
            targetType: whatsAppSettings?.targetType,
            selectedGroupId: whatsAppSettings?.selectedGroupId,
          });
        }
      } catch (err) {
        console.error('❌ [CREATE] Error sending WhatsApp group notification for new ticket:', err);
      }

      // Send to individual contact if phone is provided
      if (data.contact_phone) {
        try {
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

      // Build notification messages based on what changed
      const changes: string[] = [];

      // Status change
      if (updatedFields.status) {
        const statusMessages: Record<string, string> = {
          open: '🔵 Status alterado para *Aberto*.',
          in_progress: '🟡 Status alterado para *Em Andamento*.',
          resolved: '🟢 Status alterado para *Resolvido*.',
          closed: '⚫ Status alterado para *Fechado*.',
        };
        changes.push(statusMessages[updatedFields.status] || `Status alterado para ${updatedFields.status}.`);
      }

      // Priority change
      if (updatedFields.priority) {
        const priorityLabels: Record<string, string> = {
          low: 'Baixa',
          medium: 'Média',
          high: 'Alta',
          critical: 'Crítica'
        };
        changes.push(`⚠️ Prioridade alterada para *${priorityLabels[updatedFields.priority] || updatedFields.priority}*.`);
      }

      // Technician assigned
      let assignedTechName = '';
      if (updatedFields.assigned_to) {
        try {
          const { data: techProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', updatedFields.assigned_to)
            .maybeSingle();
          assignedTechName = techProfile?.full_name || 'Técnico';
          changes.push(`👨‍🔧 Técnico atribuído: *${assignedTechName}*.`);
        } catch {
          assignedTechName = 'Técnico';
          changes.push(`👨‍🔧 Técnico atribuído ao chamado.`);
        }
      }

      // Only send notification if there are changes to report
      if (changes.length > 0) {
        const statusText = changes.join('\n');
        const message = buildTicketMessage(data, 'update', statusText);

        // Check for WhatsApp settings to send to group
        try {
          console.log('🔍 [UPDATE] Fetching WhatsApp settings for group notification...');
          
          const { data: settingsData, error: settingsError } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'whatsapp_settings')
            .maybeSingle();

          console.log('🔍 [UPDATE] WhatsApp settings query result:', { 
            settingsData, 
            settingsError,
            rawValue: settingsData?.setting_value 
          });

          if (settingsError) {
            console.error('❌ [UPDATE] Error fetching WhatsApp settings:', settingsError);
            return;
          }

          const whatsAppSettings = settingsData?.setting_value as {
            isEnabled?: boolean | string;
            targetType?: 'individual' | 'group';
            selectedGroupId?: string | null;
          } | null;

          // Fix: Handle both boolean and string types for isEnabled
          const isEnabled = whatsAppSettings?.isEnabled === true || 
                            whatsAppSettings?.isEnabled === 'true';

          console.log('🔍 [UPDATE] Parsed WhatsApp settings:', {
            isEnabled,
            isEnabledRaw: whatsAppSettings?.isEnabled,
            isEnabledType: typeof whatsAppSettings?.isEnabled,
            targetType: whatsAppSettings?.targetType,
            selectedGroupId: whatsAppSettings?.selectedGroupId,
            shouldSendToGroup: !!(isEnabled && 
              whatsAppSettings?.targetType === 'group' && 
              whatsAppSettings?.selectedGroupId)
          });

          // Send to group if configured
          if (isEnabled && 
              whatsAppSettings?.targetType === 'group' && 
              whatsAppSettings?.selectedGroupId) {
            console.log('✅ [UPDATE] Sending ticket update notification to WhatsApp group:', whatsAppSettings.selectedGroupId);
            
            const result = await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send-group',
                groupId: whatsAppSettings.selectedGroupId,
                message,
                ticketId: data.id,
              },
            });
            
            console.log('📨 [UPDATE] WhatsApp group notification result:', result);
          } else {
            console.log('⚠️ [UPDATE] Not sending to group. Conditions not met:', {
              isEnabled,
              targetType: whatsAppSettings?.targetType,
              selectedGroupId: whatsAppSettings?.selectedGroupId,
            });
          }
        } catch (err) {
          console.error('❌ [UPDATE] Error sending WhatsApp group notification for ticket update:', err);
        }

        // Send to individual contact if phone exists
        if (data.contact_phone) {
          try {
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
          }
        }

        // Send specific notification to client when technician is assigned via web system
        if (updatedFields.assigned_to && data.contact_phone && assignedTechName) {
          const clientAssignmentMessage = `📢 *Seu Chamado Recebeu um Técnico!*\n\n` +
            `📋 Chamado: *${data.ticket_number}*\n` +
            `📝 ${data.title}\n\n` +
            `👨‍🔧 Técnico Atribuído: *${assignedTechName}*\n` +
            `${getStatusLabel(data.status)}\n\n` +
            `O técnico entrará em contato em breve!\n\n` +
            `💡 Qualquer dúvida, responda esta mensagem.`;
          
          try {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send',
                phone: data.contact_phone,
                message: clientAssignmentMessage,
                ticketId: data.id,
              },
            });
            console.log('✅ [UPDATE] Client notified about technician assignment');
          } catch (err) {
            console.error('Error sending client assignment notification:', err);
          }
        }
      } // End of changes.length > 0 check
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
    refetch,
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
      return { data, isInternal, userId: user.id };
    },
    onSuccess: async ({ data, isInternal, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      toast({
        title: 'Comentário adicionado',
        description: 'O comentário foi adicionado com sucesso.',
      });

      // Send WhatsApp notification if not internal comment
      if (!isInternal) {
        try {
          // Get ticket info
          const { data: ticketData } = await supabase
            .from('support_tickets')
            .select('ticket_number, title, contact_phone')
            .eq('id', ticketId)
            .single();

          if (!ticketData) return;

          // Get user profile for name
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();

          const techName = userProfile?.full_name || 'Técnico';
          const commentPreview = data.comment.substring(0, 100) + (data.comment.length > 100 ? '...' : '');
          
          const message = 
            `💬 *Novo Comentário no Chamado*\n\n` +
            `📋 Chamado: *${ticketData.ticket_number}*\n` +
            `📝 Título: ${ticketData.title}\n\n` +
            `👨‍🔧 Comentário de: *${techName}*\n` +
            `💬 "${commentPreview}"\n\n` +
            `🔗 Para mais detalhes, acesse o sistema.`;

          // Check WhatsApp settings for group notification
          const { data: settingsData } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'whatsapp_settings')
            .maybeSingle();

          const whatsAppSettings = settingsData?.setting_value as {
            isEnabled?: boolean | string;
            targetType?: 'individual' | 'group';
            selectedGroupId?: string | null;
          } | null;

          const isEnabled = whatsAppSettings?.isEnabled === true || 
                            whatsAppSettings?.isEnabled === 'true';

          // Send to group if configured
          if (isEnabled && 
              whatsAppSettings?.targetType === 'group' && 
              whatsAppSettings?.selectedGroupId) {
            console.log('📨 [COMMENT] Sending notification to WhatsApp group');
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send-group',
                groupId: whatsAppSettings.selectedGroupId,
                message,
                ticketId,
              },
            });
          }

          // Send to individual contact if phone exists
          if (ticketData.contact_phone) {
            console.log('📨 [COMMENT] Sending notification to contact:', ticketData.contact_phone);
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send',
                phone: ticketData.contact_phone,
                message,
                ticketId,
              },
            });
          }
        } catch (err) {
          console.error('❌ [COMMENT] Error sending WhatsApp notification:', err);
          // Don't show error - notification is optional
        }
      }
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

  // Realtime subscriptions for ticket and comments updates
  useEffect(() => {
    if (!ticketId) return;

    // Subscribe to ticket changes (for attachments, status, etc.)
    const ticketChannel = supabase
      .channel(`ticket-realtime-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          console.log('🔔 Ticket updated via realtime:', payload);
          queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel(`ticket-comments-realtime-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('🔔 Comment added/updated via realtime:', payload);
          queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [ticketId, queryClient]);

  return {
    ticket,
    comments,
    isLoading,
    commentsLoading,
    error,
    addComment,
    refetch,
  };
};
