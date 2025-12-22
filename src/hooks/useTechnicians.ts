import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Technician {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
}

export function useTechnicians() {
  const { data: technicians, isLoading, refetch } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      // Get users with admin or technician roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'technician']);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(userRoles.map(r => r.user_id))];

      // Get profiles for these users including avatar_url
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine data - use first role found for each user
      const technicians: Technician[] = userIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        const userRole = userRoles.find(r => r.user_id === userId);
        
        return {
          id: userId,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          role: userRole?.role || 'technician',
          avatar_url: profile?.avatar_url || null,
        };
      });

      return technicians;
    },
  });

  return { technicians, isLoading, refetch };
}
