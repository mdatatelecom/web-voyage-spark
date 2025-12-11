import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';

interface PoeCalculationResult {
  usedWatts: number;
  totalBudget: number;
  activePorts: number;
  totalPorts: number;
  usagePercentage: number;
  powerPerPort: Record<string, number>;
}

export const usePoeCalculation = (equipmentId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['poe-calculation', equipmentId],
    queryFn: async (): Promise<PoeCalculationResult> => {
      // Fetch equipment with its PoE budget
      const { data: equipment, error: eqError } = await supabase
        .from('equipment')
        .select('poe_budget_watts, poe_power_per_port, type')
        .eq('id', equipmentId)
        .single();

      if (eqError) throw eqError;

      // Only calculate for PoE-capable equipment
      if (!equipment?.poe_budget_watts || equipment.poe_budget_watts <= 0) {
        return {
          usedWatts: 0,
          totalBudget: 0,
          activePorts: 0,
          totalPorts: 0,
          usagePercentage: 0,
          powerPerPort: {}
        };
      }

      // Fetch ports of this equipment
      const { data: ports, error: portsError } = await supabase
        .from('ports')
        .select('id, name, status, port_type')
        .eq('equipment_id', equipmentId);

      if (portsError) throw portsError;

      const inUsePorts = ports?.filter(p => p.status === 'in_use') || [];
      const poePortTypes = ['rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus', 'rj45'];

      // Count only PoE-capable ports that are in use
      const activePorts = inUsePorts.filter(p => poePortTypes.includes(p.port_type || 'rj45'));

      // Get power per port from stored data or calculate
      let powerPerPort: Record<string, number> = {};
      let usedWatts = 0;

      if (equipment.poe_power_per_port && typeof equipment.poe_power_per_port === 'object') {
        powerPerPort = equipment.poe_power_per_port as Record<string, number>;
        usedWatts = Object.values(powerPerPort).reduce((sum, watts) => sum + (watts || 0), 0);
      } else {
        // Calculate based on connected equipment
        for (const port of activePorts) {
          // Find connection for this port
          const { data: connection } = await supabase
            .from('connections')
            .select('port_a_id, port_b_id, status')
            .or(`port_a_id.eq.${port.id},port_b_id.eq.${port.id}`)
            .eq('status', 'active')
            .maybeSingle();

          if (connection) {
            // Get the other port
            const otherPortId = connection.port_a_id === port.id ? connection.port_b_id : connection.port_a_id;
            
            // Find the equipment connected to the other port
            const { data: otherPort } = await supabase
              .from('ports')
              .select('equipment_id')
              .eq('id', otherPortId)
              .single();

            if (otherPort) {
              const { data: connectedEquipment } = await supabase
                .from('equipment')
                .select('type')
                .eq('id', otherPort.equipment_id)
                .single();

              if (connectedEquipment) {
                const consumption = POE_POWER_CONSUMPTION[connectedEquipment.type] || 0;
                powerPerPort[port.id] = consumption;
                usedWatts += consumption;
              }
            }
          }
        }
      }

      const usagePercentage = equipment.poe_budget_watts > 0 
        ? (usedWatts / equipment.poe_budget_watts) * 100 
        : 0;

      return {
        usedWatts,
        totalBudget: equipment.poe_budget_watts,
        activePorts: activePorts.length,
        totalPorts: ports?.filter(p => poePortTypes.includes(p.port_type || 'rj45')).length || 0,
        usagePercentage,
        powerPerPort
      };
    },
    enabled: !!equipmentId
  });

  return {
    poeData: data,
    isLoading
  };
};

// Helper to calculate PoE consumption for a device type
export const getPoePowerConsumption = (equipmentType: string): number => {
  return POE_POWER_CONSUMPTION[equipmentType] || 0;
};
