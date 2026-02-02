import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SecuritySettings {
  disableContextMenu: boolean;
  disableDevToolsShortcuts: boolean;
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  disableContextMenu: false,
  disableDevToolsShortcuts: false,
};

const getSecurityFromCache = (): SecuritySettings => {
  try {
    const cached = localStorage.getItem('security_settings_cache');
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Erro ao ler cache de segurança:', e);
  }
  return DEFAULT_SECURITY_SETTINGS;
};

export const useDevToolsProtection = () => {
  const [settings, setSettings] = useState<SecuritySettings>(getSecurityFromCache());
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'security_settings')
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar configurações de segurança:', error);
          return;
        }

        if (data?.setting_value) {
          const securityData = data.setting_value as unknown as SecuritySettings;
          setSettings(securityData);
          localStorage.setItem('security_settings_cache', JSON.stringify(securityData));
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de segurança:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Apply DevTools protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.disableDevToolsShortcuts) return;

      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'I') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'J') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'C') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!settings.disableContextMenu) return;
      e.preventDefault();
      return false;
    };

    // Add listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [settings]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'security_settings_cache' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings(newSettings);
        } catch (err) {
          console.error('Erro ao processar mudança de segurança:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { settings, isLoading };
};

// Hook for managing security settings (used in System.tsx)
export const useSecuritySettings = () => {
  const [settings, setSettings] = useState<SecuritySettings>(getSecurityFromCache());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'security_settings')
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar configurações de segurança:', error);
          return;
        }

        if (data?.setting_value) {
          const securityData = data.setting_value as unknown as SecuritySettings;
          setSettings(securityData);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de segurança:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newSettings: SecuritySettings): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          setting_key: 'security_settings',
          setting_value: newSettings as any,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setSettings(newSettings);
      localStorage.setItem('security_settings_cache', JSON.stringify(newSettings));
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de segurança:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, setSettings, isLoading, isSaving, saveSettings };
};
