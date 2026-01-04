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
    
    // Force TCP mode for better compatibility with cloud/firewall restricted streams
    const tcpUrl = rtspUrl.includes('#') 
      ? rtspUrl 
      : `${rtspUrl}#tcp`;

    try {
      // Use Edge Function proxy to register the RTSP stream with TCP mode
      const { data, error } = await supabase.functions.invoke('go2rtc-proxy', {
        body: { 
          serverUrl, 
          endpoint: `/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(tcpUrl)}`,
          method: 'PUT'
        }
      });

      if (error) {
        return { success: false, message: error.message || 'Erro ao registrar stream via proxy' };
      }

      if (data?.success) {
        // Use HLS proxy Edge Function to avoid CORS issues
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const hlsUrl = `${supabaseUrl}/functions/v1/go2rtc-hls-proxy?server=${encodeURIComponent(serverUrl)}&stream=${encodeURIComponent(streamName)}`;
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

  const exchangeWebRtcSdp = async (
    streamName: string,
    sdpOffer: string
  ): Promise<{ success: boolean; sdpAnswer?: string; error?: string }> => {
    if (!settings.enabled || !settings.serverUrl) {
      return { success: false, error: 'go2rtc não está configurado' };
    }

    const serverUrl = normalizeServerUrl(settings.serverUrl);

    try {
      const { data, error } = await supabase.functions.invoke('go2rtc-webrtc-proxy', {
        body: { serverUrl, streamName, sdpOffer }
      });

      if (error) {
        console.error('WebRTC SDP exchange error:', error);
        return { success: false, error: error.message || 'Erro na troca SDP' };
      }

      if (data?.success && data?.sdpAnswer) {
        return { success: true, sdpAnswer: data.sdpAnswer };
      }

      return { success: false, error: data?.error || 'Falha na troca SDP' };
    } catch (error) {
      console.error('WebRTC SDP exchange exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro na troca SDP' 
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
      // Use Edge Function proxy to delete stream
      const { data, error } = await supabase.functions.invoke('go2rtc-proxy', {
        body: { 
          serverUrl, 
          endpoint: `/api/streams?src=${encodeURIComponent(streamName)}`,
          method: 'DELETE'
        }
      });

      if (error) {
        console.error('Delete stream error:', error);
        return false;
      }
      
      return data?.success || false;
    } catch {
      return false;
    }
  };

  const testStreamConnection = async (streamName: string): Promise<{
    success: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
    error?: string;
  }> => {
    if (!settings.serverUrl) {
      return { success: false, hasVideo: false, hasAudio: false, error: 'Servidor não configurado' };
    }

    const serverUrl = normalizeServerUrl(settings.serverUrl);

    try {
      const { data, error } = await supabase.functions.invoke('go2rtc-proxy', {
        body: { 
          serverUrl, 
          endpoint: '/api/streams',
          method: 'GET'
        }
      });

      if (error || !data?.success) {
        return { success: false, hasVideo: false, hasAudio: false, error: error?.message || 'Erro ao consultar streams' };
      }

      // Parse streams data
      const streamsData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      const streamInfo = streamsData?.[streamName];

      if (!streamInfo) {
        return { success: false, hasVideo: false, hasAudio: false, error: 'Stream não encontrado' };
      }

      // Check if stream has active producers
      const producers = streamInfo.producers || [];
      const hasActiveProducer = producers.length > 0;
      
      // Check for video/audio tracks
      let hasVideo = false;
      let hasAudio = false;
      
      for (const producer of producers) {
        const medias = producer.medias || [];
        for (const media of medias) {
          if (media.kind === 'video') hasVideo = true;
          if (media.kind === 'audio') hasAudio = true;
        }
      }

      return { 
        success: hasActiveProducer, 
        hasVideo, 
        hasAudio,
        error: hasActiveProducer ? undefined : 'Nenhum producer ativo'
      };
    } catch (err) {
      return { 
        success: false, 
        hasVideo: false, 
        hasAudio: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      };
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
    exchangeWebRtcSdp,
    getSnapshot,
    deleteStream,
    testStreamConnection,
  };
};
