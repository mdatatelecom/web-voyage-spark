import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RackAnnotation {
  id: string;
  rack_id: string;
  position_u: number;
  position_side: string;
  title: string;
  description?: string;
  annotation_type: string;
  priority: string;
  due_date?: string;
  color?: string;
  icon?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useRackAnnotations(rackId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch annotations for a specific rack
  const { data: annotations, isLoading } = useQuery({
    queryKey: ['rack-annotations', rackId],
    queryFn: async () => {
      if (!rackId) return [];
      
      const { data, error } = await supabase
        .from('rack_annotations')
        .select('*')
        .eq('rack_id', rackId)
        .order('position_u', { ascending: true });
      
      if (error) throw error;
      return data as RackAnnotation[];
    },
    enabled: !!rackId,
  });

  // Create annotation mutation
  const createMutation = useMutation({
    mutationFn: async (annotation: Omit<RackAnnotation, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('rack_annotations')
        .insert([annotation])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack-annotations', rackId] });
      toast({
        title: 'Anotação criada',
        description: 'A anotação foi adicionada ao rack com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar anotação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update annotation mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...annotation }: Partial<RackAnnotation> & { id: string }) => {
      const { data, error } = await supabase
        .from('rack_annotations')
        .update(annotation)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack-annotations', rackId] });
      toast({
        title: 'Anotação atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar anotação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete annotation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rack_annotations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack-annotations', rackId] });
      toast({
        title: 'Anotação removida',
        description: 'A anotação foi excluída do rack.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover anotação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    annotations,
    isLoading,
    createAnnotation: createMutation.mutate,
    updateAnnotation: updateMutation.mutate,
    deleteAnnotation: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}