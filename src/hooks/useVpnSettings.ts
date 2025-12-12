import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface VpnSettings {
  vpnHost: string;
  vpnUser: string;
  vpnPassword: string;
  sshPort: number;
  sshRelayUrl: string; // External SSH WebSocket Relay URL
  useExternalRelay: boolean;
}

const DEFAULT_VPN_SETTINGS: VpnSettings = {
  vpnHost: '',
  vpnUser: '',
  vpnPassword: '',
  sshPort: 22,
  sshRelayUrl: '',
  useExternalRelay: false,
};

export const useVpnSettings = () => {
  const { toast } = useToast();
  const [vpnSettings, setVpnSettings] = useState<VpnSettings>(DEFAULT_VPN_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'vpn_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const settings = data.setting_value as unknown as VpnSettings;
        setVpnSettings({
          vpnHost: settings.vpnHost || '',
          vpnUser: settings.vpnUser || '',
          vpnPassword: settings.vpnPassword || '',
          sshPort: settings.sshPort || 22,
          sshRelayUrl: settings.sshRelayUrl || '',
          useExternalRelay: settings.useExternalRelay || false,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações VPN:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (settings: VpnSettings) => {
    try {
      // First check if setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'vpn_settings')
        .maybeSingle();

      const settingValue: Json = {
        vpnHost: settings.vpnHost,
        vpnUser: settings.vpnUser,
        vpnPassword: settings.vpnPassword,
        sshPort: settings.sshPort,
        sshRelayUrl: settings.sshRelayUrl,
        useExternalRelay: settings.useExternalRelay,
      };

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'vpn_settings');

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert([{
            setting_key: 'vpn_settings',
            setting_value: settingValue,
          }]);

        if (error) throw error;
      }

      setVpnSettings(settings);
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de VPN foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações VPN:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações de VPN.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    vpnSettings,
    isLoading,
    saveSettings,
  };
};
