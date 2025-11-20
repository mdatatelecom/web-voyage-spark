export interface LogoPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
}

export const LOGO_PRESETS: LogoPreset[] = [
  // Tecnologia
  {
    id: 'tech-network',
    name: 'Network Grid',
    category: 'Tecnologia',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%234F46E5" width="200" height="200" rx="20"/%3E%3Ccircle cx="50" cy="50" r="15" fill="white"/%3E%3Ccircle cx="150" cy="50" r="15" fill="white"/%3E%3Ccircle cx="50" cy="150" r="15" fill="white"/%3E%3Ccircle cx="150" cy="150" r="15" fill="white"/%3E%3Ccircle cx="100" cy="100" r="20" fill="white"/%3E%3Cline x1="50" y1="50" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="150" y1="50" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="50" y1="150" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="150" y1="150" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%234F46E5" width="200" height="200" rx="20"/%3E%3Ccircle cx="50" cy="50" r="15" fill="white"/%3E%3Ccircle cx="150" cy="50" r="15" fill="white"/%3E%3Ccircle cx="50" cy="150" r="15" fill="white"/%3E%3Ccircle cx="150" cy="150" r="15" fill="white"/%3E%3Ccircle cx="100" cy="100" r="20" fill="white"/%3E%3Cline x1="50" y1="50" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="150" y1="50" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="50" y1="150" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3Cline x1="150" y1="150" x2="100" y2="100" stroke="white" stroke-width="3"/%3E%3C/svg%3E'
  },
  {
    id: 'tech-server',
    name: 'Server Rack',
    category: 'Tecnologia',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2310B981" width="200" height="200" rx="20"/%3E%3Crect x="40" y="40" width="120" height="30" rx="5" fill="white"/%3E%3Crect x="40" y="85" width="120" height="30" rx="5" fill="white"/%3E%3Crect x="40" y="130" width="120" height="30" rx="5" fill="white"/%3E%3Ccircle cx="55" cy="55" r="5" fill="%2310B981"/%3E%3Ccircle cx="55" cy="100" r="5" fill="%2310B981"/%3E%3Ccircle cx="55" cy="145" r="5" fill="%2310B981"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2310B981" width="200" height="200" rx="20"/%3E%3Crect x="40" y="40" width="120" height="30" rx="5" fill="white"/%3E%3Crect x="40" y="85" width="120" height="30" rx="5" fill="white"/%3E%3Crect x="40" y="130" width="120" height="30" rx="5" fill="white"/%3E%3Ccircle cx="55" cy="55" r="5" fill="%2310B981"/%3E%3Ccircle cx="55" cy="100" r="5" fill="%2310B981"/%3E%3Ccircle cx="55" cy="145" r="5" fill="%2310B981"/%3E%3C/svg%3E'
  },
  {
    id: 'tech-cloud',
    name: 'Cloud Data',
    category: 'Tecnologia',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2306B6D4" width="200" height="200" rx="20"/%3E%3Cpath d="M60 100c0-15 12-27 27-27 3 0 6 1 9 2 5-10 16-17 28-17 17 0 31 14 31 31 0 2 0 4-1 6 11 2 20 12 20 23 0 13-11 24-24 24H71c-13 0-24-11-24-24 0-11 8-21 19-23-4-2-6-6-6-10z" fill="white"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2306B6D4" width="200" height="200" rx="20"/%3E%3Cpath d="M60 100c0-15 12-27 27-27 3 0 6 1 9 2 5-10 16-17 28-17 17 0 31 14 31 31 0 2 0 4-1 6 11 2 20 12 20 23 0 13-11 24-24 24H71c-13 0-24-11-24-24 0-11 8-21 19-23-4-2-6-6-6-10z" fill="white"/%3E%3C/svg%3E'
  },
  {
    id: 'tech-chip',
    name: 'Microchip',
    category: 'Tecnologia',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%238B5CF6" width="200" height="200" rx="20"/%3E%3Crect x="60" y="60" width="80" height="80" rx="10" fill="white"/%3E%3Crect x="80" y="80" width="40" height="40" rx="5" fill="%238B5CF6"/%3E%3Cline x1="40" y1="80" x2="60" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="40" y1="100" x2="60" y2="100" stroke="white" stroke-width="4"/%3E%3Cline x1="40" y1="120" x2="60" y2="120" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="80" x2="160" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="100" x2="160" y2="100" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="120" x2="160" y2="120" stroke="white" stroke-width="4"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%238B5CF6" width="200" height="200" rx="20"/%3E%3Crect x="60" y="60" width="80" height="80" rx="10" fill="white"/%3E%3Crect x="80" y="80" width="40" height="40" rx="5" fill="%238B5CF6"/%3E%3Cline x1="40" y1="80" x2="60" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="40" y1="100" x2="60" y2="100" stroke="white" stroke-width="4"/%3E%3Cline x1="40" y1="120" x2="60" y2="120" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="80" x2="160" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="100" x2="160" y2="100" stroke="white" stroke-width="4"/%3E%3Cline x1="140" y1="120" x2="160" y2="120" stroke="white" stroke-width="4"/%3E%3C/svg%3E'
  },
  // Infraestrutura
  {
    id: 'infra-building',
    name: 'Building',
    category: 'Infraestrutura',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23F59E0B" width="200" height="200" rx="20"/%3E%3Crect x="60" y="50" width="80" height="110" fill="white"/%3E%3Crect x="75" y="70" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="70" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="75" y="95" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="95" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="75" y="120" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="120" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="85" y="140" width="30" height="20" fill="%23F59E0B"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23F59E0B" width="200" height="200" rx="20"/%3E%3Crect x="60" y="50" width="80" height="110" fill="white"/%3E%3Crect x="75" y="70" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="70" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="75" y="95" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="95" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="75" y="120" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="110" y="120" width="15" height="15" fill="%23F59E0B"/%3E%3Crect x="85" y="140" width="30" height="20" fill="%23F59E0B"/%3E%3C/svg%3E'
  },
  {
    id: 'infra-datacenter',
    name: 'Data Center',
    category: 'Infraestrutura',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23DC2626" width="200" height="200" rx="20"/%3E%3Cpath d="M100 40L40 80v80h120V80z" fill="white"/%3E%3Crect x="70" y="100" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="105" y="100" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="70" y="130" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="105" y="130" width="25" height="20" fill="%23DC2626"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23DC2626" width="200" height="200" rx="20"/%3E%3Cpath d="M100 40L40 80v80h120V80z" fill="white"/%3E%3Crect x="70" y="100" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="105" y="100" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="70" y="130" width="25" height="20" fill="%23DC2626"/%3E%3Crect x="105" y="130" width="25" height="20" fill="%23DC2626"/%3E%3C/svg%3E'
  },
  {
    id: 'infra-tower',
    name: 'Tower',
    category: 'Infraestrutura',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23EC4899" width="200" height="200" rx="20"/%3E%3Cpolygon points="100,40 70,160 130,160" fill="white"/%3E%3Cline x1="50" y1="80" x2="70" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="130" y1="80" x2="150" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="55" y1="120" x2="75" y2="120" stroke="white" stroke-width="4"/%3E%3Cline x1="125" y1="120" x2="145" y2="120" stroke="white" stroke-width="4"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23EC4899" width="200" height="200" rx="20"/%3E%3Cpolygon points="100,40 70,160 130,160" fill="white"/%3E%3Cline x1="50" y1="80" x2="70" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="130" y1="80" x2="150" y2="80" stroke="white" stroke-width="4"/%3E%3Cline x1="55" y1="120" x2="75" y2="120" stroke="white" stroke-width="4"/%3E%3Cline x1="125" y1="120" x2="145" y2="120" stroke="white" stroke-width="4"/%3E%3C/svg%3E'
  },
  // Conectividade
  {
    id: 'conn-link',
    name: 'Link Chain',
    category: 'Conectividade',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2314B8A6" width="200" height="200" rx="20"/%3E%3Cpath d="M80 70h40c16 0 30 14 30 30s-14 30-30 30H80" stroke="white" stroke-width="12" fill="none" stroke-linecap="round"/%3E%3Cpath d="M120 130H80c-16 0-30-14-30-30s14-30 30-30h40" stroke="white" stroke-width="12" fill="none" stroke-linecap="round"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2314B8A6" width="200" height="200" rx="20"/%3E%3Cpath d="M80 70h40c16 0 30 14 30 30s-14 30-30 30H80" stroke="white" stroke-width="12" fill="none" stroke-linecap="round"/%3E%3Cpath d="M120 130H80c-16 0-30-14-30-30s14-30 30-30h40" stroke="white" stroke-width="12" fill="none" stroke-linecap="round"/%3E%3C/svg%3E'
  },
  {
    id: 'conn-wifi',
    name: 'WiFi Signal',
    category: 'Conectividade',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%233B82F6" width="200" height="200" rx="20"/%3E%3Ccircle cx="100" cy="140" r="10" fill="white"/%3E%3Cpath d="M70 110c16-16 44-16 60 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3Cpath d="M50 80c30-30 70-30 100 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3Cpath d="M30 50c45-45 95-45 140 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%233B82F6" width="200" height="200" rx="20"/%3E%3Ccircle cx="100" cy="140" r="10" fill="white"/%3E%3Cpath d="M70 110c16-16 44-16 60 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3Cpath d="M50 80c30-30 70-30 100 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3Cpath d="M30 50c45-45 95-45 140 0" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/%3E%3C/svg%3E'
  },
  {
    id: 'conn-cable',
    name: 'Network Cable',
    category: 'Conectividade',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2306B6D4" width="200" height="200" rx="20"/%3E%3Crect x="40" y="80" width="30" height="40" rx="5" fill="white"/%3E%3Crect x="130" y="80" width="30" height="40" rx="5" fill="white"/%3E%3Cpath d="M70 100h60" stroke="white" stroke-width="8" stroke-linecap="round"/%3E%3Crect x="50" y="95" width="10" height="10" fill="%2306B6D4"/%3E%3Crect x="140" y="95" width="10" height="10" fill="%2306B6D4"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%2306B6D4" width="200" height="200" rx="20"/%3E%3Crect x="40" y="80" width="30" height="40" rx="5" fill="white"/%3E%3Crect x="130" y="80" width="30" height="40" rx="5" fill="white"/%3E%3Cpath d="M70 100h60" stroke="white" stroke-width="8" stroke-linecap="round"/%3E%3Crect x="50" y="95" width="10" height="10" fill="%2306B6D4"/%3E%3Crect x="140" y="95" width="10" height="10" fill="%2306B6D4"/%3E%3C/svg%3E'
  },
  // Empresarial
  {
    id: 'biz-globe',
    name: 'Global Network',
    category: 'Empresarial',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23059669" width="200" height="200" rx="20"/%3E%3Ccircle cx="100" cy="100" r="60" stroke="white" stroke-width="6" fill="none"/%3E%3Cellipse cx="100" cy="100" rx="25" ry="60" stroke="white" stroke-width="6" fill="none"/%3E%3Cline x1="40" y1="100" x2="160" y2="100" stroke="white" stroke-width="6"/%3E%3Cline x1="100" y1="40" x2="100" y2="160" stroke="white" stroke-width="6"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23059669" width="200" height="200" rx="20"/%3E%3Ccircle cx="100" cy="100" r="60" stroke="white" stroke-width="6" fill="none"/%3E%3Cellipse cx="100" cy="100" rx="25" ry="60" stroke="white" stroke-width="6" fill="none"/%3E%3Cline x1="40" y1="100" x2="160" y2="100" stroke="white" stroke-width="6"/%3E%3Cline x1="100" y1="40" x2="100" y2="160" stroke="white" stroke-width="6"/%3E%3C/svg%3E'
  },
  {
    id: 'biz-shield',
    name: 'Security Shield',
    category: 'Empresarial',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23DC2626" width="200" height="200" rx="20"/%3E%3Cpath d="M100 40L50 60v40c0 35 25 60 50 70 25-10 50-35 50-70V60z" fill="white"/%3E%3Cpath d="M85 100l10 10 20-20" stroke="%23DC2626" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23DC2626" width="200" height="200" rx="20"/%3E%3Cpath d="M100 40L50 60v40c0 35 25 60 50 70 25-10 50-35 50-70V60z" fill="white"/%3E%3Cpath d="M85 100l10 10 20-20" stroke="%23DC2626" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E'
  },
  {
    id: 'biz-briefcase',
    name: 'Business',
    category: 'Empresarial',
    url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23475569" width="200" height="200" rx="20"/%3E%3Crect x="40" y="80" width="120" height="80" rx="10" fill="white"/%3E%3Crect x="70" y="50" width="60" height="30" rx="5" fill="white"/%3E%3Crect x="85" y="110" width="30" height="20" rx="5" fill="%23475569"/%3E%3C/svg%3E',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23475569" width="200" height="200" rx="20"/%3E%3Crect x="40" y="80" width="120" height="80" rx="10" fill="white"/%3E%3Crect x="70" y="50" width="60" height="30" rx="5" fill="white"/%3E%3Crect x="85" y="110" width="30" height="20" rx="5" fill="%23475569"/%3E%3C/svg%3E'
  }
];

export const LOGO_CATEGORIES = [
  'Tecnologia',
  'Infraestrutura',
  'Conectividade',
  'Empresarial'
];
