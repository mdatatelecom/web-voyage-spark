import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandingContent {
  id: string;
  content_key: string;
  content_type: 'text' | 'feature' | 'highlight';
  title: string | null;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useLandingContent = () => {
  const queryClient = useQueryClient();

  // Buscar todo conteúdo
  const { data: allContent, isLoading } = useQuery({
    queryKey: ['landing-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as LandingContent[];
    },
  });

  // Filtrar por tipo
  const texts = allContent?.filter(c => c.content_type === 'text') || [];
  const features = allContent?.filter(c => c.content_type === 'feature') || [];
  const highlights = allContent?.filter(c => c.content_type === 'highlight') || [];

  // Helpers para acessar textos específicos
  const getTextByKey = (key: string) => texts.find(t => t.content_key === key);
  
  const heroDescription = getTextByKey('hero_description');
  const screenshotsTitle = getTextByKey('screenshots_title');
  const highlightsSubtitle = getTextByKey('highlights_subtitle');
  const highlightsTitle = getTextByKey('highlights_title');

  // Mutation para atualizar
  const updateContent = useMutation({
    mutationFn: async ({ id, ...data }: Partial<LandingContent> & { id: string }) => {
      const { error } = await supabase
        .from('landing_content')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('Conteúdo atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conteúdo: ' + error.message);
    },
  });

  // Mutation para criar
  const createContent = useMutation({
    mutationFn: async (data: Omit<LandingContent, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('landing_content')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('Conteúdo criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar conteúdo: ' + error.message);
    },
  });

  // Mutation para deletar
  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('landing_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('Conteúdo removido com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover conteúdo: ' + error.message);
    },
  });

  // Mutation para reordenar
  const reorderContent = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const promises = items.map(item =>
        supabase
          .from('landing_content')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
    },
    onError: (error) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });

  return {
    allContent,
    texts,
    features,
    highlights,
    heroDescription,
    screenshotsTitle,
    highlightsSubtitle,
    highlightsTitle,
    isLoading,
    updateContent,
    createContent,
    deleteContent,
    reorderContent,
  };
};
