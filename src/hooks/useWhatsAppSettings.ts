import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface WhatsAppSettings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  isEnabled: boolean;
  defaultCountryCode: string;
}

const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  evolutionApiUrl: '',
  evolutionApiKey: '',
  evolutionInstance: '',
  isEnabled: false,
  defaultCountryCode: '55',
};

export const useWhatsAppSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const savedSettings = data.setting_value as unknown as WhatsAppSettings;
        setSettings({
          evolutionApiUrl: savedSettings.evolutionApiUrl || '',
          evolutionApiKey: savedSettings.evolutionApiKey || '',
          evolutionInstance: savedSettings.evolutionInstance || '',
          isEnabled: savedSettings.isEnabled || false,
          defaultCountryCode: savedSettings.defaultCountryCode || '55',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações WhatsApp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: WhatsAppSettings) => {
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'whatsapp_settings')
        .maybeSingle();

      const settingValue: Json = {
        evolutionApiUrl: newSettings.evolutionApiUrl,
        evolutionApiKey: newSettings.evolutionApiKey,
        evolutionInstance: newSettings.evolutionInstance,
        isEnabled: newSettings.isEnabled,
        defaultCountryCode: newSettings.defaultCountryCode,
      };

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'whatsapp_settings');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert([{
            setting_key: 'whatsapp_settings',
            setting_value: settingValue,
          }]);

        if (error) throw error;
      }

      setSettings(newSettings);
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do WhatsApp foram salvas com sucesso.',
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações WhatsApp:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações do WhatsApp.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const testConnection = async (testSettings?: WhatsAppSettings): Promise<{ success: boolean; message: string }> => {
    const settingsToTest = testSettings || settings;
    
    if (!settingsToTest.evolutionApiUrl || !settingsToTest.evolutionApiKey || !settingsToTest.evolutionInstance) {
      return { success: false, message: 'Preencha todos os campos obrigatórios' };
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'test',
          settings: settingsToTest,
        },
      });

      if (error) throw error;

      if (data?.success) {
        return { success: true, message: data.message || 'Conexão OK' };
      } else {
        return { success: false, message: data?.message || 'Falha na conexão' };
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' };
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    isTesting,
    saveSettings,
    testConnection,
  };
};
