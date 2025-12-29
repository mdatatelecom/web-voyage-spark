import { useMemo } from 'react';
import { Database } from '@/integrations/supabase/types';
import { isCableCompatibleWithPorts, suggestCableType } from '@/constants/cablePortCompatibility';
import { useNvrChannelValidation, isNvrOrDvrType, isIpCameraType } from './useNvrChannelValidation';
import { getDevicePoeConsumption } from '@/hooks/usePoeSwitchSuggestions';

type CableType = Database['public']['Enums']['cable_type'];
type PortType = Database['public']['Enums']['port_type'];

export interface PortInfo {
  portId: string;
  portName: string;
  portType: PortType | null;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  poeAvailable?: number;
  poeBudget?: number;
}

export interface ValidationError {
  type: 'nvr_channel' | 'poe_budget' | 'cable_compatibility' | 'port_invalid';
  message: string;
  severity: 'error' | 'warning';
}

export interface ConnectionValidationResult {
  isValid: boolean;
  canProceed: boolean; // true se apenas warnings, false se houver errors
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestedCable: CableType | null;
  nvrInfo?: {
    availableChannels: number;
    totalChannels: number;
    usedChannels: number;
  };
  poeInfo?: {
    required: number;
    available: number;
    sufficient: boolean;
  };
}

/**
 * Hook centralizado para validação de conexões
 */
export function useConnectionValidation(
  portAInfo: PortInfo | null,
  portBInfo: PortInfo | null,
  cableType: CableType | ''
): ConnectionValidationResult {
  // Validação de NVR/DVR para o destino (portB)
  const { data: nvrValidation } = useNvrChannelValidation(
    portBInfo?.equipmentType && isNvrOrDvrType(portBInfo.equipmentType) 
      ? portBInfo.equipmentId 
      : undefined
  );

  return useMemo(() => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let suggestedCable: CableType | null = null;

    // 1. Validação de canais NVR/DVR
    if (portAInfo && portBInfo) {
      // Se origem é câmera IP e destino é NVR/DVR
      if (isIpCameraType(portAInfo.equipmentType) && isNvrOrDvrType(portBInfo.equipmentType)) {
        if (nvrValidation && !nvrValidation.hasAvailableChannels) {
          errors.push({
            type: 'nvr_channel',
            message: `${nvrValidation.equipmentName} não possui canais disponíveis (${nvrValidation.usedChannels}/${nvrValidation.totalChannels} ocupados)`,
            severity: 'error'
          });
        } else if (nvrValidation && nvrValidation.availableChannels <= 2) {
          warnings.push({
            type: 'nvr_channel',
            message: `${nvrValidation.equipmentName} possui apenas ${nvrValidation.availableChannels} canal(is) disponível(is)`,
            severity: 'warning'
          });
        }
      }
    }

    // 2. Validação de PoE
    if (portAInfo && portBInfo) {
      const sourceConsumption = getDevicePoeConsumption(portAInfo.equipmentType);
      
      if (sourceConsumption > 0) {
        // Verifica se a porta de destino fornece PoE
        const destPortType = portBInfo.portType;
        const isPoEPort = destPortType && ['rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'].includes(destPortType);
        
        if (!isPoEPort) {
          // Não é uma porta PoE - pode ser um problema se não houver fonte externa
          warnings.push({
            type: 'poe_budget',
            message: `${portAInfo.equipmentName} consome ${sourceConsumption}W via PoE, mas a porta de destino não é PoE. Verifique se há fonte externa.`,
            severity: 'warning'
          });
        } else if (portBInfo.poeAvailable !== undefined && portBInfo.poeAvailable < sourceConsumption) {
          errors.push({
            type: 'poe_budget',
            message: `Budget PoE insuficiente no switch. Necessário: ${sourceConsumption}W, Disponível: ${portBInfo.poeAvailable}W`,
            severity: 'error'
          });
        }
      }
    }

    // 3. Validação de compatibilidade cabo-porta
    if (cableType && portAInfo && portBInfo) {
      const compatibility = isCableCompatibleWithPorts(
        cableType,
        portAInfo.portType,
        portBInfo.portType
      );

      if (!compatibility.compatible) {
        errors.push({
          type: 'cable_compatibility',
          message: compatibility.reason || 'Tipo de cabo incompatível com as portas selecionadas',
          severity: 'error'
        });
        
        if (compatibility.suggestedCable) {
          suggestedCable = compatibility.suggestedCable;
        }
      }
    }

    // Sugere cabo se não foi selecionado ou se há incompatibilidade
    if (!cableType && portAInfo && portBInfo) {
      suggestedCable = suggestCableType(portAInfo.portType, portBInfo.portType);
    }

    const hasErrors = errors.some(e => e.severity === 'error');
    
    return {
      isValid: errors.length === 0 && warnings.length === 0,
      canProceed: !hasErrors,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: [...errors.filter(e => e.severity === 'warning'), ...warnings],
      suggestedCable,
      nvrInfo: nvrValidation ? {
        availableChannels: nvrValidation.availableChannels,
        totalChannels: nvrValidation.totalChannels,
        usedChannels: nvrValidation.usedChannels
      } : undefined,
      poeInfo: portAInfo ? {
        required: getDevicePoeConsumption(portAInfo.equipmentType),
        available: portBInfo?.poeAvailable || 0,
        sufficient: (portBInfo?.poeAvailable || 0) >= getDevicePoeConsumption(portAInfo.equipmentType)
      } : undefined
    };
  }, [portAInfo, portBInfo, cableType, nvrValidation]);
}
