import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoredWhatsAppGroup {
  id: string;
  subject: string;
  size: number | null;
  picture_url: string | null;
}

/**
 * Lista grupos de WhatsApp já sincronizados (cache em `whatsapp_groups`).
 * Use para popular seletores em formulários sem chamar a Evolution API.
 */
export const useStoredWhatsAppGroups = () => {
  return useQuery({
    queryKey: ['whatsapp-groups-stored'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('id, subject, size, picture_url')
        .order('subject', { ascending: true });
      if (error) throw error;
      return (data || []) as StoredWhatsAppGroup[];
    },
    staleTime: 60_000,
  });
};
