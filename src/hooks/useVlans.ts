import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vlan {
  id: string;
  vlan_id: number;
  name: string;
  description: string | null;
  category: string;
  color: string | null;
  building_id: string | null;
  building_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  subnet_count?: number;
  connection_count?: number;
}

export interface CreateVlanData {
  vlan_id: number;
  name: string;
  description?: string;
  category?: string;
  color?: string;
  building_id?: string;
  is_active?: boolean;
}

export interface UpdateVlanData {
  name?: string;
  description?: string;
  category?: string;
  color?: string;
  building_id?: string | null;
  is_active?: boolean;
}

// VLAN Categories with metadata
export const VLAN_CATEGORIES = [
  { value: 'data', label: 'Dados', icon: 'Monitor', color: '#3b82f6' },
  { value: 'voice', label: 'Voz', icon: 'Phone', color: '#22c55e' },
  { value: 'management', label: 'Gerenciamento', icon: 'Settings', color: '#a855f7' },
  { value: 'guest', label: 'Visitantes', icon: 'Users', color: '#eab308' },
  { value: 'native', label: 'Nativa', icon: 'Link', color: '#6b7280' },
  { value: 'iot', label: 'IoT', icon: 'Cpu', color: '#f97316' },
  { value: 'cameras', label: 'Câmeras', icon: 'Camera', color: '#ec4899' },
  { value: 'cftv', label: 'CFTV', icon: 'Video', color: '#14b8a6' },
] as const;

// Reserved VLAN IDs with warnings
export const RESERVED_VLAN_IDS = [
  { id: 1, reason: 'VLAN padrão (default) - Não recomendado usar' },
  { id: 1002, reason: 'Reservado para FDDI (legado)' },
  { id: 1003, reason: 'Reservado para Token Ring (legado)' },
  { id: 1004, reason: 'Reservado para FDDINET (legado)' },
  { id: 1005, reason: 'Reservado para TRNET (legado)' },
];

export function useVlans() {
  const queryClient = useQueryClient();

  const { data: vlans = [], isLoading, error } = useQuery({
    queryKey: ['vlans'],
    queryFn: async () => {
      // Fetch VLANs with building names
      const { data: vlansData, error: vlansError } = await supabase
        .from('vlans')
        .select(`
          *,
          buildings:building_id (name)
        `)
        .order('vlan_id', { ascending: true });

      if (vlansError) throw vlansError;

      // Fetch subnet counts per VLAN
      const { data: subnetCounts } = await supabase
        .from('subnets')
        .select('vlan_uuid')
        .not('vlan_uuid', 'is', null);

      // Fetch connection counts per VLAN
      const { data: connectionCounts } = await supabase
        .from('connections')
        .select('vlan_uuid')
        .not('vlan_uuid', 'is', null);

      // Count subnets and connections per VLAN
      const subnetCountMap = new Map<string, number>();
      const connectionCountMap = new Map<string, number>();

      subnetCounts?.forEach((s) => {
        if (s.vlan_uuid) {
          subnetCountMap.set(s.vlan_uuid, (subnetCountMap.get(s.vlan_uuid) || 0) + 1);
        }
      });

      connectionCounts?.forEach((c) => {
        if (c.vlan_uuid) {
          connectionCountMap.set(c.vlan_uuid, (connectionCountMap.get(c.vlan_uuid) || 0) + 1);
        }
      });

      return vlansData.map((vlan): Vlan => ({
        ...vlan,
        building_name: vlan.buildings?.name || null,
        subnet_count: subnetCountMap.get(vlan.id) || 0,
        connection_count: connectionCountMap.get(vlan.id) || 0,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateVlanData) => {
      const { data: result, error } = await supabase
        .from('vlans')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      toast.success('VLAN criada com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        toast.error('Este ID de VLAN já está em uso');
      } else {
        toast.error(`Erro ao criar VLAN: ${error.message}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVlanData }) => {
      const { data: result, error } = await supabase
        .from('vlans')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      toast.success('VLAN atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar VLAN: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vlans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      toast.success('VLAN excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir VLAN: ${error.message}`);
    },
  });

  const checkVlanIdAvailable = async (vlanId: number): Promise<boolean> => {
    const { data, error } = await supabase
      .from('vlans')
      .select('id')
      .eq('vlan_id', vlanId)
      .maybeSingle();

    if (error) {
      console.error('Error checking VLAN ID:', error);
      return false;
    }

    return data === null;
  };

  const getReservedWarning = (vlanId: number): string | null => {
    const reserved = RESERVED_VLAN_IDS.find((r) => r.id === vlanId);
    return reserved ? reserved.reason : null;
  };

  return {
    vlans,
    isLoading,
    error,
    createVlan: createMutation.mutateAsync,
    updateVlan: updateMutation.mutateAsync,
    deleteVlan: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    checkVlanIdAvailable,
    getReservedWarning,
  };
}

export function useVlan(id: string | undefined) {
  return useQuery({
    queryKey: ['vlan', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('vlans')
        .select(`
          *,
          buildings:building_id (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        building_name: data.buildings?.name || null,
      } as Vlan;
    },
    enabled: !!id,
  });
}
