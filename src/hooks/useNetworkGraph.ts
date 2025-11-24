import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  group: string;
  building?: string;
  room?: string;
  rack?: string;
  val?: number;
}

interface GraphLink {
  source: string;
  target: string;
  cableType: string;
  status: string;
  connectionCode: string;
}

export interface NetworkGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function useNetworkGraph(buildingFilter?: string) {
  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ['network-equipment', buildingFilter],
    queryFn: async () => {
      let query = supabase
        .from('equipment')
        .select(`
          id,
          name,
          type,
          racks!inner(
            id,
            name,
            rooms!inner(
              id,
              name,
              floors!inner(
                id,
                name,
                buildings!inner(
                  id,
                  name
                )
              )
            )
          )
        `);

      if (buildingFilter) {
        query = query.eq('racks.rooms.floors.buildings.id', buildingFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['network-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          connection_code,
          cable_type,
          status,
          port_a_id,
          port_b_id,
          ports!connections_port_a_id_fkey(
            id,
            equipment_id
          )
        `)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });

  const graphData = useMemo<NetworkGraphData>(() => {
    if (!equipment || !connections) {
      return { nodes: [], links: [] };
    }

    // Create nodes from equipment
    const nodes: GraphNode[] = equipment.map((eq: any) => ({
      id: eq.id,
      name: eq.name,
      type: eq.type,
      group: eq.type,
      building: eq.racks?.rooms?.floors?.buildings?.name || 'Unknown',
      room: eq.racks?.rooms?.name || 'Unknown',
      rack: eq.racks?.name || 'Unknown',
      val: 10
    }));

    // Create links from connections
    const links: GraphLink[] = connections
      .map((conn: any) => {
        // Get equipment IDs from ports
        const portA = conn.ports;
        
        if (!portA || !portA.equipment_id) return null;

        // Find port B
        const portBQuery = connections.find((c: any) => 
          c.port_b_id === conn.port_a_id || c.port_a_id === conn.port_b_id
        );

        if (!portBQuery) return null;

        return {
          source: portA.equipment_id,
          target: portBQuery.ports?.equipment_id || '',
          cableType: conn.cable_type,
          status: conn.status,
          connectionCode: conn.connection_code
        };
      })
      .filter((link): link is GraphLink => 
        link !== null && 
        link.source !== '' && 
        link.target !== '' &&
        link.source !== link.target
      );

    return { nodes, links };
  }, [equipment, connections]);

  return {
    graphData,
    isLoading: equipmentLoading || connectionsLoading
  };
}
