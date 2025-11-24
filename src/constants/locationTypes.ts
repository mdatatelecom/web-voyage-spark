import { 
  Building2, Warehouse, Briefcase, Home, Building, GraduationCap, 
  Server, Truck, Factory, GitBranch, ShoppingCart, Heart, 
  School, Hotel, Store, Container, Zap, Phone, Monitor, Package 
} from 'lucide-react';

export const BUILDING_TYPES = [
  { value: 'commercial_building', label: 'Edifício Comercial', icon: Building2 },
  { value: 'warehouse', label: 'Galpão', icon: Warehouse },
  { value: 'office', label: 'Escritório', icon: Briefcase },
  { value: 'residence', label: 'Residência / Casa', icon: Home },
  { value: 'condominium', label: 'Condomínio', icon: Building },
  { value: 'campus', label: 'Campus', icon: GraduationCap },
  { value: 'data_center', label: 'Data Center Externo', icon: Server },
  { value: 'logistics_center', label: 'Centro Logístico', icon: Truck },
  { value: 'operational_unit', label: 'Unidade Operacional', icon: Factory },
  { value: 'headquarters', label: 'Sede', icon: Building2 },
  { value: 'branch', label: 'Filial', icon: GitBranch },
  { value: 'mall', label: 'Shopping / Centro Comercial', icon: ShoppingCart },
  { value: 'hospital', label: 'Hospital', icon: Heart },
  { value: 'school', label: 'Escola / Universidade', icon: School },
  { value: 'hotel', label: 'Hotel', icon: Hotel },
  { value: 'factory', label: 'Fábrica / Planta Industrial', icon: Factory },
  { value: 'store', label: 'Loja / Ponto Comercial', icon: Store },
  { value: 'container', label: 'Container Técnico', icon: Container },
  { value: 'substation', label: 'Subestação', icon: Zap },
  { value: 'telecom_center', label: 'Central Telefônica', icon: Phone },
  { value: 'monitoring_center', label: 'Central de Monitoramento', icon: Monitor },
  { value: 'storage', label: 'Estoque / Almoxarifado', icon: Package },
];

export const ROOM_TYPES = [
  // 🖥️ Infraestrutura de TI
  { value: 'data_center', label: 'Data Center', category: 'TI' },
  { value: 'cpd', label: 'CPD / Sala de TI', category: 'TI' },
  { value: 'noc', label: 'NOC – Centro de Operações', category: 'TI' },
  { value: 'server_room', label: 'Sala de Servidores', category: 'TI' },
  
  // 🔌 Infraestrutura Técnica
  { value: 'technical_room', label: 'Sala Técnica', category: 'Técnica' },
  { value: 'equipment_room', label: 'Sala de Equipamentos', category: 'Técnica' },
  { value: 'comm_room', label: 'Sala de Comunicações', category: 'Técnica' },
  { value: 'power_room', label: 'Sala de Energia / Nobreak', category: 'Técnica' },
  { value: 'cabling_room', label: 'Sala de Cabeamento', category: 'Técnica' },
  { value: 'mdf_idf', label: 'MDF / IDF', category: 'Técnica' },
  { value: 'telecom_rack', label: 'Racks de Telecom', category: 'Técnica' },
  
  // 🔒 Áreas Restritas
  { value: 'restricted_access', label: 'Sala de Acesso Restrito', category: 'Restrita' },
  { value: 'control_room', label: 'Sala de Controle', category: 'Restrita' },
  { value: 'monitoring_room', label: 'Sala de Monitoramento', category: 'Restrita' },
  
  // 🏢 Espaços Gerais
  { value: 'office', label: 'Escritório', category: 'Geral' },
  { value: 'warehouse', label: 'Galpão', category: 'Geral' },
  { value: 'storage', label: 'Estoque / Almoxarifado', category: 'Geral' },
  { value: 'container', label: 'Container Técnico', category: 'Geral' },
  { value: 'laboratory', label: 'Laboratório', category: 'Geral' },
  { value: 'other', label: 'Outro', category: 'Geral' },
];

export const ROOM_CATEGORIES = ['TI', 'Técnica', 'Restrita', 'Geral'];

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];
