export const CAMERA_RESOLUTIONS = [
  { value: '2mp', label: '2 MP (1080p)', bitrate: '4-8 Mbps' },
  { value: '4mp', label: '4 MP (1440p)', bitrate: '8-12 Mbps' },
  { value: '5mp', label: '5 MP (1920p)', bitrate: '10-16 Mbps' },
  { value: '8mp', label: '8 MP (4K)', bitrate: '16-25 Mbps' },
] as const;

export const CAMERA_CODECS = [
  { value: 'h264', label: 'H.264', efficiency: 'Padrão' },
  { value: 'h265', label: 'H.265', efficiency: 'Alta Compressão' },
  { value: 'h265+', label: 'H.265+', efficiency: 'Máxima' },
] as const;

export const CAMERA_TYPES = [
  { value: 'dome', label: 'Dome', icon: '🔵', description: 'Teto/parede, discreta' },
  { value: 'bullet', label: 'Bullet', icon: '📷', description: 'Externa, longo alcance' },
  { value: 'turret', label: 'Turret', icon: '🎯', description: 'Híbrida dome/bullet' },
  { value: 'ptz', label: 'PTZ', icon: '🔄', description: 'Pan-Tilt-Zoom' },
  { value: 'fisheye', label: 'Fisheye', icon: '👁️', description: '360° panorâmica' },
] as const;

export const POE_CLASSES = [
  { value: 'af', label: '802.3af (PoE)', maxWatts: 15.4, portType: 'rj45_poe' },
  { value: 'at', label: '802.3at (PoE+)', maxWatts: 30, portType: 'rj45_poe_plus' },
  { value: 'bt', label: '802.3bt (PoE++)', maxWatts: 60, portType: 'rj45_poe_plus_plus' },
] as const;

export const CAMERA_MANUFACTURERS = [
  { id: 'hikvision', name: 'Hikvision', color: '#ed1c24', logo: '🔴' },
  { id: 'dahua', name: 'Dahua', color: '#00a0e9', logo: '🔵' },
  { id: 'intelbras', name: 'Intelbras', color: '#00a859', logo: '🟢' },
  { id: 'axis', name: 'Axis', color: '#ffcc00', logo: '🟡' },
  { id: 'hanwha', name: 'Hanwha/Samsung', color: '#1428a0', logo: '🔷' },
  { id: 'other', name: 'Outro', color: '#6b7280', logo: '⚪' },
] as const;

// Camera templates with detailed specs
export interface CameraTemplate {
  id: string;
  manufacturer: string;
  model: string;
  resolution: string;
  codec: string;
  cameraType: string;
  poeClass: string;
  powerConsumption: number;
  hasIR: boolean;
  irRange?: number;
  hasAudio: boolean;
  hasSD: boolean;
}

export const CAMERA_TEMPLATES: CameraTemplate[] = [
  // Hikvision
  { id: 'hik_2143g2i', manufacturer: 'Hikvision', model: 'DS-2CD2143G2-I', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: false, hasSD: true },
  { id: 'hik_2347g2lsu', manufacturer: 'Hikvision', model: 'DS-2CD2347G2-LSU', resolution: '4mp', codec: 'h265+', cameraType: 'turret', poeClass: 'af', powerConsumption: 12, hasIR: true, irRange: 40, hasAudio: true, hasSD: true },
  { id: 'hik_2683g2izs', manufacturer: 'Hikvision', model: 'DS-2CD2683G2-IZS', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 18, hasIR: true, irRange: 50, hasAudio: true, hasSD: true },
  { id: 'hik_2de4a425iw', manufacturer: 'Hikvision', model: 'DS-2DE4A425IW-DE', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'at', powerConsumption: 24, hasIR: true, irRange: 100, hasAudio: true, hasSD: true },
  
  // Dahua
  { id: 'dh_ipchdw3441', manufacturer: 'Dahua', model: 'IPC-HDW3441T-ZAS', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 40, hasAudio: true, hasSD: true },
  { id: 'dh_ipchfw3849', manufacturer: 'Dahua', model: 'IPC-HFW3849S1-AS', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 14, hasIR: true, irRange: 30, hasAudio: true, hasSD: true },
  { id: 'dh_ipcsd5a425', manufacturer: 'Dahua', model: 'SD5A425XA-HNR', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 45, hasIR: true, irRange: 150, hasAudio: true, hasSD: true },
  
  // Intelbras
  { id: 'int_vip3240ia', manufacturer: 'Intelbras', model: 'VIP 3240 IA', resolution: '2mp', codec: 'h265', cameraType: 'bullet', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 40, hasAudio: false, hasSD: true },
  { id: 'int_vip5450z', manufacturer: 'Intelbras', model: 'VIP 5450 Z', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: true, hasSD: true },
  { id: 'int_vip5880bia', manufacturer: 'Intelbras', model: 'VIP 5880 B IA', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 15, hasIR: true, irRange: 50, hasAudio: true, hasSD: true },
  
  // Axis
  { id: 'axis_p3245v', manufacturer: 'Axis', model: 'P3245-V', resolution: '2mp', codec: 'h265', cameraType: 'dome', poeClass: 'af', powerConsumption: 7, hasIR: false, hasAudio: true, hasSD: true },
  { id: 'axis_p1448le', manufacturer: 'Axis', model: 'P1448-LE', resolution: '8mp', codec: 'h265', cameraType: 'bullet', poeClass: 'at', powerConsumption: 13, hasIR: true, irRange: 30, hasAudio: true, hasSD: true },
  { id: 'axis_q6135le', manufacturer: 'Axis', model: 'Q6135-LE', resolution: '2mp', codec: 'h265', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 55, hasIR: true, irRange: 200, hasAudio: true, hasSD: true },
  
  // Hanwha
  { id: 'han_xnv8081r', manufacturer: 'Hanwha/Samsung', model: 'XNV-8081R', resolution: '8mp', codec: 'h265', cameraType: 'dome', poeClass: 'at', powerConsumption: 15, hasIR: true, irRange: 50, hasAudio: true, hasSD: true },
  { id: 'han_xnp9300rw', manufacturer: 'Hanwha/Samsung', model: 'XNP-9300RW', resolution: '4mp', codec: 'h265', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 60, hasIR: true, irRange: 200, hasAudio: true, hasSD: true },
];

export const getCameraTemplatesByManufacturer = (manufacturer: string): CameraTemplate[] => {
  return CAMERA_TEMPLATES.filter(t => t.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()));
};

export const getPoePortType = (poeClass: string): string => {
  const poe = POE_CLASSES.find(p => p.value === poeClass);
  return poe?.portType || 'rj45_poe';
};
