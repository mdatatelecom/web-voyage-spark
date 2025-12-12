// Manufacturer brand colors for equipment visualization
export const MANUFACTURER_COLORS: Record<string, { primary: string; text: string }> = {
  // Network Equipment
  cisco: { primary: '#049fd9', text: '#ffffff' },
  dell: { primary: '#007db8', text: '#ffffff' },
  hp: { primary: '#0096d6', text: '#ffffff' },
  hpe: { primary: '#01a982', text: '#ffffff' },
  'hewlett packard': { primary: '#0096d6', text: '#ffffff' },
  ubiquiti: { primary: '#006fff', text: '#ffffff' },
  unifi: { primary: '#006fff', text: '#ffffff' },
  juniper: { primary: '#84b135', text: '#ffffff' },
  aruba: { primary: '#ff8300', text: '#ffffff' },
  mikrotik: { primary: '#293239', text: '#ffffff' },
  
  // Security
  fortinet: { primary: '#da291c', text: '#ffffff' },
  fortigate: { primary: '#da291c', text: '#ffffff' },
  paloalto: { primary: '#fa582d', text: '#ffffff' },
  'palo alto': { primary: '#fa582d', text: '#ffffff' },
  sophos: { primary: '#005bac', text: '#ffffff' },
  checkpoint: { primary: '#e21a23', text: '#ffffff' },
  
  // Surveillance
  hikvision: { primary: '#ed1c24', text: '#ffffff' },
  dahua: { primary: '#e60012', text: '#ffffff' },
  axis: { primary: '#ffcc00', text: '#000000' },
  intelbras: { primary: '#009640', text: '#ffffff' },
  
  // Storage
  qnap: { primary: '#0066a1', text: '#ffffff' },
  synology: { primary: '#000000', text: '#ffffff' },
  netapp: { primary: '#0067c5', text: '#ffffff' },
  emc: { primary: '#0076ce', text: '#ffffff' },
  
  // Power
  apc: { primary: '#ff6900', text: '#ffffff' },
  schneider: { primary: '#3dcd58', text: '#ffffff' },
  eaton: { primary: '#ff3a21', text: '#ffffff' },
  vertiv: { primary: '#ff6900', text: '#ffffff' },
  liebert: { primary: '#ff6900', text: '#ffffff' },
  nhs: { primary: '#003399', text: '#ffffff' },
  sms: { primary: '#e30613', text: '#ffffff' },
  'ts shara': { primary: '#0033a0', text: '#ffffff' },
  
  // Cables/Passive
  furukawa: { primary: '#e4002b', text: '#ffffff' },
  commscope: { primary: '#00a3e0', text: '#ffffff' },
  panduit: { primary: '#005eb8', text: '#ffffff' },
  legrand: { primary: '#ff5100', text: '#ffffff' },
  
  // Telecom
  huawei: { primary: '#cf0a2c', text: '#ffffff' },
  zte: { primary: '#0055a6', text: '#ffffff' },
  nokia: { primary: '#124191', text: '#ffffff' },
  ericsson: { primary: '#00529b', text: '#ffffff' },
  
  // Servers
  lenovo: { primary: '#e2231a', text: '#ffffff' },
  supermicro: { primary: '#003366', text: '#ffffff' },
  ibm: { primary: '#006699', text: '#ffffff' },
  
  // Other
  tplink: { primary: '#4acbd6', text: '#ffffff' },
  'tp-link': { primary: '#4acbd6', text: '#ffffff' },
  dlink: { primary: '#ff6600', text: '#ffffff' },
  'd-link': { primary: '#ff6600', text: '#ffffff' },
  netgear: { primary: '#9933cc', text: '#ffffff' },
  asus: { primary: '#000000', text: '#ffffff' },
  linksys: { primary: '#005eb8', text: '#ffffff' },
};

// Get manufacturer display properties
export const getManufacturerDisplay = (manufacturer: string): { primary: string; text: string; shortName: string } => {
  const normalizedKey = manufacturer.toLowerCase().replace(/[^a-z0-9]/g, '');
  const colors = MANUFACTURER_COLORS[normalizedKey] || 
                 MANUFACTURER_COLORS[manufacturer.toLowerCase()] || 
                 { primary: '#4b5563', text: '#ffffff' };
  
  // Create short name (max 6 chars)
  const shortName = manufacturer.substring(0, 6).toUpperCase();
  
  return { ...colors, shortName };
};

// Status LED colors based on equipment_status
export const STATUS_LED_COLORS: Record<string, { power: string; activity: string; animate: boolean }> = {
  active: { power: '#22c55e', activity: '#3b82f6', animate: true },
  planned: { power: '#9ca3af', activity: '#6b7280', animate: false },
  offline: { power: '#ef4444', activity: '#374151', animate: false },
  staged: { power: '#eab308', activity: '#6b7280', animate: false },
  failed: { power: '#ef4444', activity: '#ef4444', animate: true },
  decommissioning: { power: '#f97316', activity: '#374151', animate: false },
};

export const getStatusLEDColors = (status?: string) => {
  return STATUS_LED_COLORS[status || 'active'] || STATUS_LED_COLORS.active;
};
