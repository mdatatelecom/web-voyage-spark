import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface Subnet {
  id: string;
  name: string;
  description: string | null;
  ip_version: 'ipv4' | 'ipv6';
  cidr: string;
  network_address: string;
  prefix_length: number;
  gateway_ip: string | null;
  gateway_name: string | null;
  broadcast_address: string | null;
  total_addresses: number;
  usable_addresses: number;
  vlan_id: number | null;
  vlan_uuid: string | null;
  building_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed fields
  used_count?: number;
  reserved_count?: number;
  available_count?: number;
  building?: { name: string } | null;
}

export interface CreateSubnetData {
  name: string;
  description?: string;
  ip_version: 'ipv4' | 'ipv6';
  cidr: string;
  network_address: string;
  prefix_length: number;
  gateway_ip?: string;
  gateway_name?: string;
  broadcast_address?: string;
  total_addresses: number;
  usable_addresses: number;
  vlan_id?: number;
  vlan_uuid?: string;
  building_id?: string;
}

export interface UpdateSubnetData {
  id: string;
  name?: string;
  description?: string;
  gateway_ip?: string;
  gateway_name?: string;
  vlan_id?: number | null;
  vlan_uuid?: string | null;
  building_id?: string | null;
  is_active?: boolean;
}

export function useSubnets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all subnets with usage stats
  const { data: subnets = [], isLoading } = useQuery({
    queryKey: ['subnets'],
    queryFn: async () => {
      const { data: subnetsData, error: subnetsError } = await supabase
        .from('subnets')
        .select(`
          *,
          building:buildings(name)
        `)
        .order('name');

      if (subnetsError) throw subnetsError;

      // Get IP address counts per subnet
      const { data: ipCounts, error: ipError } = await supabase
        .from('ip_addresses')
        .select('subnet_id, status');

      if (ipError) throw ipError;

      // Calculate counts per subnet
      const countsBySubnet = (ipCounts || []).reduce((acc, ip) => {
        if (!acc[ip.subnet_id]) {
          acc[ip.subnet_id] = { used: 0, reserved: 0, available: 0 };
        }
        if (ip.status === 'used') acc[ip.subnet_id].used++;
        else if (ip.status === 'reserved') acc[ip.subnet_id].reserved++;
        else acc[ip.subnet_id].available++;
        return acc;
      }, {} as Record<string, { used: number; reserved: number; available: number }>);

      return (subnetsData || []).map(subnet => ({
        ...subnet,
        ip_version: subnet.ip_version as 'ipv4' | 'ipv6',
        used_count: countsBySubnet[subnet.id]?.used || 0,
        reserved_count: countsBySubnet[subnet.id]?.reserved || 0,
        available_count: countsBySubnet[subnet.id]?.available || 0
      })) as Subnet[];
    }
  });

  // Create subnet mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateSubnetData) => {
      const { data: result, error } = await supabase
        .from('subnets')
        .insert({
          ...data,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('Sub-rede criada com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast.error('Já existe uma sub-rede com este CIDR');
      } else {
        toast.error(`Erro ao criar sub-rede: ${error.message}`);
      }
    }
  });

  // Update subnet mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateSubnetData) => {
      const { data: result, error } = await supabase
        .from('subnets')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('Sub-rede atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar sub-rede: ${error.message}`);
    }
  });

  // Delete subnet mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subnets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('Sub-rede excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir sub-rede: ${error.message}`);
    }
  });

  // Check for CIDR overlap
  const checkCIDROverlap = async (cidr: string, excludeId?: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('subnets')
      .select('id, cidr, name');

    if (error) return null;

    // Import dynamically to avoid circular deps
    const { checkOverlap } = await import('@/lib/cidr-utils');
    
    for (const subnet of data || []) {
      if (excludeId && subnet.id === excludeId) continue;
      if (checkOverlap(cidr, subnet.cidr)) {
        return `Conflito com sub-rede existente: ${subnet.name} (${subnet.cidr})`;
      }
    }

    return null;
  };

  return {
    subnets,
    isLoading,
    createSubnet: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSubnet: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSubnet: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    checkCIDROverlap
  };
}

export function useSubnet(id: string | undefined) {
  return useQuery({
    queryKey: ['subnet', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('subnets')
        .select(`
          *,
          building:buildings(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Subnet;
    },
    enabled: !!id
  });
}
