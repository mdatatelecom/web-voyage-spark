import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AlertType = 
  | 'rack_capacity' 
  | 'port_capacity' 
  | 'equipment_failure' 
  | 'poe_capacity'
  | 'nvr_full'
  | 'camera_unassigned'
  | 'connection_faulty'
  | 'connection_stale_testing'
  | 'equipment_no_ip'
  | 'zabbix_alert';

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export const useAlerts = (filters?: {
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
}) => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type as any);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity as any);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: activeCount } = useQuery({
    queryKey: ['alerts-active-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (error) throw error;
      return count || 0;
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-active-count'] });
      toast.success('Alerta marcado como lido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar alerta: ${error.message}`);
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-active-count'] });
      toast.success('Alerta resolvido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resolver alerta: ${error.message}`);
    },
  });

  return {
    alerts,
    isLoading,
    activeCount,
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    resolveAlert: resolveAlertMutation.mutate,
  };
};

export const useAlertsByEntity = (entityId?: string, entityType?: string) => {
  return useQuery({
    queryKey: ['alerts-by-entity', entityId, entityType],
    queryFn: async () => {
      if (!entityId || !entityType) return [];

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('related_entity_id', entityId)
        .eq('related_entity_type', entityType)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityId && !!entityType,
  });
};
