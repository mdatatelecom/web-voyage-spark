// Centralized equipment color definitions for consistent UI across all views
export const EQUIPMENT_COLORS: Record<string, { hex: string; name: string }> = {
  // Network Equipment
  switch: { hex: '#3b82f6', name: 'Azul' },
  switch_poe: { hex: '#0284c7', name: 'Azul PoE' },
  router: { hex: '#10b981', name: 'Verde Esmeralda' },
  firewall: { hex: '#ef4444', name: 'Vermelho' },
  load_balancer: { hex: '#14b8a6', name: 'Teal' },
  waf: { hex: '#f59e0b', name: 'Âmbar' },
  access_point: { hex: '#06b6d4', name: 'Ciano' },
  media_converter: { hex: '#0891b2', name: 'Ciano Escuro' },
  media_converter_chassis: { hex: '#0e7490', name: 'Ciano Médio' },
  
  // Servers and Storage
  server: { hex: '#f97316', name: 'Laranja' },
  storage: { hex: '#ec4899', name: 'Rosa' },
  
  // Patch Panels
  patch_panel: { hex: '#6b7280', name: 'Cinza' },
  patch_panel_fiber: { hex: '#a855f7', name: 'Roxo Claro' },
  
  // Power Equipment
  pdu: { hex: '#8b5cf6', name: 'Roxo' },
  pdu_smart: { hex: '#9333ea', name: 'Roxo Escuro' },
  ups: { hex: '#eab308', name: 'Amarelo' },
  poe_injector: { hex: '#7c3aed', name: 'Violeta' },
  poe_splitter: { hex: '#a78bfa', name: 'Lavanda' },
  
  // Surveillance
  dvr: { hex: '#84cc16', name: 'Verde Lima' },
  nvr: { hex: '#65a30d', name: 'Verde Lima Escuro' },
  ip_camera: { hex: '#059669', name: 'Verde Câmera' },
  
  // Telecom
  pabx: { hex: '#c084fc', name: 'Violeta' },
  voip_gateway: { hex: '#a78bfa', name: 'Lavanda' },
  modem: { hex: '#22c55e', name: 'Verde' },
  olt: { hex: '#0ea5e9', name: 'Azul Céu' },
  onu: { hex: '#38bdf8', name: 'Azul Céu Claro' },
  dslam: { hex: '#0369a1', name: 'Azul Telecom' },
  msan: { hex: '#0c4a6e', name: 'Azul Escuro' },
  
  // Management
  kvm: { hex: '#6366f1', name: 'Índigo' },
  console_server: { hex: '#4f46e5', name: 'Índigo Escuro' },
  
  // Cable Management
  cable_organizer_horizontal: { hex: '#334155', name: 'Cinza Ardósia' },
  cable_organizer_vertical: { hex: '#1e293b', name: 'Cinza Escuro' },
  brush_panel: { hex: '#475569', name: 'Cinza Médio' },
  
  // Environmental Monitoring
  environment_sensor: { hex: '#16a34a', name: 'Verde Sensor' },
  rack_monitor: { hex: '#15803d', name: 'Verde Escuro' },
  
  // Accessories
  fixed_shelf: { hex: '#78716c', name: 'Cinza Stone' },
  
  // Other
  other: { hex: '#9ca3af', name: 'Cinza Claro' }
};

// Cable color definitions
export const CABLE_COLORS: Record<string, { hex: string; name: string }> = {
  utp_cat5e: { hex: '#94a3b8', name: 'Cinza Claro' },
  utp_cat6: { hex: '#64748b', name: 'Cinza' },
  utp_cat6a: { hex: '#475569', name: 'Cinza Escuro' },
  fiber_om3: { hex: '#f97316', name: 'Laranja' },
  fiber_om4: { hex: '#ea580c', name: 'Laranja Escuro' },
  fiber_os2: { hex: '#dc2626', name: 'Vermelho' },
  dac: { hex: '#22d3ee', name: 'Ciano' },
  other: { hex: '#9ca3af', name: 'Cinza Neutro' }
};

// Helper to get equipment color hex value
export const getEquipmentColor = (type: string): string => {
  return EQUIPMENT_COLORS[type]?.hex || EQUIPMENT_COLORS.other.hex;
};

// Helper to get cable color hex value
export const getCableColor = (cableType: string): string => {
  return CABLE_COLORS[cableType]?.hex || CABLE_COLORS.other.hex;
};
