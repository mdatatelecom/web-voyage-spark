import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';

export type TimeRange = '1h' | '6h' | '24h' | '7d';

export interface MetricDataPoint {
  id: string;
  oid: string;
  oid_name: string | null;
  value: string;
  category: string;
  collected_at: string;
}

export function getStartDate(range: TimeRange): Date {
  switch (range) {
    case '1h': return subHours(new Date(), 1);
    case '6h': return subHours(new Date(), 6);
    case '24h': return subDays(new Date(), 1);
    case '7d': return subDays(new Date(), 7);
  }
}

export function useDeviceMetricsHistory(
  deviceUuid: string | null,
  category: string,
  timeRange: TimeRange = '24h'
) {
  return useQuery({
    queryKey: ['device-metrics-history', deviceUuid, category, timeRange],
    queryFn: async () => {
      if (!deviceUuid) return [];

      const startDate = getStartDate(timeRange);

      const { data, error } = await supabase
        .from('snmp_metrics')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .eq('category', category)
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) throw error;
      return data as MetricDataPoint[];
    },
    enabled: !!deviceUuid,
    refetchInterval: 60000,
  });
}

export function useAllDeviceMetrics(deviceUuid: string | null, timeRange: TimeRange = '24h') {
  return useQuery({
    queryKey: ['all-device-metrics', deviceUuid, timeRange],
    queryFn: async () => {
      if (!deviceUuid) return { cpu: [], memoria: [], trafego: [], interfaces: [], outros: [] };

      const startDate = getStartDate(timeRange);

      const { data, error } = await supabase
        .from('snmp_metrics')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) throw error;

      const metrics = data as MetricDataPoint[];
      
      // Agrupar por categoria
      const grouped = {
        cpu: metrics.filter(m => m.category === 'cpu'),
        memoria: metrics.filter(m => m.category === 'memoria'),
        trafego: metrics.filter(m => m.category === 'trafego'),
        interfaces: metrics.filter(m => m.category === 'interfaces'),
        outros: metrics.filter(m => m.category === 'outros'),
      };

      return grouped;
    },
    enabled: !!deviceUuid,
    refetchInterval: 60000,
  });
}
