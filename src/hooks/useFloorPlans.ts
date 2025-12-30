import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FloorPlan {
  id: string;
  floor_id: string;
  name: string;
  file_url: string;
  file_type: string;
  original_width: number | null;
  original_height: number | null;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useFloorPlans = (floorId?: string) => {
  const queryClient = useQueryClient();

  const { data: floorPlans, isLoading } = useQuery({
    queryKey: ['floor_plans', floorId],
    queryFn: async () => {
      let query = supabase
        .from('floor_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (floorId) {
        query = query.eq('floor_id', floorId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FloorPlan[];
    },
    enabled: !!floorId,
  });

  const activeFloorPlan = floorPlans?.find(fp => fp.is_active) || floorPlans?.[0];

  const uploadMutation = useMutation({
    mutationFn: async ({ 
      floorId, 
      file, 
      name,
      width,
      height 
    }: { 
      floorId: string; 
      file: File; 
      name: string;
      width?: number;
      height?: number;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${floorId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(fileName);
      
      // Create floor plan record
      const { data, error } = await supabase
        .from('floor_plans')
        .insert({
          floor_id: floorId,
          name,
          file_url: publicUrl,
          file_type: file.type,
          original_width: width,
          original_height: height,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor_plans'] });
      toast.success('Planta enviada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar planta: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor_plans'] });
      toast.success('Planta excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir planta: ${error.message}`);
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, set all floor plans for this floor to inactive
      if (floorId) {
        await supabase
          .from('floor_plans')
          .update({ is_active: false })
          .eq('floor_id', floorId);
      }
      
      // Then set the selected one to active
      const { error } = await supabase
        .from('floor_plans')
        .update({ is_active: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor_plans'] });
      toast.success('Planta ativa alterada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar planta ativa: ${error.message}`);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('floor_plans')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor_plans'] });
      toast.success('Planta renomeada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao renomear planta: ${error.message}`);
    },
  });

  return {
    floorPlans,
    activeFloorPlan,
    isLoading,
    uploadFloorPlan: uploadMutation.mutate,
    deleteFloorPlan: deleteMutation.mutate,
    setActiveFloorPlan: setActiveMutation.mutate,
    renameFloorPlan: (id: string, name: string) => renameMutation.mutate({ id, name }),
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
