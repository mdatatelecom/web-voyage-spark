import { 
  Network, Server, HardDrive, Cable, Shield, Scale, ShieldCheck, Wifi, 
  Plug, Battery, Video, Camera, Phone, PhoneCall, Radio, Zap, Monitor, 
  Terminal, Box, Usb, CircleDot, ToggleLeft, Circle, Square
} from 'lucide-react';

export const EQUIPMENT_CATEGORIES = [
  {
    id: 'network',
    label: 'Rede',
    icon: Network,
    types: [
      { value: 'switch', label: 'Switch', icon: Network },
      { value: 'router', label: 'Roteador', icon: Network },
      { value: 'firewall', label: 'Firewall', icon: Shield },
      { value: 'load_balancer', label: 'Load Balancer', icon: Scale },
      { value: 'waf', label: 'WAF', icon: ShieldCheck },
      { value: 'access_point', label: 'Access Point', icon: Wifi },
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
      { value: 'ups', label: 'UPS/NoBreak', icon: Battery },
    ]
  },
  {
    id: 'surveillance',
    label: 'CFTV/Monitoramento',
    icon: Video,
    types: [
      { value: 'dvr', label: 'DVR', icon: Video },
      { value: 'nvr', label: 'NVR', icon: Camera },
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
    id: 'other',
    label: 'Outros',
    icon: Box,
    types: [
      { value: 'other', label: 'Outro', icon: Box },
    ]
  }
];

export const PORT_TYPES = [
  // Ethernet
  { value: 'rj45', label: 'Ethernet (RJ45)', category: 'ethernet', icon: Cable, speeds: ['10Mbps', '100Mbps', '1Gbps', '2.5Gbps', '5Gbps', '10Gbps'] },
  
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
  { id: 'other', label: 'Outros' },
];
