import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { getCategoryLabel, getPriorityLabel, getStatusLabel } from '@/constants/ticketTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Padronização de toasts
const TOAST_DURATION = {
  ticketSuccess: 6000,
  waSuccess: 3500,
  waInfo: 4000,
  waWarning: 7000,
} as const;

type WaResult = { success?: boolean; queued?: boolean; message?: string } | null | undefined;

const notifyWhatsAppResult = (
  channel: string,
  result: WaResult,
  invokeError?: { message?: string } | null
) => {
  if (!invokeError && result?.success) {
    sonnerToast.success(`Notificação WhatsApp enviada (${channel})`, { duration: TOAST_DURATION.waSuccess });
    return;
  }
  const reason = result?.message || invokeError?.message || 'Falha desconhecida';
  if (result?.queued) {
    sonnerToast.info(`WhatsApp em fila (${channel}) — será reenviado automaticamente`, {
      description: reason,
      duration: TOAST_DURATION.waInfo,
    });
    return;
  }
  sonnerToast.warning(`Falha no WhatsApp (${channel})`, {
    description: reason,
    duration: TOAST_DURATION.waWarning,
  });
};

// Helper to truncate description
const truncateDescription = (text: string, maxLength: number = 200): string => {
  if (!text) return 'Não informada';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Helper to fetch creator name
const fetchCreatorName = async (userId?: string | null): Promise<string> => {
  if (!userId) return 'Sistema';
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  return data?.full_name?.trim() || 'Usuário';
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
  equipmentName?: string,
  creatorName?: string
): string => {
  if (type === 'new') {
    let message = `🔔 *Novo Chamado Aberto*\n\n`;
    message += `📋 Chamado: *${data.ticket_number}*\n`;
    message += `📝 Título: ${data.title}\n`;
    message += `🏷️ Categoria: ${getCategoryLabel(data.category)}\n`;
    message += `⚠️ Prioridade: ${getPriorityLabel(data.priority)}\n`;
    if (creatorName) {
      message += `👤 Criado por: ${creatorName}\n`;
    }

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
    if (creatorName) {
      message += `👤 Criado por: ${creatorName}\n`;
    }
    message += `\n${statusText}\n\n`;
    message += `🔗 Para mais detalhes, acesse o sistema.`;

    return message;
  }
};

/**
 * Resolve qual grupo do WhatsApp deve receber a notificação de um chamado.
 * Ordem: 1) grupo do próprio chamado → 2) grupo padrão da categoria → 3) grupo padrão das configurações globais.
 * Retorna null se WhatsApp estiver desabilitado ou nenhum grupo configurado.
 */
const resolveTicketWhatsAppGroup = async (
  ticket: { whatsapp_group_id?: string | null; category?: string | null }
): Promise<string | null> => {
  // 1) Grupo escolhido no próprio chamado
  if (ticket.whatsapp_group_id) return ticket.whatsapp_group_id;

  // 2) Grupo padrão da categoria
  if (ticket.category) {
    const { data: cat } = await supabase
      .from('ticket_categories')
      .select('whatsapp_group_id')
      .eq('slug', ticket.category)
      .maybeSingle();
    if ((cat as any)?.whatsapp_group_id) return (cat as any).whatsapp_group_id as string;
  }

  // 3) Configurações globais
  const { data: settingsData } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'whatsapp_settings')
    .maybeSingle();

  const ws = settingsData?.setting_value as {
    isEnabled?: boolean | string;
    targetType?: 'individual' | 'group';
    selectedGroupId?: string | null;
  } | null;

  const isEnabled = ws?.isEnabled === true || ws?.isEnabled === 'true';
  if (isEnabled && ws?.targetType === 'group' && ws.selectedGroupId) {
    return ws.selectedGroupId;
  }
  return null;
};

export type Ticket = Tables<'support_tickets'> & {
  assignee_name?: string | null;
  assignee_avatar_url?: string | null;
};
export type TicketInsert = TablesInsert<'support_tickets'>;
export type TicketUpdate = TablesUpdate<'support_tickets'>;
export type TicketComment = Tables<'ticket_comments'>;

export const useTickets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      
      // Fetch assignee names and avatars for tickets that have assigned_to
      const ticketsWithAssignees = await Promise.all(
        (data || []).map(async (ticket) => {
          if (ticket.assigned_to) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', ticket.assigned_to)
              .maybeSingle();
            return { 
              ...ticket, 
              assignee_name: profile?.full_name || null,
              assignee_avatar_url: profile?.avatar_url || null
            };
          }
          return { ...ticket, assignee_name: null, assignee_avatar_url: null };
        })
      );
      
      return ticketsWithAssignees as Ticket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (ticket: TicketInsert) => {
      // Retry up to 3 times if a unique-violation on ticket_number sneaks through
      let lastError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('support_tickets')
          .insert([ticket])
          .select()
          .single();

        if (!error) return data;

        const isDuplicateTicketNumber =
          (error as any)?.code === '23505' &&
          ((error as any)?.message?.includes('ticket_number') ||
            (error as any)?.details?.includes('ticket_number'));

        lastError = error;
        if (!isDuplicateTicketNumber) break;
        // small backoff before retry
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
      throw lastError;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      // 1) Toast principal — confirma criação no banco com o número gerado + ação rápida
      sonnerToast.success(`Chamado ${data.ticket_number} aberto`, {
        description: data.title,
        duration: TOAST_DURATION.ticketSuccess,
        action: {
          label: 'Ver chamado',
          onClick: () => navigate(`/tickets/${data.id}`),
        },
      });

      // Fetch related names for detailed message
      const [{ buildingName, equipmentName }, creatorName] = await Promise.all([
        fetchRelatedNames(data.related_building_id, data.related_equipment_id),
        fetchCreatorName(data.created_by),
      ]);

      const message = buildTicketMessage(data, 'new', undefined, buildingName, equipmentName, creatorName);

      // 2) Notificação para grupo do WhatsApp
      try {
        const groupId = await resolveTicketWhatsAppGroup({
          whatsapp_group_id: (data as any).whatsapp_group_id,
          category: data.category,
        });
        if (groupId) {
          const { data: waData, error: waError } = await supabase.functions.invoke('send-whatsapp', {
            body: { action: 'send-group', groupId, message, ticketId: data.id },
          });
          notifyWhatsAppResult('grupo', waData as WaResult, waError);
        } else {
          sonnerToast.info('Nenhum grupo WhatsApp configurado para este chamado', {
            duration: TOAST_DURATION.waInfo,
          });
        }
      } catch (err) {
        notifyWhatsAppResult('grupo', null, { message: err instanceof Error ? err.message : 'Erro de rede' });
      }

      // 3) Envio individual para o contato
      if (data.contact_phone) {
        try {
          const { data: waData, error: waError } = await supabase.functions.invoke('send-whatsapp', {
            body: { action: 'send', phone: data.contact_phone, message, ticketId: data.id },
          });
          notifyWhatsAppResult(`contato ${data.contact_phone}`, waData as WaResult, waError);
        } catch (err) {
          notifyWhatsAppResult(`contato ${data.contact_phone}`, null, {
            message: err instanceof Error ? err.message : 'Erro de rede',
          });
        }
      }
    },
    onError: (error: any) => {
      console.error('Error creating ticket:', error);
      const isDuplicate =
        error?.code === '23505' &&
        (error?.message?.includes('ticket_number') || error?.details?.includes('ticket_number'));
      toast({
        title: 'Erro ao criar chamado',
        description: isDuplicate
          ? 'Não foi possível gerar um número único para o chamado. Aguarde alguns segundos e tente novamente.'
          : 'Não foi possível criar o chamado.',
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
      sonnerToast.success(`Chamado ${data.ticket_number} atualizado`, {
        description: data.title,
        duration: TOAST_DURATION.ticketSuccess,
        action: {
          label: 'Ver chamado',
          onClick: () => navigate(`/tickets/${data.id}`),
        },
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
            .select('full_name, avatar_url')
            .eq('id', updatedFields.assigned_to)
            .maybeSingle();
          assignedTechName = techProfile?.full_name || 'Técnico';
          changes.push(`👨‍🔧 Técnico atribuído: *${assignedTechName}*.`);

          // Auto-fetch WhatsApp profile picture if technician doesn't have avatar
          if (!techProfile?.avatar_url && updatedFields.technician_phone) {
            try {
              console.log('📸 [UPDATE] Fetching WhatsApp profile picture for technician:', updatedFields.technician_phone);
              const { data: pictureData } = await supabase.functions.invoke('send-whatsapp', {
                body: { action: 'fetch-profile-picture', phone: updatedFields.technician_phone },
              });
              
              if (pictureData?.profilePictureUrl) {
                await supabase
                  .from('profiles')
                  .update({ avatar_url: pictureData.profilePictureUrl })
                  .eq('id', updatedFields.assigned_to);
                console.log('✅ [UPDATE] Technician avatar updated automatically');
              }
            } catch (avatarErr) {
              console.error('Error fetching WhatsApp profile picture:', avatarErr);
            }
          }
        } catch {
          assignedTechName = 'Técnico';
          changes.push(`👨‍🔧 Técnico atribuído ao chamado.`);
        }
      }

      // Only send notification if there are changes to report
      if (changes.length > 0) {
        const statusText = changes.join('\n');
        const creatorName = await fetchCreatorName(data.created_by);
        const message = buildTicketMessage(data, 'update', statusText, undefined, undefined, creatorName);

        // Resolve grupo do WhatsApp (chamado → categoria → padrão global)
        try {
          const groupId = await resolveTicketWhatsAppGroup({
            whatsapp_group_id: (data as any).whatsapp_group_id,
            category: data.category,
          });
          if (groupId) {
            const { data: waData, error: waError } = await supabase.functions.invoke('send-whatsapp', {
              body: { action: 'send-group', groupId, message, ticketId: data.id },
            });
            notifyWhatsAppResult('grupo', waData as WaResult, waError);
          }
        } catch (err) {
          notifyWhatsAppResult('grupo', null, { message: err instanceof Error ? err.message : 'Erro de rede' });
        }

        // Send to individual contact if phone exists
        if (data.contact_phone) {
          try {
            const { data: waData, error: waError } = await supabase.functions.invoke('send-whatsapp', {
              body: { action: 'send', phone: data.contact_phone, message, ticketId: data.id },
            });
            notifyWhatsAppResult(`contato ${data.contact_phone}`, waData as WaResult, waError);
          } catch (err) {
            notifyWhatsAppResult(`contato ${data.contact_phone}`, null, {
              message: err instanceof Error ? err.message : 'Erro de rede',
            });
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
          } catch (err) {
            console.error('Error sending client assignment notification:', err);
          }
        }

        // Send direct notification to assigned technician
        if (updatedFields.assigned_to && updatedFields.technician_phone) {
          const techCreatorName = await fetchCreatorName(data.created_by);
          const technicianMessage = `🔧 *Chamado Atribuído a Você!*\n\n` +
            `📋 Chamado: *${data.ticket_number}*\n` +
            `📝 Título: ${data.title}\n` +
            `🏷️ Categoria: ${getCategoryLabel(data.category)}\n` +
            `⚠️ Prioridade: ${getPriorityLabel(data.priority)}\n` +
            `👤 Criado por: ${techCreatorName}\n` +
            `${data.contact_phone ? `📞 Contato: ${data.contact_phone}\n` : ''}` +
            `\n📄 *Descrição:*\n${truncateDescription(data.description)}\n\n` +
            `⚡ Por favor, inicie o atendimento o mais breve possível!`;

          try {
            const { data: waData, error: waError } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send',
                phone: updatedFields.technician_phone,
                message: technicianMessage,
                ticketId: data.id,
              },
            });
            notifyWhatsAppResult(`técnico ${updatedFields.technician_phone}`, waData as WaResult, waError);
          } catch (err) {
            notifyWhatsAppResult(`técnico ${updatedFields.technician_phone}`, null, {
              message: err instanceof Error ? err.message : 'Erro de rede',
            });
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
            .select('ticket_number, title, contact_phone, category, whatsapp_group_id')
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

          // Resolve grupo do WhatsApp (chamado → categoria → padrão global)
          const groupId = await resolveTicketWhatsAppGroup({
            whatsapp_group_id: (ticketData as any).whatsapp_group_id,
            category: (ticketData as any).category,
          });
          if (groupId) {
            console.log('📨 [COMMENT] Sending notification to WhatsApp group:', groupId);
            await supabase.functions.invoke('send-whatsapp', {
              body: { action: 'send-group', groupId, message, ticketId },
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
          
          // Show toast for new WhatsApp comments
          if (payload.eventType === 'INSERT' && (payload.new as any)?.source === 'whatsapp') {
            const senderName = (payload.new as any)?.whatsapp_sender_name || 'WhatsApp';
            sonnerToast.info(`💬 Novo comentário via WhatsApp de ${senderName}`, {
              duration: 6000,
            });
          }
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
