import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RackPosition {
  id: string;
  floor_plan_id: string;
  rack_id: string;
  position_x: number;
  position_y: number;
  rotation: number;
  width: number;
  height: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rack?: {
    id: string;
    name: string;
    size_u: number;
    room_id: string;
    room?: {
      name: string;
    };
  };
  // Calculated fields
  equipment_count?: number;
  used_u?: number;
  occupancy_percent?: number;
}

export const useRackPositions = (floorPlanId?: string) => {
  const queryClient = useQueryClient();

  const { data: rackPositions, isLoading } = useQuery({
    queryKey: ['rack_positions', floorPlanId],
    queryFn: async () => {
      // Fetch rack positions with rack and room info
      const { data, error } = await supabase
        .from('rack_positions')
        .select(`
          *,
          rack:racks(
            id, name, size_u, room_id,
            room:rooms(name)
          )
        `)
        .eq('floor_plan_id', floorPlanId!);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get rack IDs to fetch equipment
      const rackIds = data.map(p => p.rack_id);
      
      // Fetch equipment for these racks to calculate occupancy
      const { data: equipment } = await supabase
        .from('equipment')
        .select('rack_id, position_u_start, position_u_end')
        .in('rack_id', rackIds);

      // Calculate occupancy for each rack
      const enrichedData = data.map(pos => {
        const rackEquip = equipment?.filter(e => e.rack_id === pos.rack_id) || [];
        const usedU = rackEquip.reduce((sum, e) => {
          if (e.position_u_start != null && e.position_u_end != null) {
            return sum + Math.abs(e.position_u_end - e.position_u_start) + 1;
          }
          return sum;
        }, 0);
        const sizeU = pos.rack?.size_u || 42;
        return {
          ...pos,
          equipment_count: rackEquip.length,
          used_u: usedU,
          occupancy_percent: Math.round((usedU / sizeU) * 100),
        };
      });

      return enrichedData as RackPosition[];
    },
    enabled: !!floorPlanId,
  });

  const createMutation = useMutation({
    mutationFn: async (position: {
      floor_plan_id: string;
      rack_id: string;
      position_x: number;
      position_y: number;
      rotation?: number;
      width?: number;
      height?: number;
    }) => {
      const { data, error } = await supabase
        .from('rack_positions')
        .insert(position)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack_positions'] });
      toast.success('Rack adicionado à planta!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar rack: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      position_x?: number; 
      position_y?: number;
      rotation?: number;
      width?: number;
      height?: number;
    }) => {
      const { error } = await supabase
        .from('rack_positions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack_positions'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar posição: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rack_positions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack_positions'] });
      toast.success('Rack removido da planta!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover rack: ${error.message}`);
    },
  });

  return {
    rackPositions,
    isLoading,
    addRackPosition: createMutation.mutate,
    updateRackPosition: updateMutation.mutate,
    deleteRackPosition: deleteMutation.mutate,
    isAdding: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};
