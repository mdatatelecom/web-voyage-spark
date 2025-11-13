import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSystemStats = () => {
  const queryClient = useQueryClient();

  // System health check
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('count').limit(1);
        const responseTime = Date.now() - start;

        return {
          database: error ? 'error' : 'ok',
          responseTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          database: 'error',
          responseTime: 0,
          timestamp: new Date().toISOString(),
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Alert statistics
  const { data: alertStats } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: async () => {
      const { data: alerts } = await supabase
        .from('alerts')
        .select('severity, status, created_at');

      const total = alerts?.length || 0;
      const active = alerts?.filter(a => a.status === 'active').length || 0;
      const bySeverity = {
        info: alerts?.filter(a => a.severity === 'info').length || 0,
        warning: alerts?.filter(a => a.severity === 'warning').length || 0,
        critical: alerts?.filter(a => a.severity === 'critical').length || 0,
      };

      // Alerts created in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentAlerts = alerts?.filter(a => 
        new Date(a.created_at) > sevenDaysAgo
      ) || [];

      return {
        total,
        active,
        bySeverity,
        recentCount: recentAlerts.length,
      };
    },
    refetchInterval: 10000,
  });

  // Usage statistics
  const { data: usageStats } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: connectionCount },
        { count: equipmentCount },
        { count: rackCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('connections').select('*', { count: 'exact', head: true }),
        supabase.from('equipment').select('*', { count: 'exact', head: true }),
        supabase.from('racks').select('*', { count: 'exact', head: true }),
      ]);

      return {
        users: userCount || 0,
        connections: connectionCount || 0,
        equipment: equipmentCount || 0,
        racks: rackCount || 0,
      };
    },
  });

  // Access logs
  const { data: accessLogs } = useQuery({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('access_logs')
        .select('*, user:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      return data || [];
    },
  });

  // Manual capacity check
  const { mutate: runCapacityCheck, isPending: isRunningCheck } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-capacity-alerts');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Verificação concluída com sucesso', {
        description: `${data?.alertsCreated || 0} alertas criados`,
      });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao executar verificação', {
        description: error.message,
      });
    },
  });

  // Create test alert
  const { mutate: createTestAlert } = useMutation({
    mutationFn: async (severity: 'info' | 'warning' | 'critical') => {
      const { error } = await supabase.from('alerts').insert({
        type: 'rack_capacity',
        severity,
        title: `Alerta de Teste (${severity.toUpperCase()})`,
        message: 'Este é um alerta de teste criado manualmente',
        status: 'active',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alerta de teste criado');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar alerta de teste', {
        description: error.message,
      });
    },
  });

  // Send test email
  const { mutate: sendTestEmail, isPending: isSendingEmail } = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          email,
          alert: {
            title: 'Teste de Notificação por Email',
            message: 'Este é um email de teste do sistema de alertas',
            severity: 'info',
            type: 'test',
          },
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Email de teste enviado');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar email', {
        description: error.message,
      });
    },
  });

  // Clean old data
  const { mutate: cleanOldData } = useMutation({
    mutationFn: async ({ type, days }: { type: 'logs' | 'alerts'; days: number }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      if (type === 'logs') {
        const { error } = await supabase
          .from('access_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString());
        
        if (error) throw error;
      } else if (type === 'alerts') {
        const { error } = await supabase
          .from('alerts')
          .delete()
          .eq('status', 'resolved')
          .lt('resolved_at', cutoffDate.toISOString());
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.type === 'logs' ? 'Logs' : 'Alertas'} antigos removidos`);
      if (variables.type === 'logs') {
        queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao limpar dados', {
        description: error.message,
      });
    },
  });

  return {
    systemHealth,
    alertStats,
    usageStats,
    accessLogs,
    runCapacityCheck,
    isRunningCheck,
    createTestAlert,
    sendTestEmail,
    isSendingEmail,
    cleanOldData,
  };
};
