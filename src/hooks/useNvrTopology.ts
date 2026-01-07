import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Camera {
  channel: number;
  portId?: string;
  portName?: string;
  ip?: string;
  location?: string;
  status: string;
  source: 'poe' | 'external' | 'analog';
  equipmentId?: string;
  equipmentName?: string;
}

interface UplinkConnection {
  connectionId: string;
  connectionCode: string;
  connectedEquipmentId: string;
  connectedEquipmentName: string;
  connectedEquipmentType: string;
  portName: string;
}

interface NvrTopologyData {
  nvrId: string;
  nvrName: string;
  nvrType: string;
  totalChannels: number;
  poePorts: number;
  uplinkConnection: UplinkConnection | null;
  cameras: Camera[];
  stats: {
    totalChannels: number;
    usedChannels: number;
    poePortsTotal: number;
    poePortsUsed: number;
    externalCameras: number;
  };
}

interface ParsedNotes {
  total_channels?: number;
  poe_ports?: number;
  cameras?: Array<{
    channel: number;
    ip?: string;
    location?: string;
    status?: string;
  }>;
}

export function useNvrTopology(equipmentId: string | undefined) {
  return useQuery({
    queryKey: ['nvr-topology', equipmentId],
    queryFn: async (): Promise<NvrTopologyData | null> => {
      if (!equipmentId) return null;

      // Fetch NVR equipment with ports and connections
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          type,
          notes,
          ports(
            id,
            name,
            port_number,
            port_type,
            status,
            notes
          )
        `)
        .eq('id', equipmentId)
        .single();

      if (error || !equipment) {
        console.error('Error fetching NVR equipment:', error);
        return null;
      }

      // Parse notes
      let parsedNotes: ParsedNotes = {};
      try {
        if (equipment.notes) {
          parsedNotes = JSON.parse(equipment.notes);
        }
      } catch {
        // Ignore parse errors
      }

      const equipmentType = equipment.type as string;
      const isNvrPoe = equipmentType === 'nvr_poe';
      const totalChannels = parsedNotes.total_channels || 16;
      const poePorts = isNvrPoe ? (parsedNotes.poe_ports || 0) : 0;

      // Find uplink port (first port or port with name containing 'uplink' or 'lan')
      const ports = equipment.ports || [];
      const uplinkPort = ports.find((p: any) => 
        p.name?.toLowerCase().includes('uplink') || 
        p.name?.toLowerCase().includes('lan') ||
        p.port_number === 0
      ) || ports[0];

      // Fetch connection for uplink port
      let uplinkConnection: UplinkConnection | null = null;
      if (uplinkPort) {
        const { data: connections } = await supabase
          .from('connections')
          .select(`
            id,
            connection_code,
            port_a_id,
            port_b_id
          `)
          .or(`port_a_id.eq.${uplinkPort.id},port_b_id.eq.${uplinkPort.id}`)
          .limit(1);

        if (connections && connections.length > 0) {
          const conn = connections[0];
          const otherPortId = conn.port_a_id === uplinkPort.id ? conn.port_b_id : conn.port_a_id;

          // Fetch the connected equipment
          const { data: otherPort } = await supabase
            .from('ports')
            .select(`
              id,
              name,
              equipment:equipment_id(
                id,
                name,
                type
              )
            `)
            .eq('id', otherPortId)
            .single();

          if (otherPort?.equipment) {
            const connectedEquip = otherPort.equipment as any;
            uplinkConnection = {
              connectionId: conn.id,
              connectionCode: conn.connection_code,
              connectedEquipmentId: connectedEquip.id,
              connectedEquipmentName: connectedEquip.name,
              connectedEquipmentType: connectedEquip.type,
              portName: otherPort.name
            };
          }
        }
      }

      // Build camera list from ports (for NVR with PoE) and legacy notes
      const cameras: Camera[] = [];
      
      // For NVR with PoE, check PoE ports
      if (isNvrPoe) {
        const poePorts_list = ports.filter((p: any) => 
          p.port_type === 'rj45_poe' || 
          p.port_type === 'rj45_poe_plus' ||
          (p.port_number && p.port_number >= 1)
        ).filter((p: any) => p.id !== uplinkPort?.id);

        for (const port of poePorts_list) {
          if (port.status === 'in_use') {
            // Try to find connected camera
            const { data: connections } = await supabase
              .from('connections')
              .select(`
                id,
                port_a_id,
                port_b_id
              `)
              .or(`port_a_id.eq.${port.id},port_b_id.eq.${port.id}`)
              .limit(1);

            let cameraInfo: Partial<Camera> = {
              channel: port.port_number || cameras.length + 1,
              portId: port.id,
              portName: port.name,
              status: 'in_use',
              source: 'poe'
            };

            if (connections && connections.length > 0) {
              const conn = connections[0];
              const otherPortId = conn.port_a_id === port.id ? conn.port_b_id : conn.port_a_id;

              const { data: otherPort } = await supabase
                .from('ports')
                .select(`
                  equipment:equipment_id(
                    id,
                    name,
                    type,
                    ip_address
                  )
                `)
                .eq('id', otherPortId)
                .single();

              if (otherPort?.equipment) {
                const cam = otherPort.equipment as any;
                cameraInfo.equipmentId = cam.id;
                cameraInfo.equipmentName = cam.name;
                cameraInfo.ip = cam.ip_address;
              }
            }

            cameras.push(cameraInfo as Camera);
          }
        }
      }

      // Add cameras from legacy notes
      if (parsedNotes.cameras) {
        for (const cam of parsedNotes.cameras) {
          const existingCamera = cameras.find(c => c.channel === cam.channel);
          if (!existingCamera) {
            cameras.push({
              channel: cam.channel,
              ip: cam.ip,
              location: cam.location,
              status: cam.status || 'in_use',
              source: isNvrPoe ? 'poe' : 'external'
            });
          }
        }
      }

      // Sort cameras by channel
      cameras.sort((a, b) => a.channel - b.channel);

      // Calculate stats
      const poePortsUsed = cameras.filter(c => c.source === 'poe').length;
      const externalCameras = cameras.filter(c => c.source === 'external').length;

      return {
        nvrId: equipment.id,
        nvrName: equipment.name,
        nvrType: equipmentType,
        totalChannels,
        poePorts,
        uplinkConnection,
        cameras,
        stats: {
          totalChannels,
          usedChannels: cameras.length,
          poePortsTotal: poePorts,
          poePortsUsed,
          externalCameras
        }
      };
    },
    enabled: !!equipmentId
  });
}
