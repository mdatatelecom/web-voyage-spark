import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];
type PortType = Database['public']['Enums']['port_type'];

interface PortGroup {
  type: string;
  quantity: number;
  speed: string;
  prefix: string;
  startNumber: number;
}

interface EquipmentData {
  name: string;
  type: EquipmentType;
  rack_id: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  hostname?: string;
  ip_address?: string;
  notes?: string;
  mount_side?: string;
  // New fields inspired by NetBox
  asset_tag?: string;
  primary_mac_address?: string;
  power_consumption_watts?: number;
  weight_kg?: number;
  airflow?: string;
  equipment_status?: string;
  // PoE fields
  poe_budget_watts?: number;
  poe_power_per_port?: Record<string, number>;
}

interface CreateEquipmentParams {
  equipment: EquipmentData;
  portGroups: PortGroup[];
  reserveIP?: boolean;
  ipRecordId?: string;
}

export const useEquipment = (rackId?: string) => {
  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', rackId],
    queryFn: async () => {
      let query = supabase
        .from('equipment')
        .select(`
          *,
          rack:racks(
            name,
            room:rooms(
              name,
              floor:floors(
                name,
                building:buildings(name)
              )
            )
          ),
          ports(count)
        `)
        .order('name');
      
      if (rackId) {
        query = query.eq('rack_id', rackId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateEquipmentParams) => {
      // 1. Validar disponibilidade do IP se informado
      if (values.equipment.ip_address) {
        const { data: existingIP } = await supabase
          .from('ip_addresses')
          .select('id, status, equipment_id')
          .eq('ip_address', values.equipment.ip_address)
          .maybeSingle();

        if (existingIP && existingIP.status !== 'available') {
          throw new Error(`IP ${values.equipment.ip_address} não está disponível (status: ${existingIP.status})`);
        }
      }
      
      // 2. Validar posição no rack
      const { data: existingEquipment } = await supabase
        .from('equipment')
        .select('position_u_start, position_u_end')
        .eq('rack_id', values.equipment.rack_id);
      
      const hasOverlap = existingEquipment?.some(eq => {
        return (
          (values.equipment.position_u_start >= eq.position_u_start && 
           values.equipment.position_u_start <= eq.position_u_end) ||
          (values.equipment.position_u_end >= eq.position_u_start && 
           values.equipment.position_u_end <= eq.position_u_end) ||
          (values.equipment.position_u_start <= eq.position_u_start && 
           values.equipment.position_u_end >= eq.position_u_end)
        );
      });
      
      if (hasOverlap) {
        throw new Error('Posição já ocupada por outro equipamento');
      }
      
      // 3. Inserir equipamento
      const { data: newEquipment, error: eqError } = await supabase
        .from('equipment')
        .insert([values.equipment])
        .select()
        .single();
      
      if (eqError) throw eqError;
      
      // 4. Gerar e inserir portas
      const portsToInsert = generatePorts(values.portGroups, newEquipment.id);
      
      if (portsToInsert.length > 0) {
        const { error: portsError } = await supabase
          .from('ports')
          .insert(portsToInsert);
        
        if (portsError) throw portsError;
      }
      
      // 5. Reservar IP no IPAM se solicitado
      if (values.reserveIP && values.ipRecordId && values.equipment.ip_address) {
        await supabase
          .from('ip_addresses')
          .update({
            equipment_id: newEquipment.id,
            status: 'used',
            name: values.equipment.name
          })
          .eq('id', values.ipRecordId);
      }
      
      return newEquipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      queryClient.invalidateQueries({ queryKey: ['ip-addresses'] });
      toast.success(`Equipamento ${data.name} criado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: Partial<EquipmentData> & { id: string }) => {
      const { data, error } = await supabase
        .from('equipment')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      toast.success('Equipamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('ports')
        .select('*', { count: 'exact', head: true })
        .eq('equipment_id', id)
        .eq('status', 'in_use');
      
      if (count && count > 0) {
        throw new Error(`Não é possível excluir. Existem ${count} portas em uso.`);
      }

      // Liberar IPs vinculados ao equipamento antes de excluir
      await supabase
        .from('ip_addresses')
        .update({ 
          status: 'available', 
          equipment_id: null,
          name: null 
        })
        .eq('equipment_id', id);

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      queryClient.invalidateQueries({ queryKey: ['ip-addresses'] });
      toast.success('Equipamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    equipment,
    isLoading,
    createEquipment: createMutation.mutate,
    updateEquipment: updateMutation.mutate,
    deleteEquipment: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

function generatePorts(groups: PortGroup[], equipmentId: string) {
  const ports: any[] = [];
  
  groups.forEach(group => {
    for (let i = 0; i < group.quantity; i++) {
      const portNum = group.startNumber + i;
      ports.push({
        equipment_id: equipmentId,
        name: `${group.prefix}${portNum}`,
        port_number: portNum,
        port_type: group.type as PortType,
        speed: group.speed,
        status: 'available'
      });
    }
  });
  
  return ports;
}
