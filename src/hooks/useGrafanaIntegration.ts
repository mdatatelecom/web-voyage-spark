import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGrafanaConfig } from './useGrafanaConfig';

export interface ZabbixMetric {
  itemid: string;
  name: string;
  key_: string;
  lastvalue: string;
  units: string;
  lastclock: string;
  status: string;
}

export interface ZabbixAlert {
  eventid: string;
  objectid: string;
  clock: string;
  name: string;
  severity: string;
  acknowledged: string;
  tags?: { tag: string; value: string }[];
}

export interface MetricHistoryPoint {
  clock: string;
  value: string;
  ns?: string;
}

export function useGrafanaIntegration(deviceId?: string, zabbixHostId?: string) {
  const { config } = useGrafanaConfig();

  const getApiKey = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grafana_api_key')
      .maybeSingle();
    
    const settingValue = data?.setting_value as Record<string, unknown> | null;
    return (settingValue?.key as string) || null;
  };

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['grafana-metrics', zabbixHostId],
    queryFn: async () => {
      if (!config || !zabbixHostId) return [];
      
      const apiKey = await getApiKey();
      if (!apiKey) return [];

      const response = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'host-metrics',
          grafana_url: config.grafana_url,
          api_key: apiKey,
          datasource_uid: config.datasource_uid,
          host_id: zabbixHostId,
        },
      });

      if (response.error || !response.data.success) {
        console.error('Failed to fetch metrics:', response.error || response.data.error);
        return [];
      }

      return response.data.data as ZabbixMetric[];
    },
    enabled: !!config && !!zabbixHostId,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['grafana-alerts', zabbixHostId],
    queryFn: async () => {
      if (!config || !zabbixHostId) return [];
      
      const apiKey = await getApiKey();
      if (!apiKey) return [];

      const response = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'host-alerts',
          grafana_url: config.grafana_url,
          api_key: apiKey,
          datasource_uid: config.datasource_uid,
          host_id: zabbixHostId,
        },
      });

      if (response.error || !response.data.success) {
        console.error('Failed to fetch alerts:', response.error || response.data.error);
        return [];
      }

      return response.data.data as ZabbixAlert[];
    },
    enabled: !!config && !!zabbixHostId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const fetchMetricHistory = async (
    itemKey: string,
    timeFrom?: number,
    timeTill?: number
  ): Promise<MetricHistoryPoint[]> => {
    if (!config || !zabbixHostId) return [];
    
    const apiKey = await getApiKey();
    if (!apiKey) return [];

    const response = await supabase.functions.invoke('grafana-proxy', {
      body: {
        action: 'metric-history',
        grafana_url: config.grafana_url,
        api_key: apiKey,
        datasource_uid: config.datasource_uid,
        host_id: zabbixHostId,
        query: {
          item_key: itemKey,
          time_from: timeFrom,
          time_till: timeTill,
        },
      },
    });

    if (response.error || !response.data.success) {
      console.error('Failed to fetch metric history:', response.error || response.data.error);
      return [];
    }

    return response.data.data as MetricHistoryPoint[];
  };

  // Get commonly used metrics
  const cpuMetric = metrics?.find(m => 
    m.key_.includes('system.cpu.util') || 
    m.key_.includes('system.cpu.load')
  );
  
  const memoryMetric = metrics?.find(m => 
    m.key_.includes('vm.memory.util') || 
    m.key_.includes('vm.memory.size[available]')
  );
  
  const networkMetrics = metrics?.filter(m => 
    m.key_.includes('net.if') || 
    m.key_.includes('ifHC')
  ) || [];

  return {
    metrics,
    alerts,
    isLoading: metricsLoading || alertsLoading,
    refetchMetrics,
    refetchAlerts,
    fetchMetricHistory,
    // Convenience getters
    cpuMetric,
    memoryMetric,
    networkMetrics,
  };
}
