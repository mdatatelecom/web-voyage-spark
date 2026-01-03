import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentPosition } from './useEquipmentPositions';

export interface FloorPlanConnection {
  id: string;
  connection_code: string;
  cable_type: string;
  cable_color: string | null;
  status: string;
  equipment_a_id: string;
  equipment_b_id: string;
  equipment_a_name: string;
  equipment_b_name: string;
  equipment_a_type: string;
  equipment_b_type: string;
}

export function useFloorPlanConnections(positions: EquipmentPosition[] | undefined) {
  const equipmentIds = positions?.filter(p => p?.equipment_id).map(p => p.equipment_id) || [];

  return useQuery({
    queryKey: ['floor-plan-connections', equipmentIds],
    queryFn: async () => {
      if (!positions || equipmentIds.length === 0) return [];

      // Supabase doesn't support OR with .in(), so we need 2 queries
      // Query for connections where equipment_a is on the floor plan
      const { data: dataA, error: errorA } = await supabase
        .from('v_connection_details')
        .select('*')
        .in('equipment_a_id', equipmentIds)
        .eq('status', 'active');

      if (errorA) throw errorA;

      // Query for connections where equipment_b is on the floor plan
      const { data: dataB, error: errorB } = await supabase
        .from('v_connection_details')
        .select('*')
        .in('equipment_b_id', equipmentIds)
        .eq('status', 'active');

      if (errorB) throw errorB;

      // Combine and remove duplicates by id
      const all = [...(dataA || []), ...(dataB || [])];
      const uniqueMap = new Map(all.map(c => [c.id, c]));
      const unique = Array.from(uniqueMap.values());

      return unique.map(conn => ({
        id: conn.id!,
        connection_code: conn.connection_code || '',
        cable_type: conn.cable_type || 'other',
        cable_color: conn.cable_color,
        status: conn.status || 'active',
        equipment_a_id: conn.equipment_a_id!,
        equipment_b_id: conn.equipment_b_id!,
        equipment_a_name: conn.equipment_a_name || '',
        equipment_b_name: conn.equipment_b_name || '',
        equipment_a_type: conn.equipment_a_type || 'other',
        equipment_b_type: conn.equipment_b_type || 'other',
      })) as FloorPlanConnection[];
    },
    enabled: equipmentIds.length > 0,
  });
}
