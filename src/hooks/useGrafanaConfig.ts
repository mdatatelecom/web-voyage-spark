import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GrafanaConfig {
  id: string;
  grafana_url: string;
  grafana_org_id: number;
  datasource_name: string;
  datasource_uid: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Datasource {
  id: number;
  uid: string;
  name: string;
  type: string;
  url: string;
}

export function useGrafanaConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['grafana-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grafana_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as GrafanaConfig | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: Partial<GrafanaConfig> & { grafana_url: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (config?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('grafana_config')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('grafana_config')
          .insert({
            ...input,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grafana-config'] });
      toast.success('Configuração do Grafana salva com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });

  const testConnection = async (grafanaUrl: string, apiKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'test-connection',
          grafana_url: grafanaUrl,
          api_key: apiKey,
        },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const fetchDatasources = async (grafanaUrl: string, apiKey: string): Promise<{ success: boolean; data?: Datasource[]; error?: string }> => {
    try {
      const response = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'datasources',
          grafana_url: grafanaUrl,
          api_key: apiKey,
        },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    config,
    isLoading,
    error,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    testConnection,
    fetchDatasources,
  };
}
