import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfDay, differenceInHours } from 'date-fns';

interface AlertStat {
  date: string;
  count: number;
  critical: number;
  warning: number;
  info: number;
}

interface AlertTypeCount {
  type: string;
  count: number;
  label: string;
}

interface AlertSeverityCount {
  severity: string;
  count: number;
  color: string;
}

interface AlertResolutionTime {
  type: string;
  avgHours: number;
  label: string;
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  critical: number;
  warning: number;
  info: number;
  avgResolutionHours: number;
  dailyTrend: AlertStat[];
  byType: AlertTypeCount[];
  bySeverity: AlertSeverityCount[];
  resolutionTimeByType: AlertResolutionTime[];
}

const TYPE_LABELS: Record<string, string> = {
  rack_capacity: 'Capacidade Rack',
  port_capacity: 'Capacidade Portas',
  equipment_failure: 'Falha Equip.',
  poe_capacity: 'Capacidade PoE',
  nvr_full: 'NVR Cheio',
  camera_unassigned: 'Câmera Desassoc.',
  connection_faulty: 'Conexão Defeituosa',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'hsl(0, 84%, 60%)',
  warning: 'hsl(45, 93%, 47%)',
  info: 'hsl(217, 91%, 60%)',
};

export const useAlertStats = (days: number = 30) => {
  return useQuery({
    queryKey: ['alert-stats', days],
    queryFn: async (): Promise<AlertStats> => {
      const startDate = subDays(new Date(), days);
      
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const alertsList = alerts || [];
      
      // Calculate daily trend
      const dailyMap = new Map<string, AlertStat>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(date, { date, count: 0, critical: 0, warning: 0, info: 0 });
      }
      
      alertsList.forEach((alert) => {
        const date = format(new Date(alert.created_at!), 'yyyy-MM-dd');
        const stat = dailyMap.get(date);
        if (stat) {
          stat.count++;
          if (alert.severity === 'critical') stat.critical++;
          else if (alert.severity === 'warning') stat.warning++;
          else stat.info++;
        }
      });
      
      const dailyTrend = Array.from(dailyMap.values()).reverse();
      
      // Count by type
      const typeMap = new Map<string, number>();
      alertsList.forEach((alert) => {
        typeMap.set(alert.type, (typeMap.get(alert.type) || 0) + 1);
      });
      
      const byType: AlertTypeCount[] = Array.from(typeMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          label: TYPE_LABELS[type] || type,
        }))
        .sort((a, b) => b.count - a.count);
      
      // Count by severity
      const severityMap = new Map<string, number>();
      alertsList.forEach((alert) => {
        severityMap.set(alert.severity, (severityMap.get(alert.severity) || 0) + 1);
      });
      
      const bySeverity: AlertSeverityCount[] = ['critical', 'warning', 'info'].map((severity) => ({
        severity,
        count: severityMap.get(severity) || 0,
        color: SEVERITY_COLORS[severity],
      }));
      
      // Calculate resolution times by type
      const resolutionByType = new Map<string, number[]>();
      alertsList.forEach((alert) => {
        if (alert.resolved_at) {
          const hours = differenceInHours(
            new Date(alert.resolved_at),
            new Date(alert.created_at!)
          );
          if (!resolutionByType.has(alert.type)) {
            resolutionByType.set(alert.type, []);
          }
          resolutionByType.get(alert.type)!.push(hours);
        }
      });
      
      const resolutionTimeByType: AlertResolutionTime[] = Array.from(resolutionByType.entries())
        .map(([type, hours]) => ({
          type,
          avgHours: hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
          label: TYPE_LABELS[type] || type,
        }))
        .sort((a, b) => b.avgHours - a.avgHours);
      
      // Calculate overall stats
      const resolvedAlerts = alertsList.filter((a) => a.resolved_at);
      const totalResolutionHours = resolvedAlerts.reduce((sum, a) => {
        return sum + differenceInHours(new Date(a.resolved_at!), new Date(a.created_at!));
      }, 0);
      
      return {
        total: alertsList.length,
        active: alertsList.filter((a) => a.status === 'active').length,
        resolved: alertsList.filter((a) => a.status === 'resolved').length,
        critical: alertsList.filter((a) => a.severity === 'critical').length,
        warning: alertsList.filter((a) => a.severity === 'warning').length,
        info: alertsList.filter((a) => a.severity === 'info').length,
        avgResolutionHours: resolvedAlerts.length > 0 ? totalResolutionHours / resolvedAlerts.length : 0,
        dailyTrend,
        byType,
        bySeverity,
        resolutionTimeByType,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
