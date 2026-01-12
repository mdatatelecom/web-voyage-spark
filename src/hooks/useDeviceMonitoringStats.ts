import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeviceStats {
  vlanCount: number;
  interfaceCount: number;
}

export function useDeviceMonitoringStats(deviceId: string | null) {
  return useQuery({
    queryKey: ['device-monitoring-stats', deviceId],
    queryFn: async (): Promise<DeviceStats> => {
      if (!deviceId) {
        return { vlanCount: 0, interfaceCount: 0 };
      }

      const [vlansResult, interfacesResult] = await Promise.all([
        supabase
          .from('monitored_vlans')
          .select('id', { count: 'exact', head: true })
          .eq('device_uuid', deviceId),
        supabase
          .from('monitored_interfaces')
          .select('id', { count: 'exact', head: true })
          .eq('device_uuid', deviceId),
      ]);

      return {
        vlanCount: vlansResult.count || 0,
        interfaceCount: interfacesResult.count || 0,
      };
    },
    enabled: !!deviceId,
  });
}

// Hook para estatísticas de múltiplos dispositivos
export function useAllDevicesStats(deviceIds: string[]) {
  return useQuery({
    queryKey: ['all-devices-stats', deviceIds],
    queryFn: async (): Promise<Record<string, DeviceStats>> => {
      if (deviceIds.length === 0) {
        return {};
      }

      const [vlansResult, interfacesResult] = await Promise.all([
        supabase
          .from('monitored_vlans')
          .select('device_uuid')
          .in('device_uuid', deviceIds),
        supabase
          .from('monitored_interfaces')
          .select('device_uuid')
          .in('device_uuid', deviceIds),
      ]);

      const stats: Record<string, DeviceStats> = {};

      // Initialize all devices with 0
      deviceIds.forEach((id) => {
        stats[id] = { vlanCount: 0, interfaceCount: 0 };
      });

      // Count VLANs per device
      vlansResult.data?.forEach((vlan) => {
        if (vlan.device_uuid && stats[vlan.device_uuid]) {
          stats[vlan.device_uuid].vlanCount++;
        }
      });

      // Count Interfaces per device
      interfacesResult.data?.forEach((iface) => {
        if (iface.device_uuid && stats[iface.device_uuid]) {
          stats[iface.device_uuid].interfaceCount++;
        }
      });

      return stats;
    },
    enabled: deviceIds.length > 0,
    staleTime: 60000, // 1 minute
  });
}
