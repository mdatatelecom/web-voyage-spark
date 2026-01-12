import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MonitoredDevice } from './useMonitoredDevices';

export interface DeviceStatusResponse {
  success: boolean;
  is_online: boolean;
  device: {
    hostname: string;
    vendor: string;
    model: string;
    uptime: string;
    status: string;
    collected_at: string;
  } | null;
  collected_at: string;
}

export function useDeviceStatus(device: MonitoredDevice | null, enabled = true) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['device-status', device?.device_id],
    queryFn: async (): Promise<DeviceStatusResponse> => {
      if (!device) throw new Error('Device not found');

      // For Grafana/Zabbix devices, we fetch status via grafana-proxy
      const { data, error } = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'get-host-status',
          zabbix_host_id: device.zabbix_host_id,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!device && device.is_active && !!device.zabbix_host_id,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 25000,
    retry: 1,
  });
}

export function useRefreshDeviceStatus() {
  const queryClient = useQueryClient();

  const refreshDevice = async (deviceId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['device-status', deviceId] });
  };

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['device-status'] });
  };

  return { refreshDevice, refreshAll };
}
