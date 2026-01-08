import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UptimeRecord {
  id: string;
  device_uuid: string;
  is_online: boolean;
  uptime_raw: string | null;
  response_time_ms: number | null;
  collected_at: string;
}

export function useUptimeHistory(deviceUuid: string | null, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['uptime-history', deviceUuid, days],
    queryFn: async () => {
      if (!deviceUuid) return [];

      const { data, error } = await supabase
        .from('device_uptime_history')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) throw error;
      return data as UptimeRecord[];
    },
    enabled: !!deviceUuid,
  });
}

export function calculateUptimePercentage(history: UptimeRecord[]): number {
  if (!history || history.length === 0) return 0;
  
  const onlineCount = history.filter(r => r.is_online).length;
  return Math.round((onlineCount / history.length) * 100 * 100) / 100;
}

export function getAverageResponseTime(history: UptimeRecord[]): number {
  if (!history || history.length === 0) return 0;
  
  const validRecords = history.filter(r => r.response_time_ms !== null);
  if (validRecords.length === 0) return 0;
  
  const sum = validRecords.reduce((acc, r) => acc + (r.response_time_ms || 0), 0);
  return Math.round(sum / validRecords.length);
}
