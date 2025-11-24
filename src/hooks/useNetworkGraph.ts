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

export function useNetworkGraph(buildingFilter?: string, typeFilter?: Set<string>) {
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

    // Filter equipment by type if typeFilter is provided
    let filteredEquipment = equipment;
    if (typeFilter && typeFilter.size > 0) {
      filteredEquipment = equipment.filter((eq: any) => typeFilter.has(eq.type));
    }

    // Create nodes from filtered equipment
    const nodes: GraphNode[] = filteredEquipment.map((eq: any) => ({
      id: eq.id,
      name: eq.name,
      type: eq.type,
      group: eq.type,
      building: eq.racks?.rooms?.floors?.buildings?.name || 'Unknown',
      room: eq.racks?.rooms?.name || 'Unknown',
      rack: eq.racks?.name || 'Unknown',
      val: 10
    }));
    
    // Get IDs of filtered equipment
    const filteredEquipmentIds = new Set(filteredEquipment.map((eq: any) => eq.id));

    // Create links from connections, only including those connected to filtered equipment
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

        const sourceId = portA.equipment_id;
        const targetId = portBQuery.ports?.equipment_id || '';
        
        // Only include link if both endpoints are in filtered equipment
        if (!filteredEquipmentIds.has(sourceId) || !filteredEquipmentIds.has(targetId)) {
          return null;
        }

        return {
          source: sourceId,
          target: targetId,
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
  }, [equipment, connections, typeFilter]);

  return {
    graphData,
    isLoading: equipmentLoading || connectionsLoading
  };
}
