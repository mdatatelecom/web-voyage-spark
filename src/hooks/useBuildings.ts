import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBuildings = () => {
  const queryClient = useQueryClient();

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          floors:floors(
            count,
            rooms:rooms(
              count,
              racks:racks(count)
            )
          )
        `)
        .order('name');

      if (error) throw error;
      
      // Aggregate room and rack counts
      return data.map(building => ({
        ...building,
        rooms: [{
          count: building.floors?.reduce((acc: number, floor: any) => 
            acc + (floor.rooms?.[0]?.count || 0), 0) || 0
        }],
        racks: [{
          count: building.floors?.reduce((acc: number, floor: any) => 
            floor.rooms?.reduce((rAcc: number, room: any) => 
              rAcc + (room.racks?.[0]?.count || 0), acc) || acc, 0) || 0
        }]
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { 
      name: string; 
      internal_code?: string;
      building_type?: string;
      address?: string;
      zip_code?: string;
      city?: string;
      state?: string;
      latitude?: number | null;
      longitude?: number | null;
      contact_name?: string;
      contact_phone?: string;
      contact_email?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('buildings')
        .insert([values])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Prédio criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar prédio: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { 
      id: string; 
      name: string; 
      internal_code?: string;
      building_type?: string;
      address?: string;
      zip_code?: string;
      city?: string;
      state?: string;
      latitude?: number | null;
      longitude?: number | null;
      contact_name?: string;
      contact_phone?: string;
      contact_email?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('buildings')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Prédio atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar prédio: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if building has floors
      const { count } = await supabase
        .from('floors')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', id);
      
      if (count && count > 0) {
        throw new Error(`Não é possível excluir. Existem ${count} andares cadastrados.`);
      }

      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Prédio excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    buildings,
    isLoading,
    createBuilding: createMutation.mutate,
    updateBuilding: updateMutation.mutate,
    deleteBuilding: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
