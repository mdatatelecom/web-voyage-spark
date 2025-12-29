import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeTopic {
  id: string;
  category: string;
  topic: string;
  content: string;
  keywords: string[] | null;
  version: number | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface KnowledgeInput {
  category: string;
  topic: string;
  content: string;
  keywords?: string[];
}

export function useKnowledgeBase(categoryFilter?: string, searchQuery?: string) {
  const queryClient = useQueryClient();

  const { data: topics, isLoading, error } = useQuery({
    queryKey: ['knowledge-base', categoryFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('system_knowledge')
        .select('*')
        .order('category')
        .order('topic');

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      if (searchQuery) {
        query = query.or(`topic.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeTopic[];
    },
  });

  const categories = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_knowledge')
        .select('category')
        .order('category');

      if (error) throw error;
      const uniqueCategories = [...new Set(data.map(d => d.category))];
      return uniqueCategories;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: KnowledgeInput) => {
      const { data, error } = await supabase
        .from('system_knowledge')
        .insert({
          category: input.category,
          topic: input.topic,
          content: input.content,
          keywords: input.keywords || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Tópico criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tópico: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: KnowledgeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('system_knowledge')
        .update({
          category: input.category,
          topic: input.topic,
          content: input.content,
          keywords: input.keywords || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Tópico atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tópico: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_knowledge')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Tópico excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tópico: ${error.message}`);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (topics: KnowledgeInput[]) => {
      const { data, error } = await supabase
        .from('system_knowledge')
        .insert(topics.map(t => ({
          category: t.category,
          topic: t.topic,
          content: t.content,
          keywords: t.keywords || [],
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success(`${data.length} tópicos importados com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar tópicos: ${error.message}`);
    },
  });

  return {
    topics,
    isLoading,
    error,
    categories: categories.data || [],
    categoriesLoading: categories.isLoading,
    createTopic: createMutation.mutate,
    updateTopic: updateMutation.mutate,
    deleteTopic: deleteMutation.mutate,
    bulkCreateTopics: bulkCreateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkCreating: bulkCreateMutation.isPending,
  };
}
