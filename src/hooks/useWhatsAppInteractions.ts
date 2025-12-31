import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppInteraction {
  id: string;
  phone_number: string;
  message_received: string;
  command: string | null;
  args: string | null;
  response_sent: string | null;
  response_status: string | null;
  processing_time_ms: number | null;
  is_group: boolean;
  group_id: string | null;
  created_at: string;
}

export interface InteractionFilters {
  startDate?: Date;
  endDate?: Date;
  command?: string;
  phoneSearch?: string;
}

export interface InteractionStats {
  total: number;
  success: number;
  error: number;
  avgProcessingTime: number;
  commandCounts: Record<string, number>;
}

export function useWhatsAppInteractions(filters: InteractionFilters = {}) {
  const { data: interactions, isLoading, error, refetch } = useQuery({
    queryKey: ['whatsapp-interactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }
      if (filters.command && filters.command !== 'all') {
        query = query.eq('command', filters.command);
      }
      if (filters.phoneSearch) {
        query = query.ilike('phone_number', `%${filters.phoneSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppInteraction[];
    },
  });

  // Calculate stats
  const stats: InteractionStats = {
    total: interactions?.length || 0,
    success: interactions?.filter(i => i.response_status === 'success').length || 0,
    error: interactions?.filter(i => i.response_status === 'error').length || 0,
    avgProcessingTime: interactions?.length 
      ? Math.round(
          interactions
            .filter(i => i.processing_time_ms)
            .reduce((sum, i) => sum + (i.processing_time_ms || 0), 0) / 
          interactions.filter(i => i.processing_time_ms).length || 1
        )
      : 0,
    commandCounts: {},
  };

  // Count commands
  interactions?.forEach(i => {
    if (i.command) {
      stats.commandCounts[i.command] = (stats.commandCounts[i.command] || 0) + 1;
    }
  });

  return {
    interactions: interactions || [],
    isLoading,
    error,
    refetch,
    stats,
  };
}

export function useInteractionCommands() {
  const { data } = useQuery({
    queryKey: ['whatsapp-interaction-commands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_interactions')
        .select('command')
        .not('command', 'is', null);

      if (error) throw error;

      const commands = [...new Set(data.map(d => d.command).filter(Boolean))];
      return commands.sort();
    },
  });

  return data || [];
}
