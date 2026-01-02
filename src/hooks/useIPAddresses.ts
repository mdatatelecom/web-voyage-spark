import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IPAddress {
  id: string;
  subnet_id: string;
  ip_address: string;
  name: string | null;
  ip_type: 'network' | 'gateway' | 'host' | 'broadcast' | 'reserved';
  status: 'available' | 'reserved' | 'used';
  equipment_id: string | null;
  notes: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  equipment?: { id: string; name: string; type: string } | null;
  subnet?: { name: string; cidr: string } | null;
}

export interface CreateIPAddressData {
  subnet_id: string;
  ip_address: string;
  name?: string;
  ip_type?: 'network' | 'gateway' | 'host' | 'broadcast' | 'reserved';
  status?: 'available' | 'reserved' | 'used';
  equipment_id?: string;
  notes?: string;
}

export interface UpdateIPAddressData {
  id: string;
  name?: string | null;
  ip_type?: 'network' | 'gateway' | 'host' | 'broadcast' | 'reserved';
  status?: 'available' | 'reserved' | 'used';
  equipment_id?: string | null;
  notes?: string | null;
}

export interface IPAddressFilters {
  status?: 'available' | 'reserved' | 'used' | 'all';
  ip_type?: string;
  search?: string;
}

export function useIPAddresses(subnetId: string | undefined, filters?: IPAddressFilters) {
  const queryClient = useQueryClient();

  // Fetch IP addresses for a subnet
  const { data: ipAddresses = [], isLoading } = useQuery({
    queryKey: ['ip-addresses', subnetId, filters],
    queryFn: async () => {
      if (!subnetId) return [];

      let query = supabase
        .from('ip_addresses')
        .select(`
          *,
          equipment:equipment(id, name, type)
        `)
        .eq('subnet_id', subnetId)
        .order('ip_address');

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.ip_type) {
        query = query.eq('ip_type', filters.ip_type);
      }

      if (filters?.search) {
        query = query.or(`ip_address.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as IPAddress[];
    },
    enabled: !!subnetId
  });

  // Create single IP address
  const createMutation = useMutation({
    mutationFn: async (data: CreateIPAddressData) => {
      const { data: result, error } = await supabase
        .from('ip_addresses')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('IP adicionado com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast.error('Este IP já existe nesta sub-rede');
      } else {
        toast.error(`Erro ao adicionar IP: ${error.message}`);
      }
    }
  });

  // Create multiple IP addresses (batch)
  const createBatchMutation = useMutation({
    mutationFn: async (records: CreateIPAddressData[]) => {
      // Insert in batches of 500 to avoid timeout
      const batchSize = 500;
      const results: unknown[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('ip_addresses')
          .insert(batch)
          .select();

        if (error) throw error;
        results.push(...(data || []));
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success(`${data.length} IPs gerados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar IPs: ${error.message}`);
    }
  });

  // Update IP address
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateIPAddressData) => {
      const { data: result, error } = await supabase
        .from('ip_addresses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('IP atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar IP: ${error.message}`);
    }
  });

  // Delete IP address
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ip_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      toast.success('IP removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover IP: ${error.message}`);
    }
  });

  // Reserve IP for equipment
  const reserveForEquipment = useMutation({
    mutationFn: async ({ ipId, equipmentId, name }: { ipId: string; equipmentId: string; name?: string }) => {
      const { data: result, error } = await supabase
        .from('ip_addresses')
        .update({
          equipment_id: equipmentId,
          status: 'used',
          name: name || undefined
        })
        .eq('id', ipId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('IP vinculado ao equipamento!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao vincular IP: ${error.message}`);
    }
  });

  // Release IP from equipment
  const releaseFromEquipment = useMutation({
    mutationFn: async (ipId: string) => {
      const { data: result, error } = await supabase
        .from('ip_addresses')
        .update({
          equipment_id: null,
          status: 'available'
        })
        .eq('id', ipId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-addresses', subnetId] });
      queryClient.invalidateQueries({ queryKey: ['subnets'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('IP liberado do equipamento!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao liberar IP: ${error.message}`);
    }
  });

  return {
    ipAddresses,
    isLoading,
    createIP: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createBatch: createBatchMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    updateIP: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteIP: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    reserveForEquipment: reserveForEquipment.mutateAsync,
    releaseFromEquipment: releaseFromEquipment.mutateAsync
  };
}

// Global IP search hook
export function useIPSearch(search: string) {
  return useQuery({
    queryKey: ['ip-search', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const { data, error } = await supabase
        .from('ip_addresses')
        .select(`
          *,
          equipment:equipment(id, name, type),
          subnet:subnets(id, name, cidr)
        `)
        .or(`ip_address.ilike.%${search}%,name.ilike.%${search}%`)
        .limit(50);

      if (error) throw error;
      return (data || []) as IPAddress[];
    },
    enabled: search.length >= 2
  });
}

// Get available IPs for selection
export function useAvailableIPs(subnetId?: string) {
  return useQuery({
    queryKey: ['available-ips', subnetId],
    queryFn: async () => {
      let query = supabase
        .from('ip_addresses')
        .select(`
          id,
          ip_address,
          name,
          ip_type,
          status,
          subnet:subnets(id, name, cidr)
        `)
        .eq('status', 'available')
        .neq('ip_type', 'network')
        .neq('ip_type', 'broadcast')
        .order('ip_address')
        .limit(200);

      if (subnetId) {
        query = query.eq('subnet_id', subnetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true
  });
}

// Get available IPs filtered by VLAN
export function useAvailableIPsByVlan(vlanUuid?: string) {
  return useQuery({
    queryKey: ['available-ips-by-vlan', vlanUuid],
    queryFn: async () => {
      if (!vlanUuid) {
        // If no VLAN selected, return all available IPs
        const { data, error } = await supabase
          .from('ip_addresses')
          .select(`
            id,
            ip_address,
            name,
            ip_type,
            status,
            subnet:subnets(id, name, cidr, vlan_uuid)
          `)
          .eq('status', 'available')
          .neq('ip_type', 'network')
          .neq('ip_type', 'broadcast')
          .order('ip_address')
          .limit(200);

        if (error) throw error;
        return data || [];
      }

      // First, get all subnets that belong to this VLAN
      const { data: subnets, error: subnetsError } = await supabase
        .from('subnets')
        .select('id')
        .eq('vlan_uuid', vlanUuid);

      if (subnetsError) throw subnetsError;
      
      if (!subnets || subnets.length === 0) {
        return [];
      }

      const subnetIds = subnets.map(s => s.id);

      // Then get available IPs from those subnets
      const { data, error } = await supabase
        .from('ip_addresses')
        .select(`
          id,
          ip_address,
          name,
          ip_type,
          status,
          subnet:subnets(id, name, cidr, vlan_uuid)
        `)
        .in('subnet_id', subnetIds)
        .eq('status', 'available')
        .neq('ip_type', 'network')
        .neq('ip_type', 'broadcast')
        .order('ip_address')
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: true
  });
}
