import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NvrChannelInfo {
  totalChannels: number;
  usedChannels: number;
  availableChannels: number;
  hasAvailableChannels: boolean;
  isNvrOrDvr: boolean;
  equipmentName: string;
  channelList: { channel: number; ip?: string; location?: string; status?: string }[];
}

interface ParsedNotes {
  total_channels?: number;
  used_channels?: number;
  cameras?: Array<{
    channel: number;
    ip?: string;
    location?: string;
    status?: string;
  }>;
}

/**
 * Hook para validar disponibilidade de canais em NVR/DVR
 */
export function useNvrChannelValidation(equipmentId: string | undefined) {
  return useQuery({
    queryKey: ['nvr-channel-validation', equipmentId],
    queryFn: async (): Promise<NvrChannelInfo | null> => {
      if (!equipmentId) return null;

      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('id, name, type, notes')
        .eq('id', equipmentId)
        .single();

      if (error || !equipment) {
        return null;
      }

      // Verifica se é NVR ou DVR
      const equipmentType = equipment.type as string;
      const isNvrOrDvr = equipmentType === 'nvr' || equipmentType === 'nvr_poe' || equipmentType === 'dvr';
      const hasIntegratedPoe = equipmentType === 'nvr_poe';
      
      if (!isNvrOrDvr) {
        return {
          totalChannels: 0,
          usedChannels: 0,
          availableChannels: 0,
          hasAvailableChannels: true,
          isNvrOrDvr: false,
          equipmentName: equipment.name,
          channelList: []
        };
      }

      // Parsear notas para obter informações de canais
      let parsedNotes: ParsedNotes = {};
      try {
        if (equipment.notes) {
          parsedNotes = JSON.parse(equipment.notes);
        }
      } catch {
        // Se não for JSON válido, tenta extrair informações do texto
        const notesText = equipment.notes || '';
        const totalMatch = notesText.match(/total[_\s]?channels?\s*[:=]\s*(\d+)/i);
        const usedMatch = notesText.match(/used[_\s]?channels?\s*[:=]\s*(\d+)/i);
        
        if (totalMatch) parsedNotes.total_channels = parseInt(totalMatch[1]);
        if (usedMatch) parsedNotes.used_channels = parseInt(usedMatch[1]);
      }

      // Valores padrão para NVR/DVR comuns
      const defaultChannels = equipment.type === 'nvr' ? 16 : 8;
      const totalChannels = parsedNotes.total_channels || defaultChannels;
      const usedChannels = parsedNotes.used_channels || parsedNotes.cameras?.length || 0;
      const availableChannels = Math.max(0, totalChannels - usedChannels);

      return {
        totalChannels,
        usedChannels,
        availableChannels,
        hasAvailableChannels: availableChannels > 0,
        isNvrOrDvr: true,
        equipmentName: equipment.name,
        channelList: parsedNotes.cameras || []
      };
    },
    enabled: !!equipmentId
  });
}

/**
 * Função para verificar se um equipamento é NVR/DVR
 */
export function isNvrOrDvrType(equipmentType: string): boolean {
  return equipmentType === 'nvr' || equipmentType === 'nvr_poe' || equipmentType === 'dvr';
}

/**
 * Função para verificar se é NVR com PoE integrado
 */
export function isNvrWithPoe(equipmentType: string): boolean {
  return equipmentType === 'nvr_poe';
}

/**
 * Função para verificar se NVR padrão (requer Switch PoE, Injetor ou Fonte Externa)
 */
export function requiresExternalPower(nvrType: string): boolean {
  return nvrType === 'nvr';
}

/**
 * Função para verificar se a origem é uma câmera IP
 */
export function isIpCameraType(equipmentType: string): boolean {
  return equipmentType === 'ip_camera';
}

/**
 * Função para verificar se a origem é uma câmera analógica
 */
export function isAnalogCameraType(equipmentType: string): boolean {
  return equipmentType === 'analog_camera';
}
