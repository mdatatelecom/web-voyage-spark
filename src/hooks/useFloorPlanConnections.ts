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
  const equipmentIds = positions?.map(p => p.equipment_id) || [];

  return useQuery({
    queryKey: ['floor-plan-connections', equipmentIds],
    queryFn: async () => {
      if (equipmentIds.length === 0) return [];

      // Get connections where both equipment are positioned on this floor plan
      const { data, error } = await supabase
        .from('v_connection_details')
        .select('*')
        .in('equipment_a_id', equipmentIds)
        .in('equipment_b_id', equipmentIds)
        .eq('status', 'active');

      if (error) throw error;

      return (data || []).map(conn => ({
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
