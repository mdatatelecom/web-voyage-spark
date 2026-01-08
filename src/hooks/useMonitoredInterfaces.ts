import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonitoredInterface {
  id: string;
  device_uuid: string;
  interface_name: string;
  interface_type: string;
  is_monitored: boolean;
  status: string;
  rx_bytes: number;
  tx_bytes: number;
  speed: string | null;
  mac_address: string | null;
  last_updated: string;
  created_at: string;
}

export function useMonitoredInterfaces(deviceUuid: string | null) {
  const queryClient = useQueryClient();

  const { data: interfaces, isLoading, error } = useQuery({
    queryKey: ['monitored-interfaces', deviceUuid],
    queryFn: async () => {
      if (!deviceUuid) return [];

      const { data, error } = await supabase
        .from('monitored_interfaces')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .order('interface_name', { ascending: true });

      if (error) throw error;
      return data as MonitoredInterface[];
    },
    enabled: !!deviceUuid,
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ id, is_monitored }: { id: string; is_monitored: boolean }) => {
      const { data, error } = await supabase
        .from('monitored_interfaces')
        .update({ is_monitored })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-interfaces', deviceUuid] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar interface: ${error.message}`);
    },
  });

  return {
    interfaces,
    isLoading,
    error,
    toggleMonitoring: toggleMonitoringMutation.mutate,
    isToggling: toggleMonitoringMutation.isPending,
  };
}
