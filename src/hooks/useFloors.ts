import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFloors = (buildingId?: string) => {
  const queryClient = useQueryClient();

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floors', buildingId],
    queryFn: async () => {
      let query = supabase
        .from('floors')
        .select(`
          *,
          rooms(count)
        `)
        .order('floor_number');
      
      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buildingId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: { 
      name: string; 
      floor_number?: number; 
      building_id: string;
      area_sqm?: number;
      has_access_control?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('floors')
        .insert([values])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Andar criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar andar: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { 
      id: string; 
      name: string; 
      floor_number?: number;
      area_sqm?: number;
      has_access_control?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('floors')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Andar atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar andar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('floor_id', id);
      
      if (count && count > 0) {
        throw new Error(`Não é possível excluir. Existem ${count} salas cadastradas.`);
      }

      const { error } = await supabase
        .from('floors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Andar excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    floors,
    isLoading,
    createFloor: createMutation.mutate,
    updateFloor: updateMutation.mutate,
    deleteFloor: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
