import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays } from 'date-fns';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

interface UseScanAnalyticsProps {
  period?: AnalyticsPeriod;
  userId?: string;
  deviceType?: string;
  scanMethod?: string;
}

export const useScanAnalytics = ({
  period = '30d',
  userId,
  deviceType,
  scanMethod,
}: UseScanAnalyticsProps = {}) => {
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[period];
  const startDate = startOfDay(subDays(new Date(), days));

  // Total scans com resumo
  const { data: summaryData } = useQuery({
    queryKey: ['scan-analytics-summary', period, userId, deviceType, scanMethod],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: false })
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString());

      if (userId) query = query.eq('user_id', userId);
      if (deviceType) query = query.eq('details->>device_type', deviceType);
      if (scanMethod) query = query.eq('details->>scan_method', scanMethod);

      const { data, count } = await query;

      // Calcular today e average
      const today = data?.filter(
        (log) => new Date(log.created_at).toDateString() === new Date().toDateString()
      ).length || 0;

      const average = count ? Math.round(count / days) : 0;

      return { total: count || 0, today, average };
    },
  });

  // Scans por data (time series)
  const { data: scansByDate } = useQuery({
    queryKey: ['scan-analytics-by-date', period, userId, deviceType, scanMethod],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('created_at')
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (userId) query = query.eq('user_id', userId);
      if (deviceType) query = query.eq('details->>device_type', deviceType);
      if (scanMethod) query = query.eq('details->>scan_method', scanMethod);

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por data
      const groupedByDate: Record<string, number> = {};
      data?.forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString('pt-BR');
        groupedByDate[date] = (groupedByDate[date] || 0) + 1;
      });

      return Object.entries(groupedByDate).map(([date, count]) => ({
        date,
        count,
      }));
    },
  });

  // Top 10 conexões mais escaneadas
  const { data: topConnections } = useQuery({
    queryKey: ['scan-analytics-top-connections', period, userId],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('connection_id, connections(connection_code)')
        .eq('action', 'qr_code_scanned')
        .not('connection_id', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      // Contar ocorrências por conexão
      const connectionCounts: Record<string, { count: number; code: string }> = {};
      data?.forEach((log: any) => {
        if (log.connection_id) {
          if (!connectionCounts[log.connection_id]) {
            connectionCounts[log.connection_id] = {
              count: 0,
              code: log.connections?.connection_code || 'N/A',
            };
          }
          connectionCounts[log.connection_id].count++;
        }
      });

      return Object.entries(connectionCounts)
        .map(([id, data]) => ({
          connection_id: id,
          connection_code: data.code,
          scan_count: data.count,
        }))
        .sort((a, b) => b.scan_count - a.scan_count)
        .slice(0, 10);
    },
  });

  // Distribuição por hora do dia
  const { data: scansByHour } = useQuery({
    queryKey: ['scan-analytics-by-hour', period, userId],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('created_at')
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString());

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por hora
      const hourCounts = Array(24).fill(0);
      data?.forEach((log) => {
        const hour = new Date(log.created_at).getHours();
        hourCounts[hour]++;
      });

      return hourCounts.map((count, hour) => ({
        hour: `${hour}h`,
        count,
      }));
    },
  });

  // Distribuição por dia da semana
  const { data: scansByDayOfWeek } = useQuery({
    queryKey: ['scan-analytics-by-day', period, userId],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('created_at')
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString());

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayCounts = Array(7).fill(0);
      
      data?.forEach((log) => {
        const day = new Date(log.created_at).getDay();
        dayCounts[day]++;
      });

      return dayCounts.map((count, index) => ({
        day: dayNames[index],
        count,
      }));
    },
  });

  // Scans por usuário
  const { data: scansByUser } = useQuery({
    queryKey: ['scan-analytics-by-user', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('user_id, profiles(full_name)')
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agrupar por usuário
      const userCounts: Record<string, { count: number; name: string }> = {};
      data?.forEach((log: any) => {
        if (!userCounts[log.user_id]) {
          userCounts[log.user_id] = {
            count: 0,
            name: log.profiles?.full_name || 'Usuário Desconhecido',
          };
        }
        userCounts[log.user_id].count++;
      });

      return Object.entries(userCounts)
        .map(([user_id, data]) => ({
          user_id,
          user_name: data.name,
          scan_count: data.count,
        }))
        .sort((a, b) => b.scan_count - a.scan_count)
        .slice(0, 10);
    },
  });

  // Stats de dispositivos e métodos
  const { data: deviceMethodStats } = useQuery({
    queryKey: ['scan-analytics-device-method', period, userId],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('details')
        .eq('action', 'qr_code_scanned')
        .gte('created_at', startDate.toISOString());

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      const deviceCounts: Record<string, number> = {};
      const methodCounts: Record<string, number> = {};

      data?.forEach((log: any) => {
        const deviceType = log.details?.device_type || 'unknown';
        const scanMethod = log.details?.scan_method || 'unknown';

        deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
        methodCounts[scanMethod] = (methodCounts[scanMethod] || 0) + 1;
      });

      return {
        devices: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
        methods: Object.entries(methodCounts).map(([name, value]) => ({ name, value })),
      };
    },
  });

  return {
    summaryData,
    scansByDate,
    topConnections,
    scansByHour,
    scansByDayOfWeek,
    scansByUser,
    deviceMethodStats,
    isLoading:
      !summaryData ||
      !scansByDate ||
      !topConnections ||
      !scansByHour ||
      !scansByDayOfWeek ||
      !scansByUser ||
      !deviceMethodStats,
  };
};
