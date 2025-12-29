import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortStats {
  total: number;
  available: number;
  inUse: number;
  reserved: number;
  disabled: number;
}

export interface EquipmentPortStats {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  rackName: string;
  totalPorts: number;
  availablePorts: number;
  inUsePorts: number;
}

export interface CameraWithoutNvr {
  id: string;
  name: string;
  rackName: string;
  ipAddress: string | null;
}

export interface PoESwitch {
  id: string;
  name: string;
  rackName: string;
  poeBudget: number;
  poeUsed: number;
  poeAvailable: number;
  percentUsed: number;
  isCritical: boolean;
}

export interface NvrDvrChannel {
  id: string;
  name: string;
  type: string;
  rackName: string;
  totalChannels: number;
  usedChannels: number;
  availableChannels: number;
  isFull: boolean;
}

export interface ConnectionIssue {
  id: string;
  connectionCode: string;
  status: string;
  installedAt: string;
  daysSinceInstall: number;
  equipmentA: string;
  equipmentB: string;
}

export interface AuditStats {
  portStats: PortStats;
  equipmentPortStats: EquipmentPortStats[];
  camerasWithoutNvr: CameraWithoutNvr[];
  poeSwitches: PoESwitch[];
  nvrDvrChannels: NvrDvrChannel[];
  testingConnections: ConnectionIssue[];
  faultyConnections: ConnectionIssue[];
  equipmentWithoutIp: { id: string; name: string; type: string; rackName: string }[];
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async (): Promise<AuditStats> => {
      // 1. Buscar estatísticas de portas
      const { data: ports } = await supabase
        .from('ports')
        .select('status');
      
      const portStats: PortStats = {
        total: ports?.length || 0,
        available: ports?.filter(p => p.status === 'available').length || 0,
        inUse: ports?.filter(p => p.status === 'in_use').length || 0,
        reserved: ports?.filter(p => p.status === 'reserved').length || 0,
        disabled: ports?.filter(p => p.status === 'disabled').length || 0
      };

      // 2. Buscar equipamentos com estatísticas de portas
      const { data: equipment } = await supabase
        .from('equipment')
        .select(`
          id, name, type, ip_address, poe_budget_watts,
          rack:racks(name),
          ports(status)
        `);

      const equipmentPortStats: EquipmentPortStats[] = (equipment || [])
        .filter(e => e.ports && e.ports.length > 0)
        .map(e => ({
          equipmentId: e.id,
          equipmentName: e.name,
          equipmentType: e.type,
          rackName: (e.rack as any)?.name || 'N/A',
          totalPorts: e.ports?.length || 0,
          availablePorts: e.ports?.filter((p: any) => p.status === 'available').length || 0,
          inUsePorts: e.ports?.filter((p: any) => p.status === 'in_use').length || 0
        }));

      // 3. Buscar câmeras IP sem conexão a NVR
      const { data: ipCameras } = await supabase
        .from('equipment')
        .select(`
          id, name, ip_address,
          rack:racks(name),
          ports(
            id,
            connections_a:connections!connections_port_a_id_fkey(id),
            connections_b:connections!connections_port_b_id_fkey(id)
          )
        `)
        .eq('type', 'ip_camera');

      // Buscar conexões para verificar se câmeras estão conectadas a NVRs
      const { data: connections } = await supabase
        .from('v_connection_details')
        .select('*');

      const camerasWithoutNvr: CameraWithoutNvr[] = [];
      
      (ipCameras || []).forEach(camera => {
        // Verifica se a câmera está conectada a um NVR/DVR
        const hasNvrConnection = connections?.some(conn => {
          const isConnectedToCamera = 
            conn.equipment_a_name === camera.name || 
            conn.equipment_b_name === camera.name;
          
          if (!isConnectedToCamera) return false;
          
          const otherEquipmentType = 
            conn.equipment_a_name === camera.name 
              ? conn.equipment_b_type 
              : conn.equipment_a_type;
          
          return otherEquipmentType === 'nvr' || otherEquipmentType === 'dvr';
        });

        if (!hasNvrConnection) {
          camerasWithoutNvr.push({
            id: camera.id,
            name: camera.name,
            rackName: (camera.rack as any)?.name || 'N/A',
            ipAddress: camera.ip_address
          });
        }
      });

      // 4. Buscar switches PoE com budget
      const { data: switches } = await supabase
        .from('equipment')
        .select(`
          id, name, poe_budget_watts, poe_power_per_port,
          rack:racks(name),
          ports(
            id,
            connections_a:connections!connections_port_a_id_fkey(
              port_a_id, port_b_id
            ),
            connections_b:connections!connections_port_b_id_fkey(
              port_a_id, port_b_id
            )
          )
        `)
        .in('type', ['switch_poe', 'switch'] as const)
        .not('poe_budget_watts', 'is', null);

      const poeSwitches: PoESwitch[] = [];

      for (const sw of switches || []) {
        if (!sw.poe_budget_watts) continue;

        // Calcular consumo PoE real baseado nos dispositivos conectados
        let poeUsed = 0;
        
        // Para cada porta do switch, verificar se há dispositivo PoE conectado
        for (const port of sw.ports || []) {
          const connectionsA = port.connections_a || [];
          const connectionsB = port.connections_b || [];
          
          // Se há conexão, verificar o dispositivo na outra ponta
          for (const conn of [...connectionsA, ...connectionsB]) {
            const otherPortId = conn.port_a_id === port.id ? conn.port_b_id : conn.port_a_id;
            
            // Buscar o equipamento da outra porta
            const { data: otherPort } = await supabase
              .from('ports')
              .select('equipment:equipment(type)')
              .eq('id', otherPortId)
              .single();

            if (otherPort?.equipment) {
              const deviceType = (otherPort.equipment as any).type;
              // Consumo estimado por tipo de dispositivo
              const consumption = getEstimatedPoeConsumption(deviceType);
              poeUsed += consumption;
            }
          }
        }

        const poeAvailable = sw.poe_budget_watts - poeUsed;
        const percentUsed = (poeUsed / sw.poe_budget_watts) * 100;

        poeSwitches.push({
          id: sw.id,
          name: sw.name,
          rackName: (sw.rack as any)?.name || 'N/A',
          poeBudget: sw.poe_budget_watts,
          poeUsed: Math.round(poeUsed),
          poeAvailable: Math.round(poeAvailable),
          percentUsed: Math.round(percentUsed),
          isCritical: percentUsed >= 90
        });
      }

      // 5. Buscar NVR/DVR com informações de canais
      const { data: nvrDvrs } = await supabase
        .from('equipment')
        .select(`
          id, name, type, notes,
          rack:racks(name)
        `)
        .in('type', ['nvr', 'dvr']);

      const nvrDvrChannels: NvrDvrChannel[] = (nvrDvrs || []).map(device => {
        let totalChannels = device.type === 'nvr' ? 16 : 8;
        let usedChannels = 0;

        try {
          if (device.notes) {
            const parsed = JSON.parse(device.notes);
            totalChannels = parsed.total_channels || totalChannels;
            usedChannels = parsed.used_channels || parsed.cameras?.length || 0;
          }
        } catch {
          // Ignora erro de parse
        }

        return {
          id: device.id,
          name: device.name,
          type: device.type,
          rackName: (device.rack as any)?.name || 'N/A',
          totalChannels,
          usedChannels,
          availableChannels: totalChannels - usedChannels,
          isFull: usedChannels >= totalChannels
        };
      });

      // 6. Buscar conexões em testing há mais de 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: testingConns } = await supabase
        .from('v_connection_details')
        .select('*')
        .eq('status', 'testing');

      const testingConnections: ConnectionIssue[] = (testingConns || [])
        .filter(c => c.installed_at && new Date(c.installed_at) < sevenDaysAgo)
        .map(c => ({
          id: c.id || '',
          connectionCode: c.connection_code || '',
          status: c.status || 'testing',
          installedAt: c.installed_at || '',
          daysSinceInstall: Math.floor((Date.now() - new Date(c.installed_at!).getTime()) / (1000 * 60 * 60 * 24)),
          equipmentA: c.equipment_a_name || 'N/A',
          equipmentB: c.equipment_b_name || 'N/A'
        }));

      // 7. Buscar conexões com status faulty
      const { data: faultyConns } = await supabase
        .from('v_connection_details')
        .select('*')
        .eq('status', 'faulty');

      const faultyConnections: ConnectionIssue[] = (faultyConns || []).map(c => ({
        id: c.id || '',
        connectionCode: c.connection_code || '',
        status: c.status || 'faulty',
        installedAt: c.installed_at || '',
        daysSinceInstall: Math.floor((Date.now() - new Date(c.installed_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
        equipmentA: c.equipment_a_name || 'N/A',
        equipmentB: c.equipment_b_name || 'N/A'
      }));

      // 8. Equipamentos sem IP
      const networkTypes = ['switch', 'switch_poe', 'router', 'firewall', 'server', 'nvr', 'ip_camera'];
      const equipmentWithoutIp = (equipment || [])
        .filter(e => networkTypes.includes(e.type) && !e.ip_address)
        .map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
          rackName: (e.rack as any)?.name || 'N/A'
        }));

      return {
        portStats,
        equipmentPortStats,
        camerasWithoutNvr,
        poeSwitches,
        nvrDvrChannels,
        testingConnections,
        faultyConnections,
        equipmentWithoutIp
      };
    },
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}

// Helper para estimar consumo PoE por tipo de dispositivo
function getEstimatedPoeConsumption(deviceType: string): number {
  const consumptionMap: Record<string, number> = {
    'ip_camera': 15,
    'access_point': 20,
    'voip_gateway': 10,
    'environment_sensor': 5,
    'poe_splitter': 25
  };
  return consumptionMap[deviceType] || 0;
}
