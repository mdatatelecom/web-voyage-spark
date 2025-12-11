import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AlertSettingKey = 
  | 'rack_warning_threshold' 
  | 'rack_critical_threshold' 
  | 'port_warning_threshold' 
  | 'port_critical_threshold'
  | 'poe_warning_threshold'
  | 'poe_critical_threshold';

interface AlertSetting {
  id: string;
  setting_key: AlertSettingKey;
  setting_value: number;
  description: string | null;
}

export const useAlertSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data as AlertSetting[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: AlertSettingKey; value: number }) => {
      const { error } = await supabase
        .from('alert_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
      toast.success('Configuração atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar configuração: ${error.message}`);
    },
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      const defaults = [
        { key: 'rack_warning_threshold', value: 80 },
        { key: 'rack_critical_threshold', value: 95 },
        { key: 'port_warning_threshold', value: 80 },
        { key: 'port_critical_threshold', value: 95 },
        { key: 'poe_warning_threshold', value: 80 },
        { key: 'poe_critical_threshold', value: 90 },
      ];

      for (const { key, value } of defaults) {
        const { error } = await supabase
          .from('alert_settings')
          .update({ setting_value: value })
          .eq('setting_key', key);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
      toast.success('Configurações restauradas aos valores padrão');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao restaurar configurações: ${error.message}`);
    },
  });

  const getSetting = (key: AlertSettingKey) => {
    return settings?.find(s => s.setting_key === key);
  };

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
    resetToDefaults: resetToDefaultsMutation.mutate,
    isResetting: resetToDefaultsMutation.isPending,
  };
};
