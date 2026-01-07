import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RackHistoryEvent {
  id: string;
  rack_id: string;
  equipment_id: string | null;
  equipment_name: string;
  action: 'installed' | 'removed' | 'moved';
  position_u_start: number;
  position_u_end: number;
  mount_side: string;
  previous_rack_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  previous_rack?: {
    name: string;
  } | null;
}

export const useRackHistory = (rackId: string | undefined) => {
  return useQuery({
    queryKey: ['rack-history', rackId],
    queryFn: async (): Promise<RackHistoryEvent[]> => {
      if (!rackId) return [];
      
      const { data, error } = await supabase
        .from('rack_occupancy_history')
        .select(`
          *,
          previous_rack:racks!rack_occupancy_history_previous_rack_id_fkey(name)
        `)
        .eq('rack_id', rackId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []) as RackHistoryEvent[];
    },
    enabled: !!rackId,
  });
};
