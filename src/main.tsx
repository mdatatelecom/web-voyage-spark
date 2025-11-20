import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Carregar branding ANTES de renderizar o React
async function initApp() {
  const rootElement = document.getElementById("root")!;
  
  // Mostrar loading HTML inicial
  rootElement.innerHTML = `
    <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.3s ease-out;">
      <div style="text-center;">
        <div style="font-size: 2rem; font-weight: bold; color: #1e293b; animation: pulse 2s ease-in-out infinite; margin-bottom: 1.5rem;">Carregando...</div>
        <div style="width: 3rem; height: 3rem; border: 3px solid #e2e8f0; border-top-color: #1e293b; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      </style>
    </div>
  `;
  
  // Intelligent cache system - only fetch if cache is missing or older than 1 hour
  const brandingCacheKey = 'branding_cache';
  const colorsCacheKey = 'theme_colors_cache';
  const cacheTimestampKey = 'settings_cache_timestamp';

  const lastCacheTime = localStorage.getItem(cacheTimestampKey);
  const cacheAge = lastCacheTime ? Date.now() - parseInt(lastCacheTime) : Infinity;
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  const cachedBranding = localStorage.getItem(brandingCacheKey);
  const cachedColors = localStorage.getItem(colorsCacheKey);
  const needsRefresh = !cachedBranding || !cachedColors || cacheAge > CACHE_DURATION;

  try {
    if (needsRefresh) {
      // Fetch fresh data from server
      const [brandingRes, colorsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/system_settings?setting_key=eq.branding&select=*`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/system_settings?setting_key=eq.theme_colors&select=*`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        })
      ]);
      
      const [brandingData, colorsData] = await Promise.all([
        brandingRes.json(),
        colorsRes.json()
      ]);
      
      // Apply branding
      if (brandingData[0]?.setting_value) {
        const branding = brandingData[0].setting_value;
        localStorage.setItem(brandingCacheKey, JSON.stringify(branding));
        document.title = `${branding.systemName} - Gestão de Infraestrutura`;
        
        if (branding.faviconUrl) {
          let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
          }
          favicon.href = branding.faviconUrl;
        }
      }
      
      // Apply theme colors
      if (colorsData[0]?.setting_value) {
        const colors = colorsData[0].setting_value;
        localStorage.setItem(colorsCacheKey, JSON.stringify(colors));
        
        const root = document.documentElement;
        root.style.setProperty('--primary', colors.primary || '222.2 47.4% 11.2%');
        root.style.setProperty('--primary-foreground', colors.primaryForeground || '210 40% 98%');
        root.style.setProperty('--secondary', colors.secondary || '210 40% 96.1%');
        root.style.setProperty('--secondary-foreground', colors.secondaryForeground || '222.2 47.4% 11.2%');
        root.style.setProperty('--accent', colors.accent || '210 40% 96.1%');
        root.style.setProperty('--accent-foreground', colors.accentForeground || '222.2 47.4% 11.2%');
        root.style.setProperty('--icon-color', colors.iconColor || '222.2 47.4% 11.2%');
        root.style.setProperty('--sidebar-background', colors.sidebarBackground || '0 0% 98%');
        root.style.setProperty('--sidebar-foreground', colors.sidebarForeground || '240 5.3% 26.1%');
        root.style.setProperty('--sidebar-primary', colors.sidebarPrimary || '240 5.9% 10%');
        root.style.setProperty('--sidebar-accent', colors.sidebarAccent || '240 4.8% 95.9%');
        root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground || '240 5.9% 10%');
        root.style.setProperty('--sidebar-border', colors.sidebarBorder || '220 13% 91%');
      }
      
      // Update cache timestamp
      localStorage.setItem(cacheTimestampKey, Date.now().toString());
    } else {
      // Apply from cache immediately
      const branding = JSON.parse(cachedBranding!);
      const colors = JSON.parse(cachedColors!);
      
      // Apply branding
      document.title = `${branding.systemName} - Gestão de Infraestrutura`;
      if (branding.faviconUrl) {
        let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = branding.faviconUrl;
      }
      
      // Apply theme colors
      const root = document.documentElement;
      root.style.setProperty('--primary', colors.primary || '222.2 47.4% 11.2%');
      root.style.setProperty('--primary-foreground', colors.primaryForeground || '210 40% 98%');
      root.style.setProperty('--secondary', colors.secondary || '210 40% 96.1%');
      root.style.setProperty('--secondary-foreground', colors.secondaryForeground || '222.2 47.4% 11.2%');
      root.style.setProperty('--accent', colors.accent || '210 40% 96.1%');
      root.style.setProperty('--accent-foreground', colors.accentForeground || '222.2 47.4% 11.2%');
      root.style.setProperty('--icon-color', colors.iconColor || '222.2 47.4% 11.2%');
      root.style.setProperty('--sidebar-background', colors.sidebarBackground || '0 0% 98%');
      root.style.setProperty('--sidebar-foreground', colors.sidebarForeground || '240 5.3% 26.1%');
      root.style.setProperty('--sidebar-primary', colors.sidebarPrimary || '240 5.9% 10%');
      root.style.setProperty('--sidebar-accent', colors.sidebarAccent || '240 4.8% 95.9%');
      root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground || '240 5.9% 10%');
      root.style.setProperty('--sidebar-border', colors.sidebarBorder || '220 13% 91%');
    }
  } catch (e) {
    console.error('❌ Erro ao carregar configurações:', e);
  }
  
  // Fade out do loading e renderizar React
  rootElement.style.opacity = '0';
  setTimeout(() => {
    createRoot(rootElement).render(<App />);
    rootElement.style.opacity = '1';
  }, 300);
}

// Iniciar aplicação
initApp();
