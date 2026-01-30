import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MonitoringPanel {
  id: string;
  name: string;
  url: string;
  panel_type: 'grafana' | 'zabbix' | 'other';
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface CreatePanelInput {
  name: string;
  url: string;
  panel_type: 'grafana' | 'zabbix' | 'other';
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

export const useMonitoringPanels = () => {
  const queryClient = useQueryClient();

  const { data: panels = [], isLoading } = useQuery({
    queryKey: ['monitoring-panels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitoring_panels')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as MonitoringPanel[];
    },
  });

  const addPanelMutation = useMutation({
    mutationFn: async (input: CreatePanelInput) => {
      const { data, error } = await supabase
        .from('monitoring_panels')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-panels'] });
    },
  });

  const updatePanelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MonitoringPanel> & { id: string }) => {
      const { data, error } = await supabase
        .from('monitoring_panels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-panels'] });
    },
  });

  const deletePanelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monitoring_panels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-panels'] });
    },
  });

  const togglePanel = async (id: string, isActive: boolean) => {
    await updatePanelMutation.mutateAsync({ id, is_active: isActive });
  };

  return {
    panels,
    isLoading,
    addPanel: addPanelMutation.mutateAsync,
    updatePanel: updatePanelMutation.mutateAsync,
    deletePanel: deletePanelMutation.mutateAsync,
    togglePanel,
  };
};
