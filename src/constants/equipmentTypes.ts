import { 
  Network, Server, HardDrive, Cable, Shield, Scale, ShieldCheck, Wifi, 
  Plug, Battery, Video, Camera, Phone, PhoneCall, Radio, Zap, Monitor, 
  Terminal, Box, Usb, CircleDot, ToggleLeft, Circle, Square, Activity,
  Thermometer, Gauge, ArrowRightLeft, Layers
} from 'lucide-react';

export const EQUIPMENT_CATEGORIES = [
  {
    id: 'network',
    label: 'Rede',
    icon: Network,
    types: [
      { value: 'switch', label: 'Switch', icon: Network },
      { value: 'switch_poe', label: 'Switch PoE', icon: Network },
      { value: 'router', label: 'Roteador', icon: Network },
      { value: 'firewall', label: 'Firewall', icon: Shield },
      { value: 'load_balancer', label: 'Load Balancer', icon: Scale },
      { value: 'waf', label: 'WAF', icon: ShieldCheck },
      { value: 'access_point', label: 'Access Point', icon: Wifi },
      { value: 'media_converter', label: 'Media Converter', icon: ArrowRightLeft },
      { value: 'media_converter_chassis', label: 'Chassis Media Converter', icon: Layers },
    ]
  },
  {
    id: 'servers',
    label: 'Servidores',
    icon: Server,
    types: [
      { value: 'server', label: 'Servidor', icon: Server },
    ]
  },
  {
    id: 'storage',
    label: 'Armazenamento',
    icon: HardDrive,
    types: [
      { value: 'storage', label: 'Storage/NAS', icon: HardDrive },
    ]
  },
  {
    id: 'patch_panels',
    label: 'Patch Panels',
    icon: Cable,
    types: [
      { value: 'patch_panel', label: 'Patch Panel UTP', icon: Cable },
      { value: 'patch_panel_fiber', label: 'Patch Panel Fibra', icon: Zap },
    ]
  },
  {
    id: 'power',
    label: 'Energia',
    icon: Plug,
    types: [
      { value: 'pdu', label: 'PDU', icon: Plug },
      { value: 'pdu_smart', label: 'PDU Inteligente', icon: Activity },
      { value: 'ups', label: 'UPS/NoBreak', icon: Battery },
      { value: 'poe_injector', label: 'Injetor PoE', icon: Zap },
      { value: 'poe_splitter', label: 'Splitter PoE', icon: Zap },
    ]
  },
  {
    id: 'surveillance',
    label: 'CFTV/Monitoramento',
    icon: Video,
    types: [
      { value: 'dvr', label: 'DVR', icon: Video },
      { value: 'nvr', label: 'NVR (Padrão)', icon: Camera },
      { value: 'nvr_poe', label: 'NVR com PoE', icon: Camera },
      { value: 'ip_camera', label: 'Câmera IP', icon: Camera },
      { value: 'analog_camera', label: 'Câmera Analógica', icon: Video },
    ]
  },
  {
    id: 'telecom',
    label: 'Telecom',
    icon: Phone,
    types: [
      { value: 'pabx', label: 'PABX', icon: Phone },
      { value: 'voip_gateway', label: 'Gateway VoIP', icon: PhoneCall },
      { value: 'modem', label: 'Modem', icon: Radio },
      { value: 'olt', label: 'OLT', icon: Zap },
      { value: 'onu', label: 'ONU/ONT', icon: Wifi },
      { value: 'dslam', label: 'DSLAM', icon: Network },
      { value: 'msan', label: 'MSAN', icon: Layers },
    ]
  },
  {
    id: 'management',
    label: 'Gerenciamento',
    icon: Monitor,
    types: [
      { value: 'kvm', label: 'KVM Switch', icon: Monitor },
      { value: 'console_server', label: 'Console Server', icon: Terminal },
    ]
  },
  {
    id: 'cable_management',
    label: 'Organização de Cabos',
    icon: Cable,
    types: [
      { value: 'cable_organizer_horizontal', label: 'Organizador Horizontal', icon: Cable },
      { value: 'cable_organizer_vertical', label: 'Organizador Vertical', icon: Cable },
      { value: 'brush_panel', label: 'Painel Escova', icon: Cable },
    ]
  },
  {
    id: 'environmental',
    label: 'Monitoramento Ambiental',
    icon: Thermometer,
    types: [
      { value: 'environment_sensor', label: 'Sensor Ambiental', icon: Thermometer },
      { value: 'rack_monitor', label: 'Monitor de Rack', icon: Gauge },
    ]
  },
  {
    id: 'accessories',
    label: 'Acessórios',
    icon: Box,
    types: [
      { value: 'fixed_shelf', label: 'Bandeja Fixa', icon: Box },
    ]
  },
  {
    id: 'other',
    label: 'Outros',
    icon: Box,
    types: [
      { value: 'other', label: 'Outro', icon: Box },
    ]
  }
];

// ============= POE POWER CONSUMPTION ESTIMATES =============
// Estimated power consumption in Watts for PoE-powered devices
export const POE_POWER_CONSUMPTION: Record<string, number> = {
  // IP Cameras - typically 8-15W
  ip_camera: 12,
  
  // Analog Cameras - External power (not PoE)
  analog_camera: 0,
  
  // DVR/NVR - Not PoE powered (external power)
  dvr: 0,
  nvr: 0,
  nvr_poe: 0,
  
  // Access Points - typically 10-25W
  access_point: 15,
  
  // VoIP equipment - 5-10W
  voip_gateway: 7,
  pabx: 0, // Usually external power
  
  // Sensors and monitors - 3-8W
  environment_sensor: 5,
  rack_monitor: 6,
  
  // PoE devices
  poe_splitter: 0, // Receives PoE, outputs DC
  
  // Network equipment (these PROVIDE PoE, don't consume)
  switch: 0,
  switch_poe: 0,
  router: 0,
  firewall: 0,
  load_balancer: 0,
  waf: 0,
  
  // Servers and storage (external power)
  server: 0,
  storage: 0,
  
  // Passive devices (no power)
  patch_panel: 0,
  patch_panel_fiber: 0,
  cable_organizer_horizontal: 0,
  cable_organizer_vertical: 0,
  brush_panel: 0,
  
  // Power devices
  pdu: 0,
  pdu_smart: 0,
  ups: 0,
  poe_injector: 0,
  
  // Media converters - typically 2-5W when PoE powered
  media_converter: 3,
  media_converter_chassis: 0, // External power
  
  // Telecom
  modem: 0,
  olt: 0,
  onu: 5, // Some ONUs support PoE
  dslam: 0,
  msan: 0,
  
  // Management
  kvm: 0,
  console_server: 0,
  
  // Accessories
  fixed_shelf: 0, // Passive accessory
  
  // Other
  other: 0,
};

// Equipment types that don't appear on network map (no network ports or passive devices)
export const NON_NETWORK_EQUIPMENT_TYPES = [
  'cable_organizer_horizontal',
  'cable_organizer_vertical',
  'brush_panel',
  'poe_injector',
  'poe_splitter',
  'ip_camera',
  'analog_camera',
  'environment_sensor',
  'fixed_shelf',
] as const;

// Helper to check if equipment is network-capable
export const isNetworkEquipment = (type: string): boolean => {
  return !NON_NETWORK_EQUIPMENT_TYPES.includes(type as any);
};

// ============= EQUIPMENT FIELD CONFIGURATION =============
// Define which fields are applicable to each equipment type (inspired by NetBox)

export interface EquipmentFieldConfig {
  hasNetwork: boolean;      // Shows hostname/IP fields
  hasPorts: boolean;        // Can have configurable ports
  hasConsolePorts: boolean; // Has console ports
  hasPowerPorts: boolean;   // Has power outlets
  defaultPortTypes: string[];
  recommendedMountSide: 'front' | 'rear' | 'both';
  defaultUHeight: number;
  fields: {
    hostname: boolean;
    ipAddress: boolean;
    macAddress: boolean;
    assetTag: boolean;
    powerConsumption: boolean;
    airflow: boolean;
    weight: boolean;
  };
}

export const EQUIPMENT_FIELD_CONFIG: Record<string, EquipmentFieldConfig> = {
  // === NETWORK EQUIPMENT - Full network capabilities ===
  switch: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  router: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  firewall: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  load_balancer: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  waf: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  access_point: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  
  // === SERVERS - Full capabilities ===
  server: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  
  // === STORAGE - Network + Storage ===
  storage: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  
  // === PASSIVE DEVICES - NO NETWORK, ONLY PORTS ===
  patch_panel: {
    hasNetwork: false,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: false, airflow: false, weight: true }
  },
  patch_panel_fiber: {
    hasNetwork: false,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['fiber_lc', 'fiber_sc'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: false, airflow: false, weight: true }
  },
  
  // === CABLE MANAGEMENT - NO NETWORK, NO PORTS ===
  cable_organizer_horizontal: {
    hasNetwork: false,
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: [],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: false, powerConsumption: false, airflow: false, weight: false }
  },
  cable_organizer_vertical: {
    hasNetwork: false,
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: [],
    recommendedMountSide: 'both',
    defaultUHeight: 0,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: false, powerConsumption: false, airflow: false, weight: false }
  },
  brush_panel: {
    hasNetwork: false,
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: [],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: false, powerConsumption: false, airflow: false, weight: false }
  },
  
  // === POWER EQUIPMENT - Power outlets, optional network ===
  pdu: {
    hasNetwork: false, // Basic PDU (Smart PDU would have network)
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['power_ac'],
    recommendedMountSide: 'rear',
    defaultUHeight: 0, // Zero-U (vertical)
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  ups: {
    hasNetwork: true, // Usually has management interface
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['power_ac'],
    recommendedMountSide: 'rear',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  
  // === SURVEILLANCE - Network + Video ===
  dvr: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['bnc', 'hdmi'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  nvr: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'hdmi'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  
  // === TELECOM - Network + Telecom ports ===
  pabx: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'fxo_fxs'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  voip_gateway: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'fxo_fxs'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  modem: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  olt: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['sfp', 'rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  onu: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  
  // === MANAGEMENT - Network + Console ===
  kvm: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: false,
    defaultPortTypes: ['hdmi', 'usb'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  console_server: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['console_rj45', 'rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  
  // === NEW NETWORK EQUIPMENT ===
  switch_poe: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45_poe_plus', 'sfp_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  media_converter: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45', 'sfp'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  media_converter_chassis: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  
  // === NEW POWER EQUIPMENT ===
  pdu_smart: {
    hasNetwork: true,
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['power_ac'],
    recommendedMountSide: 'rear',
    defaultUHeight: 0,
    fields: { hostname: true, ipAddress: true, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  poe_injector: {
    hasNetwork: false,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45', 'rj45_poe_plus'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  poe_splitter: {
    hasNetwork: false,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45_poe', 'rj45', 'power_dc'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: false, airflow: false, weight: false }
  },
  
  // === NEW SURVEILLANCE ===
  ip_camera: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45_poe'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  analog_camera: {
    hasNetwork: false,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['bnc'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  nvr_poe: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'rj45_poe', 'hdmi'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  
  // === NEW TELECOM ===
  dslam: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp'],
    recommendedMountSide: 'front',
    defaultUHeight: 2,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  msan: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: true,
    hasPowerPorts: true,
    defaultPortTypes: ['rj45', 'sfp', 'fxo_fxs'],
    recommendedMountSide: 'front',
    defaultUHeight: 3,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  },
  
  // === ENVIRONMENTAL MONITORING ===
  environment_sensor: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45', 'sensor_io'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: false }
  },
  rack_monitor: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45', 'sensor_io'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: false, weight: true }
  },
  
  // === ACCESSORIES ===
  fixed_shelf: {
    hasNetwork: false,
    hasPorts: false,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: [],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: false, ipAddress: false, macAddress: false, assetTag: true, powerConsumption: false, airflow: false, weight: true }
  },
  
  // === OTHER ===
  other: {
    hasNetwork: true,
    hasPorts: true,
    hasConsolePorts: false,
    hasPowerPorts: false,
    defaultPortTypes: ['rj45'],
    recommendedMountSide: 'front',
    defaultUHeight: 1,
    fields: { hostname: true, ipAddress: true, macAddress: true, assetTag: true, powerConsumption: true, airflow: true, weight: true }
  }
};

// Helper function to get field config for an equipment type
export const getEquipmentFieldConfig = (type: string): EquipmentFieldConfig => {
  return EQUIPMENT_FIELD_CONFIG[type] || EQUIPMENT_FIELD_CONFIG.other;
};

// Equipment status options
export const EQUIPMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'bg-green-500' },
  { value: 'planned', label: 'Planejado', color: 'bg-blue-500' },
  { value: 'staged', label: 'Preparado', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-500' },
  { value: 'failed', label: 'Com Falha', color: 'bg-red-500' },
  { value: 'decommissioning', label: 'Em Desativação', color: 'bg-orange-500' },
];

// Airflow direction options
export const AIRFLOW_OPTIONS = [
  { value: 'front-to-rear', label: 'Frontal → Traseira' },
  { value: 'rear-to-front', label: 'Traseira → Frontal' },
  { value: 'left-to-right', label: 'Esquerda → Direita' },
  { value: 'right-to-left', label: 'Direita → Esquerda' },
  { value: 'passive', label: 'Passivo / N/A' },
];

export const PORT_TYPES = [
  // Ethernet
  { value: 'rj45', label: 'Ethernet (RJ45)', category: 'ethernet', icon: Cable, speeds: ['10Mbps', '100Mbps', '1Gbps', '2.5Gbps', '5Gbps', '10Gbps'] },
  { value: 'rj45_poe', label: 'Ethernet PoE (802.3af)', category: 'ethernet', icon: Zap, speeds: ['10Mbps', '100Mbps', '1Gbps'] },
  { value: 'rj45_poe_plus', label: 'Ethernet PoE+ (802.3at)', category: 'ethernet', icon: Zap, speeds: ['10Mbps', '100Mbps', '1Gbps', '2.5Gbps'] },
  { value: 'rj45_poe_plus_plus', label: 'Ethernet PoE++ (802.3bt)', category: 'ethernet', icon: Zap, speeds: ['1Gbps', '2.5Gbps', '5Gbps', '10Gbps'] },
  
  // Fibra - Transceivers
  { value: 'sfp', label: 'Fibra – SFP', category: 'fiber', icon: Zap, speeds: ['1Gbps'] },
  { value: 'sfp_plus', label: 'Fibra – SFP+', category: 'fiber', icon: Zap, speeds: ['10Gbps'] },
  { value: 'sfp28', label: 'Fibra – SFP28', category: 'fiber', icon: Zap, speeds: ['25Gbps'] },
  { value: 'qsfp', label: 'Fibra – QSFP', category: 'fiber', icon: Zap, speeds: ['40Gbps'] },
  { value: 'qsfp28', label: 'Fibra – QSFP28', category: 'fiber', icon: Zap, speeds: ['100Gbps'] },
  
  // Fibra - Conectores
  { value: 'fiber_lc', label: 'Fibra – LC', category: 'fiber', icon: Circle, speeds: ['1Gbps', '10Gbps'] },
  { value: 'fiber_sc', label: 'Fibra – SC', category: 'fiber', icon: Square, speeds: ['1Gbps', '10Gbps'] },
  
  // Vídeo/CFTV
  { value: 'bnc', label: 'BNC (CFTV)', category: 'video', icon: Video, speeds: [] },
  { value: 'hdmi', label: 'HDMI', category: 'video', icon: Monitor, speeds: [] },
  { value: 'vga', label: 'VGA', category: 'video', icon: Monitor, speeds: [] },
  
  // Gerenciamento
  { value: 'usb', label: 'USB', category: 'management', icon: Usb, speeds: [] },
  { value: 'serial', label: 'Serial', category: 'management', icon: Terminal, speeds: [] },
  { value: 'console_rj45', label: 'Console RJ45', category: 'management', icon: Terminal, speeds: [] },
  { value: 'console_usb', label: 'Console USB', category: 'management', icon: Usb, speeds: [] },
  
  // Telecom
  { value: 'fxo_fxs', label: 'FXO / FXS', category: 'telecom', icon: Phone, speeds: [] },
  { value: 'e1_t1', label: 'E1 / T1', category: 'telecom', icon: Radio, speeds: [] },
  
  // Energia
  { value: 'power_ac', label: 'Energia AC', category: 'power', icon: Plug, speeds: [] },
  { value: 'power_dc', label: 'Energia DC', category: 'power', icon: Battery, speeds: [] },
  
  // Sensores
  { value: 'sensor_io', label: 'Sensor I/O', category: 'sensor', icon: Thermometer, speeds: [] },
  
  // Outros
  { value: 'antenna_sma', label: 'Antena SMA', category: 'other', icon: Radio, speeds: [] },
  { value: 'rs485_rs232', label: 'RS-485 / RS-232', category: 'other', icon: Terminal, speeds: [] },
  { value: 'io', label: 'I/O', category: 'other', icon: ToggleLeft, speeds: [] },
  { value: 'other', label: 'Outro', category: 'other', icon: CircleDot, speeds: [] },
];

export const PORT_TYPE_CATEGORIES = [
  { id: 'ethernet', label: 'Ethernet' },
  { id: 'fiber', label: 'Fibra Óptica' },
  { id: 'video', label: 'Vídeo/CFTV' },
  { id: 'management', label: 'Gerenciamento' },
  { id: 'telecom', label: 'Telecom' },
  { id: 'power', label: 'Energia' },
  { id: 'sensor', label: 'Sensores' },
  { id: 'other', label: 'Outros' },
];

// Port compatibility mapping for connection suggestions
export const PORT_COMPATIBILITY: Record<string, string[]> = {
  // Ethernet - compatível entre si
  'rj45': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  'rj45_poe': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  'rj45_poe_plus': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  'rj45_poe_plus_plus': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  
  // Fibra - SFP família
  'sfp': ['sfp', 'fiber_lc', 'fiber_sc'],
  'sfp_plus': ['sfp_plus', 'fiber_lc', 'fiber_sc'],
  'sfp28': ['sfp28', 'fiber_lc', 'fiber_sc'],
  'qsfp': ['qsfp'],
  'qsfp28': ['qsfp28'],
  'fiber_lc': ['fiber_lc', 'sfp', 'sfp_plus', 'sfp28'],
  'fiber_sc': ['fiber_sc', 'sfp', 'sfp_plus', 'sfp28'],
  
  // Vídeo
  'bnc': ['bnc'],
  'hdmi': ['hdmi'],
  'vga': ['vga'],
  
  // Console/Serial
  'console_rj45': ['console_rj45', 'serial'],
  'console_usb': ['console_usb', 'usb'],
  'serial': ['serial', 'console_rj45'],
  
  // Telecom
  'fxo_fxs': ['fxo_fxs'],
  'e1_t1': ['e1_t1'],
  
  // Power
  'power_ac': ['power_ac'],
  'power_dc': ['power_dc'],
  
  // Sensor
  'sensor_io': ['sensor_io', 'io'],
  
  // Other
  'antenna_sma': ['antenna_sma'],
  'rs485_rs232': ['rs485_rs232'],
  'io': ['io', 'sensor_io'],
  'usb': ['usb', 'console_usb'],
  'other': ['other'],
};

export const getCompatiblePortTypes = (portType: string): string[] => {
  return PORT_COMPATIBILITY[portType] || [portType];
};
