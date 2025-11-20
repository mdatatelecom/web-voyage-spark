export interface ColorPreset {
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    iconColor: string;
    sidebarBackground: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
  };
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: 'Light (Padrão)',
    description: 'Tema claro profissional',
    colors: {
      primary: '222.2 47.4% 11.2%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '222.2 47.4% 11.2%',
      sidebarBackground: '0 0% 98%',
      sidebarForeground: '240 5.3% 26.1%',
      sidebarPrimary: '240 5.9% 10%',
      sidebarAccent: '240 4.8% 95.9%',
      sidebarAccentForeground: '240 5.9% 10%',
      sidebarBorder: '220 13% 91%',
    }
  },
  {
    name: 'Dark',
    description: 'Tema escuro moderno',
    colors: {
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      iconColor: '210 40% 98%',
      sidebarBackground: '222.2 47.4% 11.2%',
      sidebarForeground: '210 40% 98%',
      sidebarPrimary: '210 40% 98%',
      sidebarAccent: '217.2 32.6% 17.5%',
      sidebarAccentForeground: '210 40% 98%',
      sidebarBorder: '217.2 32.6% 17.5%',
    }
  },
  {
    name: 'Blue Ocean',
    description: 'Azul profissional',
    colors: {
      primary: '221.2 83.2% 53.3%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '221.2 83.2% 53.3%',
      sidebarBackground: '210 40% 96.1%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '221.2 83.2% 53.3%',
      sidebarAccent: '210 40% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '214.3 31.8% 91.4%',
    }
  },
  {
    name: 'Green Nature',
    description: 'Verde natural',
    colors: {
      primary: '142.1 76.2% 36.3%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '142.1 76.2% 36.3%',
      sidebarBackground: '210 40% 96.1%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '142.1 76.2% 36.3%',
      sidebarAccent: '210 40% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '214.3 31.8% 91.4%',
    }
  },
];
