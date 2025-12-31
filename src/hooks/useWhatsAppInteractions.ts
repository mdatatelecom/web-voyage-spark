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
  page?: number;
  pageSize?: number;
}

export interface InteractionStats {
  total: number;
  success: number;
  error: number;
  avgProcessingTime: number;
  commandCounts: Record<string, number>;
}

export function useWhatsAppInteractions(filters: InteractionFilters = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  // Query for paginated interactions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['whatsapp-interactions', filters],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('whatsapp_interactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

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

      const { data, error, count } = await query;
      if (error) throw error;
      return { 
        interactions: data as WhatsAppInteraction[], 
        totalCount: count || 0 
      };
    },
  });

  // Separate query for stats (considers all filtered records, not just current page)
  const { data: statsData } = useQuery({
    queryKey: ['whatsapp-interactions-stats', { 
      startDate: filters.startDate, 
      endDate: filters.endDate, 
      command: filters.command, 
      phoneSearch: filters.phoneSearch 
    }],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_interactions')
        .select('response_status, processing_time_ms, command');

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
      return data;
    },
  });

  // Calculate stats from all filtered records
  const stats: InteractionStats = {
    total: statsData?.length || 0,
    success: statsData?.filter(i => i.response_status === 'success').length || 0,
    error: statsData?.filter(i => i.response_status === 'error').length || 0,
    avgProcessingTime: statsData?.length 
      ? Math.round(
          statsData
            .filter(i => i.processing_time_ms)
            .reduce((sum, i) => sum + (i.processing_time_ms || 0), 0) / 
          (statsData.filter(i => i.processing_time_ms).length || 1)
        )
      : 0,
    commandCounts: {},
  };

  // Count commands
  statsData?.forEach(i => {
    if (i.command) {
      stats.commandCounts[i.command] = (stats.commandCounts[i.command] || 0) + 1;
    }
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    interactions: data?.interactions || [],
    isLoading,
    error,
    refetch,
    stats,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
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
