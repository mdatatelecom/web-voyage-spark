import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CameraData {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  equipment_status: string | null;
  notes: string | null;
  rack_id: string;
  rack: {
    id: string;
    name: string;
    room: {
      id: string;
      name: string;
      floor: {
        id: string;
        name: string;
        building: {
          id: string;
          name: string;
        };
      };
    };
  };
  location_photo_url?: string;
  connection_type?: string;
}

export function useCameras(buildingId?: string, floorId?: string, roomId?: string) {
  return useQuery({
    queryKey: ['cameras', buildingId, floorId, roomId],
    queryFn: async () => {
      let query = supabase
        .from('equipment')
        .select(`
          id,
          name,
          manufacturer,
          model,
          equipment_status,
          notes,
          rack_id,
          racks!inner (
            id,
            name,
            room_id,
            rooms!inner (
              id,
              name,
              floor_id,
              floors!inner (
                id,
                name,
                building_id,
                buildings!inner (
                  id,
                  name
                )
              )
            )
          )
        `)
        .in('type', ['ip_camera', 'dvr', 'nvr']);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform nested data structure
      let cameras: CameraData[] = (data || []).map((item: any) => {
        const notes = item.notes ? (typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes) : {};
        return {
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          model: item.model,
          equipment_status: item.equipment_status,
          notes: item.notes,
          rack_id: item.rack_id,
          rack: {
            id: item.racks.id,
            name: item.racks.name,
            room: {
              id: item.racks.rooms.id,
              name: item.racks.rooms.name,
              floor: {
                id: item.racks.rooms.floors.id,
                name: item.racks.rooms.floors.name,
                building: {
                  id: item.racks.rooms.floors.buildings.id,
                  name: item.racks.rooms.floors.buildings.name,
                },
              },
            },
          },
          location_photo_url: notes.locationPhotoUrl,
          connection_type: notes.connectionType || 'ip',
        };
      });
      
      // Apply filters
      if (buildingId) {
        cameras = cameras.filter(c => c.rack.room.floor.building.id === buildingId);
      }
      if (floorId) {
        cameras = cameras.filter(c => c.rack.room.floor.id === floorId);
      }
      if (roomId) {
        cameras = cameras.filter(c => c.rack.room.id === roomId);
      }
      
      return cameras;
    },
  });
}

export function useCamerasByRoom() {
  return useQuery({
    queryKey: ['cameras-by-room'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          manufacturer,
          model,
          equipment_status,
          notes,
          rack_id,
          racks!inner (
            id,
            name,
            room_id,
            rooms!inner (
              id,
              name,
              floor_id,
              floors!inner (
                id,
                name,
                building_id,
                buildings!inner (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('type', 'ip_camera');
      
      if (error) throw error;
      
      // Group cameras by room
      const roomMap = new Map<string, { room: any; cameras: any[] }>();
      
      (data || []).forEach((item: any) => {
        const roomId = item.racks.rooms.id;
        const notes = item.notes ? (typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes) : {};
        
        if (!roomMap.has(roomId)) {
          roomMap.set(roomId, {
            room: {
              id: item.racks.rooms.id,
              name: item.racks.rooms.name,
              floor: {
                id: item.racks.rooms.floors.id,
                name: item.racks.rooms.floors.name,
                building: {
                  id: item.racks.rooms.floors.buildings.id,
                  name: item.racks.rooms.floors.buildings.name,
                },
              },
            },
            cameras: [],
          });
        }
        
        roomMap.get(roomId)!.cameras.push({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          model: item.model,
          equipment_status: item.equipment_status,
          location_photo_url: notes.locationPhotoUrl,
          connection_type: notes.connectionType || 'ip',
        });
      });
      
      return Array.from(roomMap.values());
    },
  });
}
