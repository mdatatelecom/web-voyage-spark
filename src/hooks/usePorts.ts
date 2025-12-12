import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePorts = (equipmentId?: string) => {
  return useQuery({
    queryKey: ['ports', equipmentId],
    queryFn: async () => {
      let query = supabase
        .from('ports')
        .select(`
          *,
          equipment:equipment(
            id,
            name,
            type,
            rack:racks(
              id,
              name,
              room:rooms(
                id,
                name,
                floor:floors(
                  id,
                  name,
                  building:buildings(id, name)
                )
              )
            )
          ),
          connections_a:connections!connections_port_a_id_fkey(
            id,
            connection_code,
            status,
            port_b:ports!connections_port_b_id_fkey(
              id,
              name,
              equipment:equipment(id, name)
            )
          ),
          connections_b:connections!connections_port_b_id_fkey(
            id,
            connection_code,
            status,
            port_a:ports!connections_port_a_id_fkey(
              id,
              name,
              equipment:equipment(id, name)
            )
          )
        `)
        .order('port_number');
      
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Processar conexões
      return data.map(port => {
        const connection = port.connections_a?.[0] || port.connections_b?.[0];
        const connectedTo = port.connections_a?.[0] 
          ? port.connections_a[0].port_b 
          : port.connections_b?.[0]?.port_a;
        
        return {
          ...port,
          connection,
          connectedTo
        };
      });
    },
    enabled: !!equipmentId
  });
};

export const useAvailablePorts = (rackId?: string, equipmentId?: string) => {
  return useQuery({
    queryKey: ['available-ports', rackId, equipmentId],
    queryFn: async () => {
      let query = supabase
        .from('ports')
        .select(`
          *,
          equipment:equipment!inner(
            id,
            name,
            type,
            rack_id,
            rack:racks(
              id,
              name,
              room:rooms(
                id,
                name,
                floor:floors(
                  id,
                  name,
                  floor_number,
                  building:buildings(id, name)
                )
              )
            )
          )
        `)
        .eq('status', 'available')
        .order('port_number');
      
      if (rackId) {
        query = query.eq('equipment.rack_id', rackId);
      }
      
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(rackId || equipmentId)
  });
};
