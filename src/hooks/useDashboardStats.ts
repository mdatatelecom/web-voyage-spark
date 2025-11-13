import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRackOccupancyStats = () => {
  return useQuery({
    queryKey: ['rack-occupancy-stats'],
    queryFn: async () => {
      const { data: racks, error } = await supabase
        .from('racks')
        .select(`
          id,
          name,
          size_u,
          room:rooms!inner(
            name,
            floor:floors!inner(
              name,
              building:buildings!inner(name)
            )
          ),
          equipment(position_u_start, position_u_end)
        `);

      if (error) throw error;

      return racks.map(rack => {
        const occupiedUs = rack.equipment?.reduce((sum, eq) => {
          if (eq.position_u_start && eq.position_u_end) {
            return sum + (eq.position_u_end - eq.position_u_start + 1);
          }
          return sum;
        }, 0) || 0;

        const occupancyPercentage = rack.size_u > 0 ? (occupiedUs / rack.size_u) * 100 : 0;

        return {
          id: rack.id,
          name: rack.name,
          location: `${rack.room.floor.building.name} → ${rack.room.floor.name} → ${rack.room.name}`,
          totalUs: rack.size_u,
          occupiedUs,
          availableUs: rack.size_u - occupiedUs,
          occupancyPercentage: Math.round(occupancyPercentage)
        };
      }).sort((a, b) => b.occupancyPercentage - a.occupancyPercentage);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEquipmentTypeStats = () => {
  return useQuery({
    queryKey: ['equipment-type-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('type');

      if (error) throw error;

      const typeCounts = data.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / data.length) * 100)
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useConnectionStatusStats = () => {
  return useQuery({
    queryKey: ['connection-status-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('status');

      if (error) throw error;

      const statusCounts = data.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePortUsageStats = () => {
  return useQuery({
    queryKey: ['port-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ports')
        .select('status');

      if (error) throw error;

      const available = data.filter(p => p.status === 'available').length;
      const inUse = data.filter(p => p.status === 'in_use').length;
      const reserved = data.filter(p => p.status === 'reserved').length;

      return {
        total: data.length,
        available,
        inUse,
        reserved,
        availablePercentage: data.length > 0 ? Math.round((available / data.length) * 100) : 0,
        inUsePercentage: data.length > 0 ? Math.round((inUse / data.length) * 100) : 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
