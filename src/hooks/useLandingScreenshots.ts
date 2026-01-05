import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandingScreenshot {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useLandingScreenshots = () => {
  const queryClient = useQueryClient();

  const { data: screenshots = [], isLoading, error } = useQuery({
    queryKey: ['landing-screenshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_screenshots')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as LandingScreenshot[];
    },
  });

  const { data: activeScreenshots = [] } = useQuery({
    queryKey: ['landing-screenshots-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_screenshots')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as LandingScreenshot[];
    },
  });

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('landing-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('landing-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error: Error) => {
      toast.error('Erro ao fazer upload: ' + error.message);
    },
  });

  const createScreenshot = useMutation({
    mutationFn: async (data: { title: string; description?: string; image_url: string }) => {
      // Get max display_order
      const { data: maxOrder } = await supabase
        .from('landing_screenshots')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const newOrder = (maxOrder?.display_order ?? -1) + 1;

      const { error } = await supabase
        .from('landing_screenshots')
        .insert({
          ...data,
          display_order: newOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots'] });
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots-active'] });
      toast.success('Screenshot adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar screenshot: ' + error.message);
    },
  });

  const updateScreenshot = useMutation({
    mutationFn: async ({ id, ...data }: Partial<LandingScreenshot> & { id: string }) => {
      const { error } = await supabase
        .from('landing_screenshots')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots'] });
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots-active'] });
      toast.success('Screenshot atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar screenshot: ' + error.message);
    },
  });

  const deleteScreenshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('landing_screenshots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots'] });
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots-active'] });
      toast.success('Screenshot removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover screenshot: ' + error.message);
    },
  });

  const reorderScreenshots = useMutation({
    mutationFn: async (reorderedIds: string[]) => {
      const updates = reorderedIds.map((id, index) => 
        supabase
          .from('landing_screenshots')
          .update({ display_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots'] });
      queryClient.invalidateQueries({ queryKey: ['landing-screenshots-active'] });
      toast.success('Ordem atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });

  return {
    screenshots,
    activeScreenshots,
    isLoading,
    error,
    uploadImage,
    createScreenshot,
    updateScreenshot,
    deleteScreenshot,
    reorderScreenshots,
  };
};
