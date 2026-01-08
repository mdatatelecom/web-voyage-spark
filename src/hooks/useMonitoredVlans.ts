import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonitoredVlan {
  id: string;
  device_uuid: string;
  vlan_id: number;
  vlan_name: string | null;
  is_monitored: boolean;
  interfaces: string[];
  last_updated: string;
  created_at: string;
}

export function useMonitoredVlans(deviceUuid: string | null) {
  const queryClient = useQueryClient();

  const { data: vlans, isLoading, error } = useQuery({
    queryKey: ['monitored-vlans', deviceUuid],
    queryFn: async () => {
      if (!deviceUuid) return [];

      const { data, error } = await supabase
        .from('monitored_vlans')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .order('vlan_id', { ascending: true });

      if (error) throw error;
      return data as MonitoredVlan[];
    },
    enabled: !!deviceUuid,
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ id, is_monitored }: { id: string; is_monitored: boolean }) => {
      const { data, error } = await supabase
        .from('monitored_vlans')
        .update({ is_monitored })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-vlans', deviceUuid] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar VLAN: ${error.message}`);
    },
  });

  return {
    vlans,
    isLoading,
    error,
    toggleMonitoring: toggleMonitoringMutation.mutate,
    isToggling: toggleMonitoringMutation.isPending,
  };
}
