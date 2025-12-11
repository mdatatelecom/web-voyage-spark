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
    // Chart colors
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
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
      chart1: '222.2 47.4% 11.2%',
      chart2: '142.1 76.2% 36.3%',
      chart3: '47.9 95.8% 53.1%',
      chart4: '262.1 83.3% 57.8%',
      chart5: '24.6 95% 53.1%',
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
      chart1: '210 40% 70%',
      chart2: '142.1 70.6% 45.3%',
      chart3: '47.9 95.8% 53.1%',
      chart4: '262.1 83.3% 67.8%',
      chart5: '24.6 95% 63.1%',
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
      chart1: '221.2 83.2% 53.3%',
      chart2: '199 89% 48%',
      chart3: '174 62% 47%',
      chart4: '245 58% 51%',
      chart5: '280 65% 60%',
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
      chart1: '142.1 76.2% 36.3%',
      chart2: '161 94% 30%',
      chart3: '84 81% 44%',
      chart4: '45 93% 47%',
      chart5: '27 96% 61%',
    }
  },
  {
    name: 'Sunset Orange',
    description: 'Laranja vibrante e energético',
    colors: {
      primary: '24.6 95% 53.1%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '24.6 95% 53.1%',
      sidebarBackground: '33 100% 96%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '24.6 95% 53.1%',
      sidebarAccent: '33 100% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '27.8 87.8% 88%',
      chart1: '24.6 95% 53.1%',
      chart2: '45 93% 47%',
      chart3: '0 84% 60%',
      chart4: '339 90% 51%',
      chart5: '280 65% 60%',
    }
  },
  {
    name: 'Golden Yellow',
    description: 'Amarelo dourado brilhante',
    colors: {
      primary: '45 93% 47%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '45 93% 47%',
      sidebarBackground: '48 100% 96%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '45 93% 47%',
      sidebarAccent: '48 100% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '47.9 95.8% 88.2%',
      chart1: '45 93% 47%',
      chart2: '24.6 95% 53.1%',
      chart3: '142.1 76.2% 36.3%',
      chart4: '199 89% 48%',
      chart5: '339 90% 51%',
    }
  },
  {
    name: 'Deep Purple',
    description: 'Roxo escuro sofisticado',
    colors: {
      primary: '262.1 83.3% 57.8%',
      primaryForeground: '210 40% 98%',
      secondary: '270 60% 95%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '270 60% 95%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '262.1 83.3% 57.8%',
      sidebarBackground: '270 60% 96%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '262.1 83.3% 57.8%',
      sidebarAccent: '270 60% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '270 60% 88%',
      chart1: '262.1 83.3% 57.8%',
      chart2: '280 65% 60%',
      chart3: '339 90% 51%',
      chart4: '221.2 83.2% 53.3%',
      chart5: '199 89% 48%',
    }
  },
  {
    name: 'Crimson Red',
    description: 'Vermelho intenso e poderoso',
    colors: {
      primary: '0 72% 51%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '0 72% 51%',
      sidebarBackground: '0 100% 97%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '0 72% 51%',
      sidebarAccent: '0 100% 92%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '0 72% 89%',
      chart1: '0 72% 51%',
      chart2: '339 90% 51%',
      chart3: '24.6 95% 53.1%',
      chart4: '45 93% 47%',
      chart5: '262.1 83.3% 57.8%',
    }
  },
  {
    name: 'Teal Cyan',
    description: 'Ciano moderno e fresco',
    colors: {
      primary: '189 94% 43%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '189 94% 43%',
      sidebarBackground: '187 100% 96%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '189 94% 43%',
      sidebarAccent: '187 100% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '188 95% 88%',
      chart1: '189 94% 43%',
      chart2: '174 62% 47%',
      chart3: '142.1 76.2% 36.3%',
      chart4: '221.2 83.2% 53.3%',
      chart5: '262.1 83.3% 57.8%',
    }
  },
  {
    name: 'Rose Pink',
    description: 'Rosa elegante',
    colors: {
      primary: '330 81% 60%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '330 81% 60%',
      sidebarBackground: '330 100% 97%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '330 81% 60%',
      sidebarAccent: '330 100% 92%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '330 81% 90%',
      chart1: '330 81% 60%',
      chart2: '339 90% 51%',
      chart3: '280 65% 60%',
      chart4: '262.1 83.3% 57.8%',
      chart5: '0 72% 51%',
    }
  },
  {
    name: 'Slate Gray',
    description: 'Cinza neutro profissional',
    colors: {
      primary: '215 16% 47%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      iconColor: '215 16% 47%',
      sidebarBackground: '210 20% 96%',
      sidebarForeground: '222.2 47.4% 11.2%',
      sidebarPrimary: '215 16% 47%',
      sidebarAccent: '210 20% 90%',
      sidebarAccentForeground: '222.2 47.4% 11.2%',
      sidebarBorder: '214 20% 88%',
      chart1: '215 16% 47%',
      chart2: '215 16% 60%',
      chart3: '215 16% 35%',
      chart4: '189 94% 43%',
      chart5: '221.2 83.2% 53.3%',
    }
  },
];
