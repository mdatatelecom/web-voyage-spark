import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';

type CableType = Database['public']['Enums']['cable_type'];
type ConnectionStatus = Database['public']['Enums']['connection_status'];

// Helper to update PoE power consumption when connections change
async function updatePoePowerForConnection(portAId: string, portBId: string, action: 'add' | 'remove') {
  try {
    // Get both ports with their equipment info
    const { data: ports } = await supabase
      .from('ports')
      .select('id, equipment_id, port_type')
      .in('id', [portAId, portBId]);

    if (!ports || ports.length !== 2) return;

    // Get equipment for both ports
    const equipmentIds = ports.map(p => p.equipment_id);
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, type, poe_budget_watts, poe_power_per_port')
      .in('id', equipmentIds);

    if (!equipment || equipment.length !== 2) return;

    const port1 = ports[0];
    const port2 = ports[1];
    const eq1 = equipment.find(e => e.id === port1.equipment_id);
    const eq2 = equipment.find(e => e.id === port2.equipment_id);

    if (!eq1 || !eq2) return;

    // Check if one is a PoE switch and the other is a PoE consumer
    const poeSwitch = eq1.poe_budget_watts && eq1.poe_budget_watts > 0 ? eq1 : 
                      eq2.poe_budget_watts && eq2.poe_budget_watts > 0 ? eq2 : null;
    
    if (!poeSwitch) return; // No PoE switch involved

    const poeSwitchPort = poeSwitch.id === eq1.id ? port1 : port2;
    const connectedEquipment = poeSwitch.id === eq1.id ? eq2 : eq1;
    
    // Get power consumption for the connected device
    const powerConsumption = POE_POWER_CONSUMPTION[connectedEquipment.type] || 0;
    
    if (powerConsumption <= 0) return; // Device doesn't consume PoE

    // Update poe_power_per_port on the PoE switch
    const currentPower = (poeSwitch.poe_power_per_port as Record<string, number>) || {};
    
    if (action === 'add') {
      currentPower[poeSwitchPort.id] = powerConsumption;
    } else {
      delete currentPower[poeSwitchPort.id];
    }

    await supabase
      .from('equipment')
      .update({ poe_power_per_port: currentPower })
      .eq('id', poeSwitch.id);

    console.log(`PoE power ${action === 'add' ? 'added' : 'removed'}: ${powerConsumption}W on port ${poeSwitchPort.id}`);
  } catch (error) {
    console.error('Error updating PoE power:', error);
  }
}

interface ConnectionData {
  port_a_id: string;
  port_b_id: string;
  cable_type: CableType;
  cable_length_meters?: number;
  cable_color?: string;
  status?: ConnectionStatus;
  notes?: string;
  vlan_id?: number;
  vlan_name?: string;
  vlan_tagging?: 'tagged' | 'untagged' | 'native';
}

export const useConnections = () => {
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_connection_details')
        .select('*')
        .order('connection_code', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: ConnectionData) => {
      const { data: ports } = await supabase.from('ports').select('id, status, name').in('id', [values.port_a_id, values.port_b_id]);
      const unavailablePorts = ports?.filter(p => p.status !== 'available');
      if (unavailablePorts && unavailablePorts.length > 0) {
        throw new Error(`Portas não disponíveis: ${unavailablePorts.map(p => p.name).join(', ')}`);
      }
      const { data: { user } } = await supabase.auth.getUser();
      const insertData: any = { port_a_id: values.port_a_id, port_b_id: values.port_b_id, cable_type: values.cable_type, status: values.status || 'active', installed_by: user?.id };
      if (values.cable_length_meters) insertData.cable_length_meters = values.cable_length_meters;
      if (values.cable_color) insertData.cable_color = values.cable_color;
      if (values.notes) insertData.notes = values.notes;
      if (values.vlan_id) insertData.vlan_id = values.vlan_id;
      if (values.vlan_name) insertData.vlan_name = values.vlan_name;
      if (values.vlan_tagging) insertData.vlan_tagging = values.vlan_tagging;
      const { data: newConnection, error: connError } = await supabase.from('connections').insert([insertData]).select().single();
      if (connError) throw connError;
      const { error: portsError } = await supabase.from('ports').update({ status: 'in_use' }).in('id', [values.port_a_id, values.port_b_id]);
      if (portsError) throw portsError;
      
      // Update PoE power consumption
      await updatePoePowerForConnection(values.port_a_id, values.port_b_id, 'add');
      
      return newConnection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      toast.success(`Conexão ${data.connection_code} criada!`);
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data: connection } = await supabase.from('connections').select('port_a_id, port_b_id').eq('id', connectionId).single();
      if (!connection) throw new Error('Conexão não encontrada');
      await supabase.from('connections').update({ status: 'inactive' }).eq('id', connectionId);
      await supabase.from('ports').update({ status: 'available' }).in('id', [connection.port_a_id, connection.port_b_id]);
      
      // Remove PoE power consumption
      await updatePoePowerForConnection(connection.port_a_id, connection.port_b_id, 'remove');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      toast.success('Conexão desconectada!');
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data: connection } = await supabase.from('connections').select('status, port_a_id, port_b_id').eq('id', connectionId).single();
      if (connection?.status === 'active') {
        await supabase.from('ports').update({ status: 'available' }).in('id', [connection.port_a_id, connection.port_b_id]);
        // Remove PoE power consumption
        await updatePoePowerForConnection(connection.port_a_id, connection.port_b_id, 'remove');
      }
      const { error } = await supabase.from('connections').delete().eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      toast.success('Conexão excluída!');
    },
    onError: (error: Error) => toast.error(error.message)
  });

  return {
    connections,
    isLoading,
    createConnection: createMutation.mutate,
    disconnectConnection: disconnectMutation.mutate,
    deleteConnection: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
