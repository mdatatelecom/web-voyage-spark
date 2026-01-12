import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonitoredDevice {
  id: string;
  device_id: string;
  hostname: string | null;
  vendor: string | null;
  model: string | null;
  ip_address: string | null;
  is_active: boolean;
  status: string;
  last_seen: string | null;
  uptime_raw: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Grafana/Zabbix integration fields
  data_source_type: string | null;
  grafana_host_id: string | null;
  grafana_dashboard_uid: string | null;
  zabbix_host_id: string | null;
  // External panel URL
  external_panel_url: string | null;
}

export interface CreateDeviceInput {
  device_id: string;
  hostname?: string;
  customer_name?: string;
  notes?: string;
  is_active?: boolean;
  // Grafana/Zabbix fields
  data_source_type?: string;
  grafana_host_id?: string;
  grafana_dashboard_uid?: string;
  zabbix_host_id?: string;
  // External panel URL
  external_panel_url?: string;
}

export function useMonitoredDevices() {
  const queryClient = useQueryClient();

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['monitored-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitored_devices')
        .select('*')
        .order('hostname', { ascending: true });

      if (error) throw error;
      return data as MonitoredDevice[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateDeviceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('monitored_devices')
        .insert({
          ...input,
          data_source_type: 'grafana',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-devices'] });
      toast.success('Dispositivo adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar dispositivo: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MonitoredDevice> & { id: string }) => {
      const { data, error } = await supabase
        .from('monitored_devices')
        .update({
          ...updates,
          data_source_type: 'grafana',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-devices'] });
      toast.success('Dispositivo atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar dispositivo: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monitored_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-devices'] });
      toast.success('Dispositivo removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover dispositivo: ${error.message}`);
    },
  });

  return {
    devices,
    isLoading,
    error,
    createDevice: createMutation.mutate,
    updateDevice: updateMutation.mutate,
    deleteDevice: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
