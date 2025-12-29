import { Database } from '@/integrations/supabase/types';

type CableType = Database['public']['Enums']['cable_type'];
type PortType = Database['public']['Enums']['port_type'];

// Mapeamento de compatibilidade entre tipos de cabo e tipos de porta
export const CABLE_PORT_COMPATIBILITY: Record<CableType, PortType[]> = {
  // Cabos UTP funcionam com portas Ethernet (RJ45)
  'utp_cat5e': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  'utp_cat6': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  'utp_cat6a': ['rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'],
  
  // Cabos de fibra funcionam com portas SFP e Fiber
  'fiber_om3': ['sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc'],
  'fiber_om4': ['sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc'],
  'fiber_os2': ['sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc'],
  
  // DAC para conexões diretas SFP de alta velocidade
  'dac': ['sfp_plus', 'sfp28', 'qsfp', 'qsfp28'],
  
  // Outro aceita qualquer porta (flexível)
  'other': [] as PortType[] // Vazio significa que aceita qualquer porta
};

// Portas que são consideradas compatíveis com qualquer cabo "other"
const UNIVERSAL_PORTS: PortType[] = [
  'rj45', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus',
  'sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28',
  'fiber_lc', 'fiber_sc', 'bnc', 'hdmi', 'vga', 'usb',
  'serial', 'console_rj45', 'console_usb', 'fxo_fxs',
  'e1_t1', 'power_ac', 'power_dc', 'antenna_sma',
  'rs485_rs232', 'io', 'sensor_io', 'other'
];

// Mapeamento reverso: dado um tipo de porta, quais cabos são compatíveis
export const PORT_CABLE_COMPATIBILITY: Partial<Record<PortType, CableType[]>> = {
  'rj45': ['utp_cat5e', 'utp_cat6', 'utp_cat6a', 'other'],
  'rj45_poe': ['utp_cat5e', 'utp_cat6', 'utp_cat6a', 'other'],
  'rj45_poe_plus': ['utp_cat5e', 'utp_cat6', 'utp_cat6a', 'other'],
  'rj45_poe_plus_plus': ['utp_cat5e', 'utp_cat6', 'utp_cat6a', 'other'],
  'sfp': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'other'],
  'sfp_plus': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'],
  'sfp28': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'],
  'qsfp': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'],
  'qsfp28': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'],
  'fiber_lc': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'other'],
  'fiber_sc': ['fiber_om3', 'fiber_om4', 'fiber_os2', 'other'],
  'bnc': ['other'],
  'other': ['other', 'utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2', 'dac']
};

export interface CableCompatibilityResult {
  compatible: boolean;
  reason?: string;
  suggestedCable?: CableType;
}

/**
 * Verifica se um tipo de cabo é compatível com os tipos de porta selecionados
 */
export function isCableCompatibleWithPorts(
  cableType: CableType,
  portAType: PortType | null,
  portBType: PortType | null
): CableCompatibilityResult {
  // Se cabo é "other", aceita qualquer porta
  if (cableType === 'other') {
    return { compatible: true };
  }

  const compatiblePorts = CABLE_PORT_COMPATIBILITY[cableType];
  
  // Se não tiver mapeamento, considera compatível
  if (!compatiblePorts || compatiblePorts.length === 0) {
    return { compatible: true };
  }

  const errors: string[] = [];

  // Verifica porta A
  if (portAType && portAType !== 'other' && !compatiblePorts.includes(portAType)) {
    errors.push(`Porta A (${getPortTypeLabel(portAType)}) não é compatível com ${getCableTypeLabel(cableType)}`);
  }

  // Verifica porta B
  if (portBType && portBType !== 'other' && !compatiblePorts.includes(portBType)) {
    errors.push(`Porta B (${getPortTypeLabel(portBType)}) não é compatível com ${getCableTypeLabel(cableType)}`);
  }

  if (errors.length > 0) {
    const suggestedCable = suggestCableType(portAType, portBType);
    return {
      compatible: false,
      reason: errors.join('. '),
      suggestedCable: suggestedCable || undefined
    };
  }

  return { compatible: true };
}

/**
 * Sugere o melhor tipo de cabo baseado nos tipos de porta
 */
export function suggestCableType(
  portAType: PortType | null,
  portBType: PortType | null
): CableType | null {
  // Se ambas as portas são nulas ou "other", retorna null
  if ((!portAType || portAType === 'other') && (!portBType || portBType === 'other')) {
    return null;
  }

  // Prioriza a porta com tipo específico
  const primaryPort = (portAType && portAType !== 'other') ? portAType : portBType;
  
  if (!primaryPort) return null;

  // Busca cabos compatíveis com a porta primária
  const compatibleCables = PORT_CABLE_COMPATIBILITY[primaryPort];
  
  if (!compatibleCables || compatibleCables.length === 0) {
    return 'other';
  }

  // Se a segunda porta tem tipo específico, encontra interseção
  const secondaryPort = primaryPort === portAType ? portBType : portAType;
  
  if (secondaryPort && secondaryPort !== 'other') {
    const secondaryCables = PORT_CABLE_COMPATIBILITY[secondaryPort];
    if (secondaryCables) {
      const intersection = compatibleCables.filter(c => secondaryCables.includes(c) && c !== 'other');
      if (intersection.length > 0) {
        // Prioriza cabos de melhor qualidade
        if (intersection.includes('utp_cat6a')) return 'utp_cat6a';
        if (intersection.includes('utp_cat6')) return 'utp_cat6';
        if (intersection.includes('fiber_os2')) return 'fiber_os2';
        if (intersection.includes('fiber_om4')) return 'fiber_om4';
        return intersection[0];
      }
    }
  }

  // Retorna o primeiro cabo compatível que não seja "other"
  const preferred = compatibleCables.find(c => c !== 'other');
  return preferred || compatibleCables[0];
}

// Helper functions para labels
function getCableTypeLabel(cableType: CableType): string {
  const labels: Record<CableType, string> = {
    'utp_cat5e': 'UTP Cat5e',
    'utp_cat6': 'UTP Cat6',
    'utp_cat6a': 'UTP Cat6a',
    'fiber_om3': 'Fibra OM3',
    'fiber_om4': 'Fibra OM4',
    'fiber_os2': 'Fibra OS2',
    'dac': 'DAC',
    'other': 'Outro'
  };
  return labels[cableType] || cableType;
}

function getPortTypeLabel(portType: PortType): string {
  const labels: Partial<Record<PortType, string>> = {
    'rj45': 'RJ45',
    'rj45_poe': 'RJ45 PoE',
    'rj45_poe_plus': 'RJ45 PoE+',
    'rj45_poe_plus_plus': 'RJ45 PoE++',
    'sfp': 'SFP',
    'sfp_plus': 'SFP+',
    'sfp28': 'SFP28',
    'qsfp': 'QSFP',
    'qsfp28': 'QSFP28',
    'fiber_lc': 'Fibra LC',
    'fiber_sc': 'Fibra SC',
    'bnc': 'BNC',
    'other': 'Outro'
  };
  return labels[portType] || portType;
}

// Exportar também as funções de label
export { getCableTypeLabel, getPortTypeLabel };
