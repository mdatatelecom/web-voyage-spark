import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HierarchyRack {
  id: string;
  name: string;
  size_u: number;
  equipment_count: number;
  occupied_u: number;
}

export interface HierarchyRoom {
  id: string;
  name: string;
  room_type: string | null;
  racks: HierarchyRack[];
}

export interface HierarchyFloor {
  id: string;
  name: string;
  floor_number: number | null;
  rooms: HierarchyRoom[];
}

export interface HierarchyBuilding {
  id: string;
  name: string;
  building_type: string | null;
  city: string | null;
  state: string | null;
  floors: HierarchyFloor[];
}

export const useBuildingHierarchy = () => {
  return useQuery({
    queryKey: ['building-hierarchy'],
    queryFn: async () => {
      // Fetch buildings
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, building_type, city, state')
        .order('name');

      if (buildingsError) throw buildingsError;

      // Fetch all floors
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('id, name, floor_number, building_id')
        .order('floor_number');

      if (floorsError) throw floorsError;

      // Fetch all rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, room_type, floor_id')
        .order('name');

      if (roomsError) throw roomsError;

      // Fetch all racks
      const { data: racks, error: racksError } = await supabase
        .from('racks')
        .select('id, name, size_u, room_id')
        .order('name');

      if (racksError) throw racksError;

      // Fetch equipment counts per rack
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('rack_id, position_u_start, position_u_end');

      if (equipmentError) throw equipmentError;

      // Calculate equipment count and occupied U per rack
      const rackStats = racks.map(rack => {
        const rackEquipment = equipment?.filter(e => e.rack_id === rack.id) || [];
        const equipmentCount = rackEquipment.length;
        const occupiedU = rackEquipment.reduce((sum, e) => {
          if (e.position_u_start && e.position_u_end) {
            return sum + Math.abs(e.position_u_end - e.position_u_start) + 1;
          }
          return sum;
        }, 0);

        return {
          ...rack,
          equipment_count: equipmentCount,
          occupied_u: occupiedU,
        };
      });

      // Build hierarchy
      const hierarchy: HierarchyBuilding[] = buildings?.map(building => ({
        ...building,
        floors: floors
          ?.filter(f => f.building_id === building.id)
          .map(floor => ({
            ...floor,
            rooms: rooms
              ?.filter(r => r.floor_id === floor.id)
              .map(room => ({
                ...room,
                racks: rackStats.filter(rack => rack.room_id === room.id),
              })) || [],
          })) || [],
      })) || [];

      return hierarchy;
    },
  });
};
