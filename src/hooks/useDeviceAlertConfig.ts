import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeviceAlertConfig {
  id: string;
  device_uuid: string;
  offline_threshold_minutes: number;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  last_alert_sent_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function useDeviceAlertConfig(deviceUuid: string | null) {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['device-alert-config', deviceUuid],
    queryFn: async () => {
      if (!deviceUuid) return null;

      const { data, error } = await supabase
        .from('device_offline_alerts')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .maybeSingle();

      if (error) throw error;
      return data as DeviceAlertConfig | null;
    },
    enabled: !!deviceUuid,
  });

  const upsertConfigMutation = useMutation({
    mutationFn: async (configData: Partial<DeviceAlertConfig> & { device_uuid: string }) => {
      const { data: existing } = await supabase
        .from('device_offline_alerts')
        .select('id')
        .eq('device_uuid', configData.device_uuid)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('device_offline_alerts')
          .update({
            offline_threshold_minutes: configData.offline_threshold_minutes,
            whatsapp_enabled: configData.whatsapp_enabled,
            email_enabled: configData.email_enabled,
            is_active: configData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('device_offline_alerts')
          .insert({
            device_uuid: configData.device_uuid,
            offline_threshold_minutes: configData.offline_threshold_minutes || 5,
            whatsapp_enabled: configData.whatsapp_enabled ?? true,
            email_enabled: configData.email_enabled ?? false,
            is_active: configData.is_active ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-alert-config', deviceUuid] });
      toast.success('Configurações de alerta salvas');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });

  return {
    config,
    isLoading,
    error,
    saveConfig: upsertConfigMutation.mutate,
    isSaving: upsertConfigMutation.isPending,
  };
}
