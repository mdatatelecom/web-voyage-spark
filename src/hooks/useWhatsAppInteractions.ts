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

export interface TrendDataPoint {
  label: string;
  count: number;
}

export interface TrendData {
  hourly: TrendDataPoint[];
  daily: TrendDataPoint[];
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

  // Query for trend data (hourly and daily distribution)
  const { data: trendData, isLoading: isTrendLoading, error: trendError } = useQuery({
    queryKey: ['whatsapp-interactions-trend', filters.startDate?.toISOString(), filters.endDate?.toISOString()],
    queryFn: async () => {
      console.log('📊 Fetching trend data...');
      
      let query = supabase
        .from('whatsapp_interactions')
        .select('created_at, response_status')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      
      console.log('📊 Trend data result:', { count: data?.length, error });
      
      if (error) throw error;

      // Group by hour
      const hourlyMap: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        hourlyMap[`${i.toString().padStart(2, '0')}h`] = 0;
      }

      // Group by day of week
      const dayOrder = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      const dailyMap: Record<string, number> = {
        'dom': 0, 'seg': 0, 'ter': 0, 'qua': 0, 'qui': 0, 'sex': 0, 'sáb': 0
      };

      data?.forEach(item => {
        const date = new Date(item.created_at);
        const hour = `${date.getHours().toString().padStart(2, '0')}h`;
        const dayIndex = date.getDay();
        const day = dayOrder[dayIndex];

        hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      });

      const hourly: TrendDataPoint[] = Object.entries(hourlyMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => parseInt(a.label) - parseInt(b.label));

      const daily: TrendDataPoint[] = dayOrder.map(day => ({
        label: day,
        count: dailyMap[day]
      }));

      return { hourly, daily };
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
    trendData: trendData as TrendData | undefined,
    isTrendLoading,
    trendError,
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
