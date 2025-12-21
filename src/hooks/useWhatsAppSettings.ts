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
  targetType?: 'individual' | 'group';
  selectedGroupId?: string | null;
  selectedGroupName?: string | null;
}

const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  evolutionApiUrl: '',
  evolutionApiKey: '',
  evolutionInstance: '',
  isEnabled: false,
  defaultCountryCode: '55',
  targetType: 'individual',
  selectedGroupId: null,
  selectedGroupName: null,
};

export interface EvolutionInstance {
  name: string;
  displayName: string;
  state: string;
  rawState?: string;
  disconnectionReasonCode?: number;
  profileName: string | null;
  profilePictureUrl: string | null;
}

export const useWhatsAppSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isDeletingInstance, setIsDeletingInstance] = useState(false);
  const [lastInstanceRefresh, setLastInstanceRefresh] = useState<Date | null>(null);

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
          targetType: savedSettings.targetType || 'individual',
          selectedGroupId: savedSettings.selectedGroupId || null,
          selectedGroupName: savedSettings.selectedGroupName || null,
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
        targetType: newSettings.targetType || 'individual',
        selectedGroupId: newSettings.selectedGroupId || null,
        selectedGroupName: newSettings.selectedGroupName || null,
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

  const testConnection = async (testSettings?: WhatsAppSettings): Promise<{ 
    success: boolean; 
    message: string; 
    needsReconnect?: boolean;
    disconnectionReasonCode?: number;
  }> => {
    const settingsToTest = testSettings || settings;
    
    if (!settingsToTest.evolutionApiUrl || !settingsToTest.evolutionApiKey || !settingsToTest.evolutionInstance) {
      return { success: false, message: 'Preencha todos os campos obrigatórios', needsReconnect: false };
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
        return { 
          success: true, 
          message: data.message || 'Conexão OK',
          needsReconnect: false,
          disconnectionReasonCode: data.disconnectionReasonCode
        };
      } else {
        return { 
          success: false, 
          message: data?.message || 'Falha na conexão',
          needsReconnect: data?.needsReconnect || false,
          disconnectionReasonCode: data?.disconnectionReasonCode
        };
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        needsReconnect: false
      };
    } finally {
      setIsTesting(false);
    }
  };

  const listInstances = async (apiUrl: string, apiKey: string): Promise<EvolutionInstance[]> => {
    if (!apiUrl || !apiKey) {
      return [];
    }

    setIsLoadingInstances(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'list-instances',
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success && Array.isArray(data.instances)) {
        setInstances(data.instances);
        setLastInstanceRefresh(new Date());
        return data.instances;
      } else {
        toast({
          title: 'Aviso',
          description: data?.message || 'Nenhuma instância encontrada',
          variant: 'destructive',
        });
        return [];
      }
    } catch (error) {
      console.error('Erro ao listar instâncias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível listar as instâncias',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoadingInstances(false);
    }
  };

  // Silent refresh for auto-refresh (no toasts, no loading state changes)
  const refreshInstances = async (apiUrl: string, apiKey: string): Promise<EvolutionInstance[]> => {
    if (!apiUrl || !apiKey) {
      return instances;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'list-instances',
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success && Array.isArray(data.instances)) {
        setInstances(data.instances);
        setLastInstanceRefresh(new Date());
        return data.instances;
      }
      return instances;
    } catch (error) {
      console.error('Auto-refresh silencioso falhou:', error);
      return instances;
    }
  };

  const createInstance = async (
    instanceName: string,
    apiUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; message: string; qrcode?: string | null }> => {
    if (!instanceName || !apiUrl || !apiKey) {
      return { success: false, message: 'Preencha todos os campos' };
    }

    setIsCreatingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'create-instance',
          instanceName,
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Instância criada',
          description: `A instância "${instanceName}" foi criada com sucesso.`,
        });
        return { 
          success: true, 
          message: data.message,
          qrcode: data.qrcode 
        };
      } else {
        toast({
          title: 'Erro ao criar instância',
          description: data?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Erro ao criar instância' };
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, message: errorMsg };
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const deleteInstance = async (
    instanceName: string,
    apiUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!instanceName || !apiUrl || !apiKey) {
      return { success: false, message: 'Preencha todos os campos' };
    }

    setIsDeletingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'delete-instance',
          instanceName,
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Instância excluída',
          description: `A instância "${instanceName}" foi excluída permanentemente.`,
        });
        return { success: true, message: data.message };
      } else {
        toast({
          title: 'Erro ao excluir instância',
          description: data?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Erro ao excluir instância' };
      }
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, message: errorMsg };
    } finally {
      setIsDeletingInstance(false);
    }
  };

  const logoutInstance = async (
    instanceName: string,
    apiUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!instanceName || !apiUrl || !apiKey) {
      return { success: false, message: 'Preencha todos os campos' };
    }

    setIsDeletingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'logout-instance',
          instanceName,
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'WhatsApp desconectado',
          description: `A instância "${instanceName}" foi desconectada.`,
        });
        return { success: true, message: data.message };
      } else {
        toast({
          title: 'Erro ao desconectar',
          description: data?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Erro ao desconectar instância' };
      }
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, message: errorMsg };
    } finally {
      setIsDeletingInstance(false);
    }
  };

  const connectInstance = async (
    instanceName: string,
    apiUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; message: string; qrcode?: string | null }> => {
    if (!instanceName || !apiUrl || !apiKey) {
      return { success: false, message: 'Preencha todos os campos' };
    }

    setIsCreatingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'connect-instance',
          instanceName,
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: '',
            isEnabled: false,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'QR Code gerado',
          description: `Escaneie o QR Code para conectar a instância "${instanceName}".`,
        });
        return { 
          success: true, 
          message: data.message,
          qrcode: data.qrcode 
        };
      } else {
        toast({
          title: 'Erro ao reconectar',
          description: data?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Erro ao reconectar instância' };
      }
    } catch (error) {
      console.error('Erro ao reconectar instância:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, message: errorMsg };
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const sendTestMessage = async (
    phone: string,
    message?: string,
    testSettings?: WhatsAppSettings
  ): Promise<{ success: boolean; message: string }> => {
    const settingsToUse = testSettings || settings;
    
    if (!phone) {
      return { success: false, message: 'Número de telefone é obrigatório' };
    }

    if (!settingsToUse.evolutionApiUrl || !settingsToUse.evolutionApiKey || !settingsToUse.evolutionInstance) {
      return { success: false, message: 'Configure URL, API Key e Instância primeiro' };
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'send-test',
          phone: phone.replace(/\D/g, ''),
          message: message || '✅ Teste de integração WhatsApp realizado com sucesso! - Sistema de Racks',
          settings: settingsToUse,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Mensagem enviada',
          description: data.message || 'Mensagem de teste enviada com sucesso!',
        });
        return { success: true, message: data.message || 'Mensagem enviada!' };
      } else {
        toast({
          title: 'Erro ao enviar',
          description: data?.message || 'Falha ao enviar mensagem de teste',
          variant: 'destructive',
        });
        return { success: false, message: data?.message || 'Falha ao enviar mensagem' };
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, message: errorMsg };
    } finally {
      setIsSendingTest(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    isTesting,
    isSendingTest,
    instances,
    isLoadingInstances,
    isCreatingInstance,
    isDeletingInstance,
    lastInstanceRefresh,
    saveSettings,
    testConnection,
    listInstances,
    refreshInstances,
    createInstance,
    deleteInstance,
    logoutInstance,
    connectInstance,
    sendTestMessage,
  };
};
