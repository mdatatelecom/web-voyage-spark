import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AlertSettingKey = 
  | 'rack_warning_threshold' 
  | 'rack_critical_threshold' 
  | 'port_warning_threshold' 
  | 'port_critical_threshold'
  | 'poe_warning_threshold'
  | 'poe_critical_threshold'
  | 'nvr_warning_threshold'
  | 'nvr_critical_threshold'
  | 'camera_orphan_alert_enabled'
  | 'connection_faulty_alert_enabled'
  | 'testing_max_days'
  | 'equipment_no_ip_alert_enabled'
  | 'ticket_deadline_warning_hours'
  | 'ticket_deadline_critical_hours'
  | 'ticket_auto_escalation_enabled'
  | 'ticket_deadline_whatsapp_enabled'
  | 'zabbix_enabled'
  | 'zabbix_whatsapp_enabled'
  | 'zabbix_min_severity'
  | 'epi_enabled'
  | 'epi_whatsapp_enabled'
  | 'epi_min_severity';

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
        { key: 'nvr_warning_threshold', value: 80 },
        { key: 'nvr_critical_threshold', value: 100 },
        { key: 'camera_orphan_alert_enabled', value: 1 },
        { key: 'connection_faulty_alert_enabled', value: 1 },
        { key: 'testing_max_days', value: 7 },
        { key: 'equipment_no_ip_alert_enabled', value: 1 },
        { key: 'ticket_deadline_warning_hours', value: 24 },
        { key: 'ticket_deadline_critical_hours', value: 4 },
        { key: 'ticket_auto_escalation_enabled', value: 1 },
        { key: 'ticket_deadline_whatsapp_enabled', value: 1 },
        { key: 'zabbix_enabled', value: 1 },
        { key: 'zabbix_whatsapp_enabled', value: 1 },
        { key: 'zabbix_min_severity', value: 2 },
        { key: 'epi_enabled', value: 1 },
        { key: 'epi_whatsapp_enabled', value: 1 },
        { key: 'epi_min_severity', value: 2 },
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
