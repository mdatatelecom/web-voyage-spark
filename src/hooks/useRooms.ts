import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRooms = (floorId?: string) => {
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', floorId],
    queryFn: async () => {
      let query = supabase
        .from('rooms')
        .select(`
          *,
          racks(count)
        `)
        .order('name');
      
      if (floorId) {
        query = query.eq('floor_id', floorId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!floorId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: { name: string; room_type?: string; floor_id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .insert([values])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Sala criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar sala: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name: string; room_type?: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Sala atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar sala: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('racks')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', id);
      
      if (count && count > 0) {
        throw new Error(`Não é possível excluir. Existem ${count} racks cadastrados.`);
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Sala excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    rooms,
    isLoading,
    createRoom: createMutation.mutate,
    updateRoom: updateMutation.mutate,
    deleteRoom: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
