import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Go2rtcSettings {
  serverUrl: string;
  enabled: boolean;
}

const STORAGE_KEY = 'go2rtc_settings';

const DEFAULT_SETTINGS: Go2rtcSettings = {
  serverUrl: '',
  enabled: false,
};

// Normaliza a URL do servidor para garantir que tenha protocolo http/https
const normalizeServerUrl = (url: string): string => {
  if (!url) return url;
  
  // Remove espaços
  let normalized = url.trim();
  
  // Se não começar com http:// ou https://, adiciona http://
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `http://${normalized}`;
  }
  
  // Remove barra final se existir
  normalized = normalized.replace(/\/+$/, '');
  
  return normalized;
};

export const useGo2rtcSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Go2rtcSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Try to load from Supabase first
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'go2rtc_server')
        .maybeSingle();

      if (data && !error && data.setting_value) {
        const value = data.setting_value as unknown;
        if (typeof value === 'object' && value !== null && 'serverUrl' in value && 'enabled' in value) {
          const loadedSettings = value as Go2rtcSettings;
          // Normalizar URL ao carregar
          loadedSettings.serverUrl = normalizeServerUrl(loadedSettings.serverUrl);
          setSettings(loadedSettings);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
        }
      } else {
        // Fallback to localStorage
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.serverUrl = normalizeServerUrl(parsed.serverUrl);
          setSettings(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading go2rtc settings:', error);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.serverUrl = normalizeServerUrl(parsed.serverUrl);
        setSettings(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Go2rtcSettings) => {
    // Normalizar URL antes de salvar
    const normalizedSettings = {
      ...newSettings,
      serverUrl: normalizeServerUrl(newSettings.serverUrl),
    };
    
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'go2rtc_server')
        .maybeSingle();

      const settingValue = JSON.parse(JSON.stringify(normalizedSettings));

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'go2rtc_server');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert([{
            setting_key: 'go2rtc_server',
            setting_value: settingValue,
          }]);
        if (error) throw error;
      }

      setSettings(normalizedSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));

      toast({
        title: 'Configurações salvas',
        description: 'Configurações do go2rtc atualizadas com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error saving go2rtc settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const testConnection = async (url?: string): Promise<{ success: boolean; message: string }> => {
    const testUrl = normalizeServerUrl(url || settings.serverUrl);
    
    if (!testUrl) {
      return { success: false, message: 'URL do servidor não configurada' };
    }

    setIsTesting(true);
    
    try {
      // Use Edge Function proxy to avoid CORS
      const { data, error } = await supabase.functions.invoke('go2rtc-proxy', {
        body: { 
          serverUrl: testUrl, 
          endpoint: '/api/streams',
          method: 'GET'
        }
      });

      setIsTesting(false);

      if (error) {
        setServerStatus('offline');
        return { success: false, message: error.message || 'Erro ao conectar via proxy' };
      }

      if (data?.success) {
        setServerStatus('online');
        return { success: true, message: 'Servidor go2rtc online e acessível' };
      } else {
        setServerStatus('offline');
        return { success: false, message: data?.error || 'Servidor não respondeu' };
      }
    } catch (error) {
      setServerStatus('offline');
      setIsTesting(false);
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Erro desconhecido ao conectar' };
    }
  };

  const registerStream = async (
    streamName: string,
    rtspUrl: string
  ): Promise<{ success: boolean; hlsUrl?: string; message?: string }> => {
    if (!settings.enabled || !settings.serverUrl) {
      return { success: false, message: 'go2rtc não está configurado ou habilitado' };
    }

    const serverUrl = normalizeServerUrl(settings.serverUrl);

    try {
      // Use Edge Function proxy to register the RTSP stream
      const { data, error } = await supabase.functions.invoke('go2rtc-proxy', {
        body: { 
          serverUrl, 
          endpoint: `/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(rtspUrl)}`,
          method: 'PUT'
        }
      });

      if (error) {
        return { success: false, message: error.message || 'Erro ao registrar stream via proxy' };
      }

      if (data?.success) {
        // Return the HLS URL (direct access - go2rtc needs CORS enabled for playback)
        const hlsUrl = `${serverUrl}/api/stream.m3u8?src=${encodeURIComponent(streamName)}`;
        return { success: true, hlsUrl };
      }
      
      return { success: false, message: data?.error || 'Falha ao registrar stream no go2rtc' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro ao registrar stream' 
      };
    }
  };

  const getSnapshot = async (streamName: string): Promise<string | null> => {
    if (!settings.serverUrl) return null;

    const serverUrl = normalizeServerUrl(settings.serverUrl);

    try {
      const response = await fetch(
        `${serverUrl}/api/frame.jpeg?src=${encodeURIComponent(streamName)}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch {
      return null;
    }
  };

  const deleteStream = async (streamName: string): Promise<boolean> => {
    if (!settings.serverUrl) return false;

    const serverUrl = normalizeServerUrl(settings.serverUrl);

    try {
      await fetch(
        `${serverUrl}/api/streams?src=${encodeURIComponent(streamName)}`,
        { method: 'DELETE' }
      );
      return true;
    } catch {
      return false;
    }
  };

  return {
    settings,
    isLoading,
    serverStatus,
    isTesting,
    saveSettings,
    testConnection,
    registerStream,
    getSnapshot,
    deleteStream,
  };
};
