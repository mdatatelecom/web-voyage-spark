import { 
  Building2, Warehouse, Briefcase, Home, Building, GraduationCap, 
  Server, Truck, Factory, GitBranch, ShoppingCart, Heart, 
  School, Hotel, Store, Container, Zap, Phone, Monitor, Package 
} from 'lucide-react';

export const BUILDING_TYPES = [
  { value: 'commercial_building', label: 'Edifício Comercial', icon: Building2, usesFloors: true },
  { value: 'warehouse', label: 'Galpão', icon: Warehouse, usesFloors: false },
  { value: 'office', label: 'Escritório', icon: Briefcase, usesFloors: false },
  { value: 'residence', label: 'Residência / Casa', icon: Home, usesFloors: false },
  { value: 'condominium', label: 'Condomínio', icon: Building, usesFloors: true },
  { value: 'other', label: 'Outro', icon: Package, usesFloors: false },
];

// Mapeamento de terminologia por tipo de edificação
export const LOCATION_TERMINOLOGY = {
  commercial_building: {
    level: { singular: 'Andar', plural: 'Andares' },
    levelNumber: 'Número do Andar',
    newLevel: 'Novo Andar',
    editLevel: 'Editar Andar',
    noLevels: 'Nenhum andar cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro andar',
    viewRooms: 'Ver Salas',
  },
  condominium: {
    level: { singular: 'Andar', plural: 'Andares' },
    levelNumber: 'Número do Andar',
    newLevel: 'Novo Andar',
    editLevel: 'Editar Andar',
    noLevels: 'Nenhum andar cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro andar',
    viewRooms: 'Ver Salas',
  },
  warehouse: {
    level: { singular: 'Setor', plural: 'Setores' },
    levelNumber: 'Identificação do Setor',
    newLevel: 'Novo Setor',
    editLevel: 'Editar Setor',
    noLevels: 'Nenhum setor cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro setor',
    viewRooms: 'Ver Salas',
  },
  office: {
    level: { singular: 'Setor', plural: 'Setores' },
    levelNumber: 'Identificação do Setor',
    newLevel: 'Novo Setor',
    editLevel: 'Editar Setor',
    noLevels: 'Nenhum setor cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro setor',
    viewRooms: 'Ver Salas',
  },
  residence: {
    level: { singular: 'Setor', plural: 'Setores' },
    levelNumber: 'Identificação do Setor',
    newLevel: 'Novo Setor',
    editLevel: 'Editar Setor',
    noLevels: 'Nenhum setor cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro setor',
    viewRooms: 'Ver Salas',
  },
  other: {
    level: { singular: 'Setor', plural: 'Setores' },
    levelNumber: 'Identificação do Setor',
    newLevel: 'Novo Setor',
    editLevel: 'Editar Setor',
    noLevels: 'Nenhum setor cadastrado',
    addFirstLevel: 'Comece adicionando o primeiro setor',
    viewRooms: 'Ver Salas',
  },
};

// Função utilitária para obter terminologia
export function getTerminology(buildingType: string | null | undefined) {
  return LOCATION_TERMINOLOGY[buildingType as keyof typeof LOCATION_TERMINOLOGY] 
    || LOCATION_TERMINOLOGY.other;
}

// Função para verificar se usa andares ou setores
export function usesFloors(buildingType: string | null | undefined): boolean {
  const type = BUILDING_TYPES.find(t => t.value === buildingType);
  return type?.usesFloors ?? false;
}

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
