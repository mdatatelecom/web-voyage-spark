export const CAMERA_RESOLUTIONS = [
  { value: '1mp', label: '1 MP (720p)', bitrate: '2-4 Mbps' },
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
  { id: 'giga', name: 'Giga Security', color: '#0066cc', logo: '🔷' },
  { id: 'other', name: 'Outro', color: '#6b7280', logo: '⚪' },
] as const;

// Camera connection types (IP vs Conventional)
export const CAMERA_CONNECTION_TYPES = [
  { value: 'ip', label: 'Câmera IP', description: 'Rede Ethernet (NVR)', icon: '🌐' },
  { value: 'hdtvi', label: 'HD-TVI (Turbo HD)', description: 'Coaxial/Balun (DVR)', icon: '📺' },
  { value: 'hdcvi', label: 'HD-CVI', description: 'Coaxial/Balun (DVR)', icon: '📺' },
  { value: 'ahd', label: 'AHD', description: 'Coaxial/Balun (DVR)', icon: '📺' },
  { value: 'cvbs', label: 'Analógica (CVBS)', description: 'Coaxial 480TVL (DVR)', icon: '📡' },
] as const;

// Power source types for IP cameras
export const POWER_SOURCE_TYPES = [
  { value: 'switch_poe', label: 'Switch PoE', description: 'Porta PoE do switch', icon: '🔌' },
  { value: 'poe_injector', label: 'Injetor PoE', description: 'Fonte injetora individual', icon: '⚡' },
  { value: 'external', label: 'Fonte Externa', description: 'Fonte DC 12V/24V', icon: '🔋' },
] as const;

// PoE Injector templates
export const POE_INJECTOR_TEMPLATES = [
  { id: 'tplink_poe150s', manufacturer: 'TP-Link', model: 'TL-POE150S', poeClass: 'af', maxWatts: 15.4, portSpeed: '100Mbps' },
  { id: 'tplink_poe160s', manufacturer: 'TP-Link', model: 'TL-POE160S', poeClass: 'at', maxWatts: 30, portSpeed: '1Gbps' },
  { id: 'intelbras_poe200at', manufacturer: 'Intelbras', model: 'POE 200 AT', poeClass: 'at', maxWatts: 30, portSpeed: '1Gbps' },
  { id: 'intelbras_poe200bt', manufacturer: 'Intelbras', model: 'POE 200 BT', poeClass: 'bt', maxWatts: 60, portSpeed: '1Gbps' },
  { id: 'ubiquiti_upoe_at', manufacturer: 'Ubiquiti', model: 'U-POE-AT', poeClass: 'at', maxWatts: 30, portSpeed: '1Gbps' },
  { id: 'ubiquiti_poe48_24w', manufacturer: 'Ubiquiti', model: 'POE-48-24W-G', poeClass: 'af', maxWatts: 24, portSpeed: '1Gbps' },
  { id: 'cisco_pwrinj30', manufacturer: 'Cisco', model: 'PWR-INJ-30', poeClass: 'at', maxWatts: 30, portSpeed: '1Gbps' },
] as const;

// IP Camera templates
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
  connectionType: 'ip';
}

export const CAMERA_TEMPLATES: CameraTemplate[] = [
  // Hikvision IP
  { id: 'hik_2143g2i', manufacturer: 'Hikvision', model: 'DS-2CD2143G2-I', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2347g2lsu', manufacturer: 'Hikvision', model: 'DS-2CD2347G2-LSU', resolution: '4mp', codec: 'h265+', cameraType: 'turret', poeClass: 'af', powerConsumption: 12, hasIR: true, irRange: 40, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2683g2izs', manufacturer: 'Hikvision', model: 'DS-2CD2683G2-IZS', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 18, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2de4a425iw', manufacturer: 'Hikvision', model: 'DS-2DE4A425IW-DE', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'at', powerConsumption: 24, hasIR: true, irRange: 100, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2047g2', manufacturer: 'Hikvision', model: 'DS-2CD2047G2-LU', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 9, hasIR: true, irRange: 40, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Dahua IP
  { id: 'dh_ipchdw3441', manufacturer: 'Dahua', model: 'IPC-HDW3441T-ZAS', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 40, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'dh_ipchfw3849', manufacturer: 'Dahua', model: 'IPC-HFW3849S1-AS', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 14, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'dh_ipcsd5a425', manufacturer: 'Dahua', model: 'SD5A425XA-HNR', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 45, hasIR: true, irRange: 150, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'dh_ipchdbw3441', manufacturer: 'Dahua', model: 'IPC-HDBW3441E-AS', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 7, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Intelbras IP - Linha existente
  { id: 'int_vip3240ia', manufacturer: 'Intelbras', model: 'VIP 3240 IA', resolution: '2mp', codec: 'h265', cameraType: 'bullet', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 40, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip5450z', manufacturer: 'Intelbras', model: 'VIP 5450 Z', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip5880bia', manufacturer: 'Intelbras', model: 'VIP 5880 B IA', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'at', powerConsumption: 15, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip7280ia', manufacturer: 'Intelbras', model: 'VIP 7280 IA', resolution: '2mp', codec: 'h265', cameraType: 'dome', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Intelbras VIP - Entry Level G5 (consumo corrigido: 4.2W)
  { id: 'int_vip1230bg5', manufacturer: 'Intelbras', model: 'VIP 1230 B G5', resolution: '2mp', codec: 'h265', cameraType: 'bullet', poeClass: 'af', powerConsumption: 4.2, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip1230dg5', manufacturer: 'Intelbras', model: 'VIP 1230 D G5', resolution: '2mp', codec: 'h265', cameraType: 'dome', poeClass: 'af', powerConsumption: 4.2, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  
  // Intelbras VIP - Starlight Series (consumo corrigido)
  { id: 'int_vip3230bsl', manufacturer: 'Intelbras', model: 'VIP 3230 B SL G3', resolution: '2mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 5, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip3430bsl', manufacturer: 'Intelbras', model: 'VIP 3430 B SL G2', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip3830bia', manufacturer: 'Intelbras', model: 'VIP 3830 B IA', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 7, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Intelbras VIP - LPR (Leitura de Placas)
  { id: 'int_vip5460lpria', manufacturer: 'Intelbras', model: 'VIP 5460 LPR IA', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 12, hasIR: true, irRange: 60, hasAudio: false, hasSD: true, connectionType: 'ip' },
  
  // Intelbras VIPC - Cost Effective Series
  { id: 'int_vipc1230bg2', manufacturer: 'Intelbras', model: 'VIPC 1230 B G2', resolution: '2mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 30, hasAudio: false, hasSD: false, connectionType: 'ip' },
  { id: 'int_vipc1230dg2', manufacturer: 'Intelbras', model: 'VIPC 1230 D G2', resolution: '2mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 30, hasAudio: false, hasSD: false, connectionType: 'ip' },
  { id: 'int_vipc1320bg2', manufacturer: 'Intelbras', model: 'VIPC 1320 B G2', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 7, hasIR: true, irRange: 30, hasAudio: false, hasSD: false, connectionType: 'ip' },
  
  // Intelbras PTZ / Speed Dome (consumo corrigido)
  { id: 'int_vip5215sd', manufacturer: 'Intelbras', model: 'VIP 5215 SD', resolution: '2mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'at', powerConsumption: 22, hasIR: true, irRange: 100, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip7225ptz', manufacturer: 'Intelbras', model: 'VIP 7225 PTZ FT', resolution: '2mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'at', powerConsumption: 25, hasIR: true, irRange: 150, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip5425sd', manufacturer: 'Intelbras', model: 'VIP 5425 SD Dual IA FT', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 55, hasIR: true, irRange: 200, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'int_vip9440ptz', manufacturer: 'Intelbras', model: 'VIP 9440 PTZ IA FT G2', resolution: '4mp', codec: 'h265+', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 30, hasIR: true, irRange: 250, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Giga Security IP Series
  { id: 'gs_gs500_2mp', manufacturer: 'Giga Security', model: 'GS500 PTZ 2MP', resolution: '2mp', codec: 'h265', cameraType: 'ptz', poeClass: 'at', powerConsumption: 24, hasIR: true, irRange: 100, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gsip2000b', manufacturer: 'Giga Security', model: 'GSIP 2000 B', resolution: '2mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gsip2000d', manufacturer: 'Giga Security', model: 'GSIP 2000 D', resolution: '2mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gsip5000b', manufacturer: 'Giga Security', model: 'GSIP 5000 B', resolution: '5mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gsip5000d', manufacturer: 'Giga Security', model: 'GSIP 5000 D', resolution: '5mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 8, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gsip8000b', manufacturer: 'Giga Security', model: 'GSIP 8000 B 4K', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gs0080ip', manufacturer: 'Giga Security', model: 'GS0080 IP 4K', resolution: '8mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 10, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'gs_gs0070ip', manufacturer: 'Giga Security', model: 'GS0070 IP 5MP', resolution: '5mp', codec: 'h265', cameraType: 'bullet', poeClass: 'af', powerConsumption: 7, hasIR: true, irRange: 30, hasAudio: false, hasSD: true, connectionType: 'ip' },
  
  // Hikvision ColorVu - Cor 24 horas (luz branca, sem IR)
  { id: 'hik_2cd2047g2l', manufacturer: 'Hikvision', model: 'DS-2CD2047G2-L ColorVu', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 9, hasIR: false, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2347g2l', manufacturer: 'Hikvision', model: 'DS-2CD2347G2-L ColorVu', resolution: '4mp', codec: 'h265+', cameraType: 'turret', poeClass: 'af', powerConsumption: 8, hasIR: false, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2t47g2l', manufacturer: 'Hikvision', model: 'DS-2CD2T47G2-L ColorVu', resolution: '4mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 11, hasIR: false, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2087g2lu', manufacturer: 'Hikvision', model: 'DS-2CD2087G2-LU ColorVu', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 11, hasIR: false, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Hikvision AcuSense - Deep Learning
  { id: 'hik_2cd2746g2izs', manufacturer: 'Hikvision', model: 'DS-2CD2746G2-IZS AcuSense', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 13, hasIR: true, irRange: 40, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2t86g24i', manufacturer: 'Hikvision', model: 'DS-2CD2T86G2-4I AcuSense', resolution: '8mp', codec: 'h265+', cameraType: 'bullet', poeClass: 'af', powerConsumption: 12, hasIR: true, irRange: 80, hasAudio: false, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2386g2isu', manufacturer: 'Hikvision', model: 'DS-2CD2386G2-ISU AcuSense', resolution: '8mp', codec: 'h265+', cameraType: 'turret', poeClass: 'af', powerConsumption: 10, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'hik_2cd2143g2iu', manufacturer: 'Hikvision', model: 'DS-2CD2143G2-IU AcuSense', resolution: '4mp', codec: 'h265+', cameraType: 'dome', poeClass: 'af', powerConsumption: 7, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Axis IP
  { id: 'axis_p3245v', manufacturer: 'Axis', model: 'P3245-V', resolution: '2mp', codec: 'h265', cameraType: 'dome', poeClass: 'af', powerConsumption: 7, hasIR: false, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'axis_p1448le', manufacturer: 'Axis', model: 'P1448-LE', resolution: '8mp', codec: 'h265', cameraType: 'bullet', poeClass: 'at', powerConsumption: 13, hasIR: true, irRange: 30, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'axis_q6135le', manufacturer: 'Axis', model: 'Q6135-LE', resolution: '2mp', codec: 'h265', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 55, hasIR: true, irRange: 200, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'axis_m3115lve', manufacturer: 'Axis', model: 'M3115-LVE', resolution: '2mp', codec: 'h265', cameraType: 'dome', poeClass: 'af', powerConsumption: 6, hasIR: true, irRange: 15, hasAudio: true, hasSD: true, connectionType: 'ip' },
  
  // Hanwha IP
  { id: 'han_xnv8081r', manufacturer: 'Hanwha/Samsung', model: 'XNV-8081R', resolution: '8mp', codec: 'h265', cameraType: 'dome', poeClass: 'at', powerConsumption: 15, hasIR: true, irRange: 50, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'han_xnp9300rw', manufacturer: 'Hanwha/Samsung', model: 'XNP-9300RW', resolution: '4mp', codec: 'h265', cameraType: 'ptz', poeClass: 'bt', powerConsumption: 60, hasIR: true, irRange: 200, hasAudio: true, hasSD: true, connectionType: 'ip' },
  { id: 'han_xnf8010rvm', manufacturer: 'Hanwha/Samsung', model: 'XNF-8010RVM', resolution: '5mp', codec: 'h265', cameraType: 'fisheye', poeClass: 'af', powerConsumption: 12, hasIR: true, irRange: 15, hasAudio: true, hasSD: true, connectionType: 'ip' },
];

// Conventional camera templates (HD-TVI, HD-CVI, AHD, CVBS)
export interface AnalogCameraTemplate {
  id: string;
  manufacturer: string;
  model: string;
  resolution: string;
  connectionType: 'hdtvi' | 'hdcvi' | 'ahd' | 'cvbs';
  cameraType: string;
  hasIR: boolean;
  irRange?: number;
  hasAudio: boolean;
}

export const ANALOG_CAMERA_TEMPLATES: AnalogCameraTemplate[] = [
  // Hikvision Turbo HD (HD-TVI)
  { id: 'hik_ds2ce16d0t', manufacturer: 'Hikvision', model: 'DS-2CE16D0T-IRPF', resolution: '2mp', connectionType: 'hdtvi', cameraType: 'bullet', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'hik_ds2ce76d0t', manufacturer: 'Hikvision', model: 'DS-2CE76D0T-ITMF', resolution: '2mp', connectionType: 'hdtvi', cameraType: 'dome', hasIR: true, irRange: 30, hasAudio: false },
  { id: 'hik_ds2ce16h0t', manufacturer: 'Hikvision', model: 'DS-2CE16H0T-ITPF', resolution: '5mp', connectionType: 'hdtvi', cameraType: 'bullet', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'hik_ds2ce56h0t', manufacturer: 'Hikvision', model: 'DS-2CE56H0T-ITMF', resolution: '5mp', connectionType: 'hdtvi', cameraType: 'dome', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'hik_ds2ce78u8t', manufacturer: 'Hikvision', model: 'DS-2CE78U8T-IT3', resolution: '8mp', connectionType: 'hdtvi', cameraType: 'turret', hasIR: true, irRange: 60, hasAudio: false },
  { id: 'hik_ds2ae4225ti', manufacturer: 'Hikvision', model: 'DS-2AE4225TI-D', resolution: '2mp', connectionType: 'hdtvi', cameraType: 'ptz', hasIR: true, irRange: 100, hasAudio: false },
  
  // Dahua HDCVI
  { id: 'dh_hac_hfw1200', manufacturer: 'Dahua', model: 'HAC-HFW1200TN', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'bullet', hasIR: true, irRange: 30, hasAudio: false },
  { id: 'dh_hac_hdw1500', manufacturer: 'Dahua', model: 'HAC-HDW1500TN-Z-A', resolution: '5mp', connectionType: 'hdcvi', cameraType: 'dome', hasIR: true, irRange: 60, hasAudio: true },
  { id: 'dh_hac_hfw2802', manufacturer: 'Dahua', model: 'HAC-HFW2802T-A-I8', resolution: '8mp', connectionType: 'hdcvi', cameraType: 'bullet', hasIR: true, irRange: 80, hasAudio: true },
  { id: 'dh_hac_hdw2241t', manufacturer: 'Dahua', model: 'HAC-HDW2241T-Z-A', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'dome', hasIR: true, irRange: 60, hasAudio: true },
  { id: 'dh_sd49225_hc', manufacturer: 'Dahua', model: 'SD49225-HC-LA', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'ptz', hasIR: true, irRange: 100, hasAudio: true },
  
  // Intelbras HDCVI
  { id: 'int_vhl1120b', manufacturer: 'Intelbras', model: 'VHL 1120 B', resolution: '1mp', connectionType: 'hdcvi', cameraType: 'bullet', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'int_vhl1220b', manufacturer: 'Intelbras', model: 'VHL 1220 B G2', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'bullet', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'int_vhl1220d', manufacturer: 'Intelbras', model: 'VHL 1220 D G2', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'dome', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'int_vhd5250z', manufacturer: 'Intelbras', model: 'VHD 5250 Z', resolution: '2mp', connectionType: 'hdcvi', cameraType: 'dome', hasIR: true, irRange: 30, hasAudio: true },
  { id: 'int_vhd5830b', manufacturer: 'Intelbras', model: 'VHD 5830 B 4K', resolution: '8mp', connectionType: 'hdcvi', cameraType: 'bullet', hasIR: true, irRange: 30, hasAudio: true },
  
  // Generic AHD cameras
  { id: 'generic_ahd_2mp_bullet', manufacturer: 'Genérico', model: 'AHD-2MP-BULLET', resolution: '2mp', connectionType: 'ahd', cameraType: 'bullet', hasIR: true, irRange: 25, hasAudio: false },
  { id: 'generic_ahd_2mp_dome', manufacturer: 'Genérico', model: 'AHD-2MP-DOME', resolution: '2mp', connectionType: 'ahd', cameraType: 'dome', hasIR: true, irRange: 20, hasAudio: false },
  { id: 'generic_ahd_5mp_bullet', manufacturer: 'Genérico', model: 'AHD-5MP-BULLET', resolution: '5mp', connectionType: 'ahd', cameraType: 'bullet', hasIR: true, irRange: 30, hasAudio: false },
  
  // CVBS Analog
  { id: 'generic_cvbs_bullet', manufacturer: 'Genérico', model: 'CVBS-480TVL-BULLET', resolution: '480tvl', connectionType: 'cvbs', cameraType: 'bullet', hasIR: true, irRange: 15, hasAudio: false },
  { id: 'generic_cvbs_dome', manufacturer: 'Genérico', model: 'CVBS-700TVL-DOME', resolution: '700tvl', connectionType: 'cvbs', cameraType: 'dome', hasIR: true, irRange: 15, hasAudio: false },
];

export const getCameraTemplatesByManufacturer = (manufacturer: string): CameraTemplate[] => {
  return CAMERA_TEMPLATES.filter(t => t.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()));
};

export const getAnalogCameraTemplatesByManufacturer = (manufacturer: string): AnalogCameraTemplate[] => {
  return ANALOG_CAMERA_TEMPLATES.filter(t => t.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()));
};

export const getAnalogCameraTemplatesByConnectionType = (connectionType: string): AnalogCameraTemplate[] => {
  return ANALOG_CAMERA_TEMPLATES.filter(t => t.connectionType === connectionType);
};

export const getPoePortType = (poeClass: string): string => {
  const poe = POE_CLASSES.find(p => p.value === poeClass);
  return poe?.portType || 'rj45_poe';
};

export const isIPCamera = (connectionType: string): boolean => {
  return connectionType === 'ip';
};

export const getConnectionTypeLabel = (connectionType: string): string => {
  const type = CAMERA_CONNECTION_TYPES.find(t => t.value === connectionType);
  return type?.label || connectionType;
};

// ============= PoE Calculation Functions =============

// Calculate required PoE class based on power consumption
export const getRequiredPoeClass = (powerConsumption: number): string => {
  if (powerConsumption <= 15.4) return 'af';   // 802.3af - up to 15.4W
  if (powerConsumption <= 30) return 'at';     // 802.3at - up to 30W
  return 'bt';                                  // 802.3bt - up to 60W+
};

// Get minimum port type string for a given power consumption
export const getMinimumPoePortType = (powerConsumption: number): string => {
  const poeClass = getRequiredPoeClass(powerConsumption);
  return getPoePortType(poeClass);
};

// Maximum watts per port type
const PORT_MAX_WATTS: Record<string, number> = {
  'rj45': 0,
  'rj45_poe': 15.4,
  'rj45_poe_plus': 30,
  'rj45_poe_plus_plus': 60,
};

// Check if a port type can handle the camera's power requirement
export const canPortPowerCamera = (
  portType: string | null | undefined,
  cameraPowerConsumption: number
): boolean => {
  if (!portType) return false;
  const maxWatts = PORT_MAX_WATTS[portType] || 0;
  return maxWatts >= cameraPowerConsumption;
};

// Get power margin status for visual indicators
export type PoeMarginStatus = 'sufficient' | 'borderline' | 'insufficient';

export const getPoeMarginStatus = (
  portType: string | null | undefined,
  cameraPowerConsumption: number
): PoeMarginStatus => {
  if (!portType) return 'insufficient';
  const maxWatts = PORT_MAX_WATTS[portType] || 0;
  if (maxWatts < cameraPowerConsumption) return 'insufficient';
  const margin = (maxWatts - cameraPowerConsumption) / maxWatts;
  return margin >= 0.2 ? 'sufficient' : 'borderline';
};

// PoE recommendation interface
export interface PoeRecommendation {
  minPoeClass: string;
  minPoeClassLabel: string;
  minPortWatts: number;
  minPortType: string;
  recommended: boolean;
  warning?: string;
}

// Get complete PoE recommendation for a camera
export const getPoeRecommendation = (
  cameraTemplate: CameraTemplate | null,
  customPowerConsumption?: number
): PoeRecommendation => {
  const power = customPowerConsumption ?? cameraTemplate?.powerConsumption ?? 12;
  const minClass = getRequiredPoeClass(power);
  const classInfo = POE_CLASSES.find(c => c.value === minClass);
  
  let warning: string | undefined;
  if (power > 30) {
    warning = 'Câmera PTZ requer switch com PoE++ (802.3bt) ou fonte externa de alta potência';
  } else if (power > 15.4) {
    warning = 'Câmera requer switch com PoE+ (802.3at) ou superior';
  }
  
  return {
    minPoeClass: minClass,
    minPoeClassLabel: classInfo?.label || 'PoE',
    minPortWatts: classInfo?.maxWatts || 15.4,
    minPortType: classInfo?.portType || 'rj45_poe',
    recommended: true,
    warning,
  };
};
