import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardFilters } from './useDashboardFilters';

export interface DashboardStatsFilters {
  buildingId?: string;
  connectionStatus?: string;
  equipmentType?: string;
}

export const getBuildingRackIds = async (buildingId: string): Promise<string[]> => {
  const { data: floors } = await supabase
    .from('floors')
    .select('id')
    .eq('building_id', buildingId);
  if (!floors?.length) return [];

  const floorIds = floors.map(f => f.id);
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .in('floor_id', floorIds);
  if (!rooms?.length) return [];

  const roomIds = rooms.map(r => r.id);
  const { data: racks } = await supabase
    .from('racks')
    .select('id')
    .in('room_id', roomIds);

  return racks?.map(r => r.id) || [];
};

export const getBuildingEquipmentIds = async (buildingId: string): Promise<string[]> => {
  const rackIds = await getBuildingRackIds(buildingId);
  if (!rackIds.length) return [];

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id')
    .in('rack_id', rackIds);

  return equipment?.map(e => e.id) || [];
};

export const useRackOccupancyStats = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['rack-occupancy-stats', filters?.buildingId],
    queryFn: async () => {
      let query = supabase
        .from('racks')
        .select(`
          id,
          name,
          size_u,
          room:rooms!inner(
            name,
            floor:floors!inner(
              name,
              building:buildings!inner(id, name)
            )
          ),
          equipment(position_u_start, position_u_end)
        `);

      const { data: racks, error } = await query;
      if (error) throw error;

      let filtered = racks;
      if (filters?.buildingId) {
        filtered = racks.filter(rack => rack.room.floor.building.id === filters.buildingId);
      }

      return filtered.map(rack => {
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
    staleTime: 5 * 60 * 1000,
  });
};

export const useEquipmentTypeStats = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['equipment-type-stats', filters?.buildingId, filters?.equipmentType],
    queryFn: async () => {
      let query = supabase.from('equipment').select('type, rack_id');

      if (filters?.equipmentType) {
        query = query.eq('type', filters.equipmentType as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data;
      if (filters?.buildingId) {
        const rackIds = await getBuildingRackIds(filters.buildingId);
        filtered = data.filter(e => e.rack_id && rackIds.includes(e.rack_id));
      }

      const typeCounts = filtered.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useConnectionStatusStats = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['connection-status-stats', filters?.buildingId, filters?.connectionStatus],
    queryFn: async () => {
      let query = supabase.from('connections').select('status, port_a_id');

      if (filters?.connectionStatus) {
        query = query.eq('status', filters.connectionStatus as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Building filter requires joining through ports -> equipment -> racks -> rooms -> floors -> buildings
      // For simplicity, we filter client-side if buildingId is set
      let filtered = data;
      if (filters?.buildingId) {
        const equipmentIds = await getBuildingEquipmentIds(filters.buildingId);
        if (equipmentIds.length) {
          const { data: ports } = await supabase
            .from('ports')
            .select('id')
            .in('equipment_id', equipmentIds);
          const portIds = new Set(ports?.map(p => p.id) || []);
          filtered = data.filter(c => portIds.has(c.port_a_id));
        } else {
          filtered = [];
        }
      }

      const statusCounts = filtered.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePortUsageStats = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['port-usage-stats', filters?.buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ports')
        .select('status, equipment_id');

      if (error) throw error;

      let filtered = data;
      if (filters?.buildingId) {
        const equipmentIds = await getBuildingEquipmentIds(filters.buildingId);
        const eqSet = new Set(equipmentIds);
        filtered = data.filter(p => eqSet.has(p.equipment_id));
      }

      const available = filtered.filter(p => p.status === 'available').length;
      const inUse = filtered.filter(p => p.status === 'in_use').length;
      const reserved = filtered.filter(p => p.status === 'reserved').length;

      return {
        total: filtered.length,
        available,
        inUse,
        reserved,
        availablePercentage: filtered.length > 0 ? Math.round((available / filtered.length) * 100) : 0,
        inUsePercentage: filtered.length > 0 ? Math.round((inUse / filtered.length) * 100) : 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardCounts = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['dashboard-stats', filters?.buildingId, filters?.connectionStatus, filters?.equipmentType],
    queryFn: async () => {
      if (!filters?.buildingId) {
        const [buildings, racks, equipment, connections] = await Promise.all([
          supabase.from('buildings').select('count', { count: 'exact', head: true }),
          supabase.from('racks').select('count', { count: 'exact', head: true }),
          supabase.from('equipment').select('count', { count: 'exact', head: true }),
          supabase.from('connections').select('count', { count: 'exact', head: true }),
        ]);
        return {
          buildings: buildings.count || 0,
          racks: racks.count || 0,
          equipment: equipment.count || 0,
          connections: connections.count || 0,
        };
      }

      const rackIds = await getBuildingRackIds(filters.buildingId);
      const equipmentIds = await getBuildingEquipmentIds(filters.buildingId);

      let connectionsCount = 0;
      if (equipmentIds.length > 0) {
        const { data: ports } = await supabase
          .from('ports')
          .select('id')
          .in('equipment_id', equipmentIds);
        const portIds = ports?.map(p => p.id) || [];
        if (portIds.length > 0) {
          const { count } = await supabase
            .from('connections')
            .select('count', { count: 'exact', head: true })
            .or(`port_a_id.in.(${portIds.join(',')}),port_b_id.in.(${portIds.join(',')})`);
          connectionsCount = count || 0;
        }
      }

      return {
        buildings: 1,
        racks: rackIds.length,
        equipment: equipmentIds.length,
        connections: connectionsCount,
      };
    },
    staleTime: 30 * 1000,
  });
};
