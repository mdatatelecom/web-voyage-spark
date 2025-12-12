import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivePort {
  id: string;
  equipment_id: string;
  port_number: number | null;
  name: string;
}

export const useActivePortsByRack = (rackId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['active-ports-by-rack', rackId],
    queryFn: async (): Promise<ActivePort[]> => {
      if (!rackId) return [];

      const { data, error } = await supabase
        .from('ports')
        .select(`
          id,
          equipment_id,
          port_number,
          name,
          equipment!inner(
            id,
            rack_id
          )
        `)
        .eq('status', 'in_use')
        .eq('equipment.rack_id', rackId);

      if (error) throw error;
      
      return (data || []).map(port => ({
        id: port.id,
        equipment_id: port.equipment_id,
        port_number: port.port_number,
        name: port.name
      }));
    },
    enabled: !!rackId
  });

  // Realtime subscription for port status changes
  useEffect(() => {
    if (!rackId) return;

    const channel = supabase
      .channel(`ports-realtime-${rackId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ports'
        },
        () => {
          // Invalidate and refetch when any port changes
          queryClient.invalidateQueries({ queryKey: ['active-ports-by-rack', rackId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rackId, queryClient]);

  return {
    activePorts: query.data || [],
    activePortIds: (query.data || []).map(p => p.id),
    getActivePortIdsForEquipment: (equipmentId: string) => 
      (query.data || []).filter(p => p.equipment_id === equipmentId).map(p => p.id),
    isLoading: query.isLoading,
    error: query.error
  };
};

// Hook to get active ports for a specific equipment
export const useActivePortsByEquipment = (equipmentId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['active-ports-by-equipment', equipmentId],
    queryFn: async (): Promise<ActivePort[]> => {
      if (!equipmentId) return [];

      const { data, error } = await supabase
        .from('ports')
        .select('id, equipment_id, port_number, name')
        .eq('status', 'in_use')
        .eq('equipment_id', equipmentId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!equipmentId
  });

  // Realtime subscription
  useEffect(() => {
    if (!equipmentId) return;

    const channel = supabase
      .channel(`ports-equipment-${equipmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ports',
          filter: `equipment_id=eq.${equipmentId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-ports-by-equipment', equipmentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [equipmentId, queryClient]);

  return {
    activePorts: query.data || [],
    activePortIds: (query.data || []).map(p => p.id),
    isLoading: query.isLoading,
    error: query.error
  };
};
