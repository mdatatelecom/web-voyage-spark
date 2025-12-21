import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettings } from './useWhatsAppSettings';

export const useWhatsApp = () => {
  const { toast } = useToast();
  const { settings, isLoading } = useWhatsAppSettings();

  const formatPhoneNumber = (phone: string, countryCode: string = '55'): string => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If doesn't start with country code, add it
    if (!cleaned.startsWith(countryCode)) {
      cleaned = countryCode + cleaned;
    }
    
    return cleaned;
  };

  const sendMessage = async (
    phone: string,
    message: string,
    ticketId?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!settings.isEnabled) {
      return { success: false, message: 'Integração WhatsApp não está habilitada' };
    }

    if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
      return { success: false, message: 'Configurações do WhatsApp incompletas' };
    }

    try {
      const formattedPhone = formatPhoneNumber(phone, settings.defaultCountryCode);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'send',
          phone: formattedPhone,
          message,
          ticketId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Mensagem enviada',
          description: 'Mensagem do WhatsApp enviada com sucesso.',
        });
        return { success: true, message: 'Mensagem enviada' };
      } else {
        toast({
          title: 'Erro ao enviar',
          description: data?.message || 'Falha ao enviar mensagem',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Falha ao enviar' };
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao enviar',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, message: errorMessage };
    }
  };

  const sendTicketNotification = async (
    phone: string,
    ticketNumber: string,
    ticketTitle: string,
    status: string,
    ticketId: string
  ): Promise<{ success: boolean; message: string }> => {
    const statusMessages: Record<string, string> = {
      open: 'foi aberto',
      in_progress: 'está em andamento',
      resolved: 'foi resolvido',
      closed: 'foi fechado',
    };

    const statusText = statusMessages[status] || `teve seu status alterado para ${status}`;
    
    const message = `🔔 *Atualização de Chamado*\n\n` +
      `Chamado: *${ticketNumber}*\n` +
      `Título: ${ticketTitle}\n\n` +
      `O chamado ${statusText}.\n\n` +
      `Para mais detalhes, acesse o sistema.`;

    return sendMessage(phone, message, ticketId);
  };

  return {
    sendMessage,
    sendTicketNotification,
    isEnabled: settings.isEnabled,
    isLoading,
  };
};
