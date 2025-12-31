import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';

interface PoeSwitchSuggestion {
  id: string;
  name: string;
  poe_budget_watts: number;
  usedWatts: number;
  availableWatts: number;
  hasCapacity: boolean;
  sameRoom: boolean;
  roomName: string;
  rackName: string;
  availablePorts: {
    id: string;
    name: string;
    port_type: string;
  }[];
}

export const usePoeSwitchSuggestions = (deviceType: string | null, roomId?: string) => {
  return useQuery({
    queryKey: ['poe-switch-suggestions', deviceType, roomId],
    queryFn: async (): Promise<PoeSwitchSuggestion[]> => {
      if (!deviceType) return [];
      
      // Check if device consumes PoE
      const consumption = POE_POWER_CONSUMPTION[deviceType] || 0;
      if (consumption === 0) return [];

      // Fetch PoE switches with budget
      const { data: poeSwitches, error } = await supabase
        .from('equipment')
        .select(`
          id, 
          name, 
          poe_budget_watts, 
          poe_power_per_port,
          rack:racks!inner(
            id, 
            name, 
            room_id,
            room:rooms!inner(id, name)
          ),
          ports!inner(id, name, status, port_type)
        `)
        .eq('type', 'switch_poe')
        .not('poe_budget_watts', 'is', null);

      if (error || !poeSwitches) {
        console.error('Error fetching PoE switches:', error);
        return [];
      }

      // Calculate available budget and filter
      const suggestions = poeSwitches
        .map((sw: any) => {
          const poePortPower = sw.poe_power_per_port || {};
          const usedWatts = Object.values(poePortPower as Record<string, number>).reduce(
            (sum: number, w: number) => sum + (w || 0),
            0
          );
          const availableWatts = (sw.poe_budget_watts || 0) - usedWatts;
          const hasCapacity = availableWatts >= consumption;
          const switchRoomId = sw.rack?.room_id;
          const sameRoom = roomId ? switchRoomId === roomId : false;

          // Filter PoE-capable ports that are available
          // For PoE switches, any RJ45 port can provide PoE power
          const availablePorts = (sw.ports || []).filter(
            (p: any) =>
              p.status === 'available' &&
              (
                ['rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'].includes(p.port_type) ||
                p.port_type === 'rj45' // PoE switch can power any RJ45 port
              )
          );

          return {
            id: sw.id,
            name: sw.name,
            poe_budget_watts: sw.poe_budget_watts,
            usedWatts,
            availableWatts,
            hasCapacity,
            sameRoom,
            roomName: sw.rack?.room?.name || '',
            rackName: sw.rack?.name || '',
            availablePorts: availablePorts.map((p: any) => ({
              id: p.id,
              name: p.name,
              port_type: p.port_type,
            })),
          };
        })
        .filter((sw) => sw.hasCapacity && sw.availablePorts.length > 0)
        .sort((a, b) => {
          // Prioritize same room
          if (a.sameRoom && !b.sameRoom) return -1;
          if (!a.sameRoom && b.sameRoom) return 1;
          // Then sort by available budget (more space first)
          return b.availableWatts - a.availableWatts;
        });

      return suggestions;
    },
    enabled: !!deviceType && (POE_POWER_CONSUMPTION[deviceType] || 0) > 0,
  });
};

export const getDevicePoeConsumption = (deviceType: string): number => {
  return POE_POWER_CONSUMPTION[deviceType] || 0;
};

export const getPoeClass = (watts: number): string => {
  if (watts <= 15.4) return '802.3af';
  if (watts <= 30) return '802.3at (PoE+)';
  if (watts <= 60) return '802.3bt Type 3';
  if (watts <= 100) return '802.3bt Type 4';
  return 'High Power';
};
