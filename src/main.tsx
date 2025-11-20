import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Carregar branding o mais cedo possível (antes do React renderizar)
(async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/system_settings?setting_key=eq.branding&select=*`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        }
      }
    );
    const data = await response.json();
    if (data[0]?.setting_value) {
      const branding = data[0].setting_value;
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
  } catch (e) {
    console.log('Failed to load branding early:', e);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
