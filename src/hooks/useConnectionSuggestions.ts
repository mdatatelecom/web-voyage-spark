import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCompatiblePortTypes } from '@/constants/equipmentTypes';

interface ConnectionSuggestion {
  sourceEquipment: any;
  sourcePort: any;
  targetEquipment: any;
  targetPort: any;
  proximity: 'same_rack' | 'same_room' | 'different_room';
  reason: string;
  recommendedCable: string;
}

const getRecommendedCable = (portType: string): string => {
  if (portType === 'rj45') return 'UTP Cat6';
  if (portType.includes('sfp') || portType.includes('fiber')) return 'Fibra OM3';
  if (portType === 'bnc') return 'Coaxial RG59';
  return 'Verificar especificação';
};

const generateReason = (proximity: string, sourceType: string, targetType: string): string => {
  const proximityText = 
    proximity === 'same_rack' ? 'Mesma localização física (rack)' :
    proximity === 'same_room' ? 'Mesma sala, fácil cabeamento' :
    'Cabeamento entre salas necessário';
  
  const compatibilityText = sourceType === targetType 
    ? 'Portas idênticas, compatibilidade garantida'
    : 'Portas compatíveis';
  
  return `${proximityText}. ${compatibilityText}.`;
};

export const useConnectionSuggestions = (isolatedEquipmentIds: string[]) => {
  return useQuery({
    queryKey: ['connection-suggestions', isolatedEquipmentIds.sort()],
    queryFn: async () => {
      if (isolatedEquipmentIds.length === 0) return [];
      
      // Buscar portas disponíveis dos equipamentos isolados
      const { data: isolatedPorts, error: isoError } = await supabase
        .from('ports')
        .select(`
          id, 
          name, 
          port_type, 
          speed, 
          equipment_id,
          equipment:equipment!inner(
            id, 
            name, 
            type, 
            rack_id,
            racks!inner(
              id, 
              name, 
              room_id,
              rooms!inner(
                id, 
                name
              )
            )
          )
        `)
        .in('equipment_id', isolatedEquipmentIds)
        .eq('status', 'available');
      
      if (isoError) {
        console.error('Error fetching isolated ports:', isoError);
        return [];
      }
      
      // Buscar todas portas disponíveis de outros equipamentos
      const { data: allAvailablePorts, error: allError } = await supabase
        .from('ports')
        .select(`
          id, 
          name, 
          port_type, 
          speed, 
          equipment_id,
          equipment:equipment!inner(
            id, 
            name, 
            type, 
            rack_id,
            racks!inner(
              id, 
              name, 
              room_id,
              rooms!inner(
                id, 
                name
              )
            )
          )
        `)
        .not('equipment_id', 'in', `(${isolatedEquipmentIds.join(',')})`)
        .eq('status', 'available');
      
      if (allError) {
        console.error('Error fetching available ports:', allError);
        return [];
      }
      
      // Gerar sugestões
      const suggestions: ConnectionSuggestion[] = [];
      
      (isolatedPorts || []).forEach(isoPort => {
        const compatibleTypes = getCompatiblePortTypes(isoPort.port_type);
        
        // Filtrar portas compatíveis
        const compatible = (allAvailablePorts || []).filter(p => 
          compatibleTypes.includes(p.port_type)
        );
        
        // Ordenar por proximidade (mesmo rack > mesma sala > outros)
        const sorted = compatible.sort((a, b) => {
          const aRackMatch = a.equipment.rack_id === isoPort.equipment.rack_id;
          const bRackMatch = b.equipment.rack_id === isoPort.equipment.rack_id;
          const aRoomMatch = a.equipment.racks.room_id === isoPort.equipment.racks.room_id;
          const bRoomMatch = b.equipment.racks.room_id === isoPort.equipment.racks.room_id;
          
          if (aRackMatch && !bRackMatch) return -1;
          if (!aRackMatch && bRackMatch) return 1;
          if (aRoomMatch && !bRoomMatch) return -1;
          if (!aRoomMatch && bRoomMatch) return 1;
          return 0;
        });
        
        // Top 3 sugestões por porta isolada
        sorted.slice(0, 3).forEach(targetPort => {
          const proximity: 'same_rack' | 'same_room' | 'different_room' = 
            targetPort.equipment.rack_id === isoPort.equipment.rack_id ? 'same_rack' :
            targetPort.equipment.racks.room_id === isoPort.equipment.racks.room_id ? 'same_room' :
            'different_room';
          
          suggestions.push({
            sourceEquipment: isoPort.equipment,
            sourcePort: isoPort,
            targetEquipment: targetPort.equipment,
            targetPort: targetPort,
            proximity,
            reason: generateReason(proximity, isoPort.port_type, targetPort.port_type),
            recommendedCable: getRecommendedCable(isoPort.port_type),
          });
        });
      });
      
      return suggestions;
    },
    enabled: isolatedEquipmentIds.length > 0
  });
};
