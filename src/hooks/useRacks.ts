import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRacks = (roomId?: string) => {
  const queryClient = useQueryClient();

  const { data: racks, isLoading } = useQuery({
    queryKey: ['racks', roomId],
    queryFn: async () => {
      let query = supabase
        .from('racks')
        .select(`
          *,
          room:rooms(
            name,
            floor:floors(
              name,
              floor_number,
              building:buildings(name)
            )
          ),
          equipment(
            id,
            name,
            type,
            manufacturer,
            model,
            position_u_start,
            position_u_end,
            ip_address,
            hostname,
            ports(count)
          )
        `)
        .order('name');
      
      if (roomId) {
        query = query.eq('room_id', roomId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate occupancy for each rack
      return data.map(rack => {
        const occupiedUs = rack.equipment?.reduce((total: number, eq: any) => {
          return total + (eq.position_u_end - eq.position_u_start + 1);
        }, 0) || 0;
        
        return {
          ...rack,
          occupiedUs,
          availableUs: rack.size_u - occupiedUs,
          occupancyPercentage: (occupiedUs / rack.size_u) * 100
        };
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { name: string; size_u?: number; notes?: string; room_id: string }) => {
      const { data, error } = await supabase
        .from('racks')
        .insert([{ ...values, size_u: values.size_u || 42 }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      toast.success('Rack criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar rack: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name: string; size_u?: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('racks')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      toast.success('Rack atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar rack: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('rack_id', id);
      
      if (count && count > 0) {
        throw new Error(`Não é possível excluir. Existem ${count} equipamentos cadastrados.`);
      }

      const { error } = await supabase
        .from('racks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      toast.success('Rack excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    racks,
    isLoading,
    createRack: createMutation.mutate,
    updateRack: updateMutation.mutate,
    deleteRack: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
