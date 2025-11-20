import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrandingSettings {
  systemName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
}

export const useSystemSettings = () => {
  const { toast } = useToast();
  const [branding, setBranding] = useState<BrandingSettings>({
    systemName: 'InfraConnexus',
    logoUrl: null,
    faviconUrl: null,
  });
  const [themeColors, setThemeColors] = useState<ThemeColors>({
    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',
    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarPrimary: '240 5.9% 10%',
    sidebarAccent: '240 4.8% 95.9%',
    sidebarAccentForeground: '240 5.9% 10%',
    sidebarBorder: '220 13% 91%',
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['branding', 'theme_colors']);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.setting_key === 'branding') {
          const brandingData = setting.setting_value as unknown as BrandingSettings;
          setBranding(brandingData);
          
          // Aplicar branding imediatamente ao carregar
          document.title = `${brandingData.systemName} - Gestão de Infraestrutura`;
          if (brandingData.faviconUrl) {
            let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
            if (!favicon) {
              favicon = document.createElement('link');
              favicon.rel = 'icon';
              document.head.appendChild(favicon);
            }
            favicon.href = brandingData.faviconUrl;
          }
        } else if (setting.setting_key === 'theme_colors') {
          const colors = setting.setting_value as unknown as ThemeColors;
          setThemeColors(colors);
        }
      });
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBranding = async (newBranding: BrandingSettings) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          setting_key: 'branding',
          setting_value: newBranding as any,
          updated_at: new Date().toISOString(),
        }], { 
          onConflict: 'setting_key' 
        });

      if (error) throw error;

      setBranding(newBranding);
      toast({ title: 'Branding atualizado com sucesso!' });
      
      document.title = `${newBranding.systemName} - Gestão de Infraestrutura`;
      if (newBranding.faviconUrl) {
        const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (favicon) favicon.href = newBranding.faviconUrl;
      }
    } catch (error: any) {
      toast({ title: 'Erro ao salvar branding', description: error.message, variant: 'destructive' });
    }
  };

  const saveThemeColors = async (newColors: ThemeColors) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          setting_key: 'theme_colors',
          setting_value: newColors as any,
          updated_at: new Date().toISOString(),
        }], { 
          onConflict: 'setting_key' 
        });

      if (error) throw error;

      setThemeColors(newColors);
      applyThemeColors(newColors);
      toast({ title: 'Cores atualizadas com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar cores', description: error.message, variant: 'destructive' });
    }
  };

  const applyThemeColors = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--sidebar-background', colors.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', colors.sidebarForeground);
    root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground);
    root.style.setProperty('--sidebar-border', colors.sidebarBorder);
  };

  const uploadImage = async (file: File, type: 'logo' | 'favicon'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({ title: 'Erro ao fazer upload', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const applyPreset = async (colors: ThemeColors) => {
    // Aplica imediatamente no estado e DOM
    setThemeColors(colors);
    applyThemeColors(colors);
    
    // Salva automaticamente no banco
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          setting_key: 'theme_colors',
          setting_value: colors as any,
          updated_at: new Date().toISOString(),
        }], { 
          onConflict: 'setting_key' 
        });

      if (error) throw error;
      
      toast({ title: 'Paleta aplicada e salva com sucesso!' });
    } catch (error: any) {
      toast({ 
        title: 'Paleta aplicada mas não foi salva', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      applyThemeColors(themeColors);
    }
  }, [themeColors, isLoading]);

  return {
    branding,
    themeColors,
    isLoading,
    saveBranding,
    saveThemeColors,
    uploadImage,
    loadSettings,
    applyPreset,
  };
};
