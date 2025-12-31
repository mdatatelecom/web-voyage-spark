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
  };
}

export const useRackPositions = (floorPlanId?: string) => {
  const queryClient = useQueryClient();

  const { data: rackPositions, isLoading } = useQuery({
    queryKey: ['rack_positions', floorPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rack_positions')
        .select(`
          *,
          rack:racks(id, name, size_u, room_id)
        `)
        .eq('floor_plan_id', floorPlanId!);
      
      if (error) throw error;
      return data as RackPosition[];
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
