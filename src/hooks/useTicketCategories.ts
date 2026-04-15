import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TicketCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketSubcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTicketCategories = () => {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as TicketCategory[];
    },
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['ticket-subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_subcategories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as TicketSubcategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: { name: string; slug: string; color: string; icon?: string }) => {
      const maxOrder = categoriesQuery.data?.reduce((max, c) => Math.max(max, c.display_order), 0) || 0;
      const { data, error } = await supabase
        .from('ticket_categories')
        .insert({ ...category, display_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Categoria atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Categoria removida');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover categoria: ${error.message}`);
    },
  });

  const createSubcategory = useMutation({
    mutationFn: async (sub: { category_id: string; name: string; slug: string }) => {
      const catSubs = subcategoriesQuery.data?.filter(s => s.category_id === sub.category_id) || [];
      const maxOrder = catSubs.reduce((max, s) => Math.max(max, s.display_order), 0);
      const { data, error } = await supabase
        .from('ticket_subcategories')
        .insert({ ...sub, display_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-subcategories'] });
      toast.success('Subcategoria criada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar subcategoria: ${error.message}`);
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketSubcategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_subcategories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-subcategories'] });
      toast.success('Subcategoria atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar subcategoria: ${error.message}`);
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_subcategories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-subcategories'] });
      toast.success('Subcategoria removida');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover subcategoria: ${error.message}`);
    },
  });

  // Helper functions
  const getCategoryLabel = (slug: string): string => {
    const cat = categoriesQuery.data?.find(c => c.slug === slug);
    return cat?.name || slug;
  };

  const getCategoryBySlug = (slug: string) => {
    return categoriesQuery.data?.find(c => c.slug === slug);
  };

  const getSubcategoriesByCategory = (categoryId: string) => {
    return subcategoriesQuery.data?.filter(s => s.category_id === categoryId && s.is_active) || [];
  };

  const getSubcategoryLabel = (id: string): string => {
    const sub = subcategoriesQuery.data?.find(s => s.id === id);
    return sub?.name || '';
  };

  const activeCategories = categoriesQuery.data?.filter(c => c.is_active) || [];

  return {
    categories: categoriesQuery.data || [],
    activeCategories,
    subcategories: subcategoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading || subcategoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    getCategoryLabel,
    getCategoryBySlug,
    getSubcategoriesByCategory,
    getSubcategoryLabel,
  };
};
