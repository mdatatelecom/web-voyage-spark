import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentPosition {
  id: string;
  floor_plan_id: string;
  equipment_id: string;
  position_x: number;
  position_y: number;
  rotation: number;
  icon_size: string;
  custom_label: string | null;
  custom_icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  equipment?: {
    id: string;
    name: string;
    type: string;
    ip_address: string | null;
    equipment_status: string | null;
    manufacturer: string | null;
    model: string | null;
  };
}

export const useEquipmentPositions = (floorPlanId?: string) => {
  const queryClient = useQueryClient();

  const { data: positions, isLoading } = useQuery({
    queryKey: ['equipment_positions', floorPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_positions')
        .select(`
          *,
          equipment (
            id,
            name,
            type,
            ip_address,
            equipment_status,
            manufacturer,
            model
          )
        `)
        .eq('floor_plan_id', floorPlanId);
      
      if (error) throw error;
      return data as EquipmentPosition[];
    },
    enabled: !!floorPlanId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ 
      floorPlanId, 
      equipmentId, 
      x, 
      y,
      customLabel,
      customIcon
    }: { 
      floorPlanId: string; 
      equipmentId: string; 
      x: number; 
      y: number;
      customLabel?: string;
      customIcon?: string;
    }) => {
      const { data, error } = await supabase
        .from('equipment_positions')
        .insert({
          floor_plan_id: floorPlanId,
          equipment_id: equipmentId,
          position_x: x,
          position_y: y,
          custom_label: customLabel,
          custom_icon: customIcon === 'auto' ? null : customIcon,
        })
        .select(`
          *,
          equipment (
            id,
            name,
            type,
            ip_address,
            equipment_status,
            manufacturer,
            model
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_positions'] });
      toast.success('Equipamento posicionado com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Este equipamento já está posicionado nesta planta');
      } else {
        toast.error(`Erro ao posicionar equipamento: ${error.message}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      x, 
      y,
      rotation,
      iconSize,
      customLabel,
      customIcon
    }: { 
      id: string; 
      x?: number; 
      y?: number;
      rotation?: number;
      iconSize?: string;
      customLabel?: string;
      customIcon?: string | null;
    }) => {
      const updates: Record<string, any> = {};
      if (x !== undefined) updates.position_x = x;
      if (y !== undefined) updates.position_y = y;
      if (rotation !== undefined) updates.rotation = rotation;
      if (iconSize !== undefined) updates.icon_size = iconSize;
      if (customLabel !== undefined) updates.custom_label = customLabel;
      if (customIcon !== undefined) updates.custom_icon = customIcon === 'auto' ? null : customIcon;

      const { error } = await supabase
        .from('equipment_positions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_positions'] });
      toast.success('Posição atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar posição: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_positions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_positions'] });
      toast.success('Marcador removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover marcador: ${error.message}`);
    },
  });

  return {
    positions,
    isLoading,
    createPosition: createMutation.mutate,
    updatePosition: updateMutation.mutate,
    deletePosition: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
