import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMinutes } from 'date-fns';

interface UptimeRecord {
  id: string;
  is_online: boolean;
  collected_at: string;
  response_time_ms: number | null;
}

interface DowntimeIncident {
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
}

interface DeviceSLAData {
  deviceId: string;
  deviceName: string;
  uptimePercentage: number;
  totalChecks: number;
  onlineChecks: number;
  avgResponseTime: number | null;
  downtimeIncidents: DowntimeIncident[];
  mttr: number | null; // Mean Time To Recovery (minutos)
  mtbf: number | null; // Mean Time Between Failures (minutos)
  monthlyData: {
    month: string;
    uptimePercentage: number;
    totalMinutesDown: number;
  }[];
}

export function useDeviceSLA(deviceUuid?: string, months = 3) {
  return useQuery({
    queryKey: ['device-sla', deviceUuid, months],
    queryFn: async (): Promise<DeviceSLAData | null> => {
      if (!deviceUuid) return null;

      const startDate = subMonths(new Date(), months);
      
      // Buscar device info
      const { data: device } = await supabase
        .from('monitored_devices')
        .select('id, device_id, hostname')
        .eq('id', deviceUuid)
        .single();

      if (!device) return null;

      // Buscar histórico de uptime
      const { data: history, error } = await supabase
        .from('device_uptime_history')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) {
        console.error('Error fetching uptime history:', error);
        return null;
      }

      const records = (history || []) as UptimeRecord[];
      
      // Calcular SLA geral
      const totalChecks = records.length;
      const onlineChecks = records.filter(r => r.is_online).length;
      const uptimePercentage = totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 100;

      // Calcular tempo de resposta médio
      const responseTimes = records.filter(r => r.response_time_ms !== null).map(r => r.response_time_ms!);
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      // Identificar incidentes de downtime
      const downtimeIncidents: DowntimeIncident[] = [];
      let currentIncident: { startTime: Date } | null = null;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const recordDate = new Date(record.collected_at);
        
        if (!record.is_online && !currentIncident) {
          currentIncident = { startTime: recordDate };
        } else if (record.is_online && currentIncident) {
          const endTime = recordDate;
          downtimeIncidents.push({
            startTime: currentIncident.startTime,
            endTime,
            durationMinutes: differenceInMinutes(endTime, currentIncident.startTime)
          });
          currentIncident = null;
        }
      }

      // Se ainda há um incidente em andamento
      if (currentIncident) {
        downtimeIncidents.push({
          startTime: currentIncident.startTime,
          endTime: null,
          durationMinutes: differenceInMinutes(new Date(), currentIncident.startTime)
        });
      }

      // Calcular MTTR (Mean Time To Recovery)
      // Tempo médio que leva para recuperar de uma falha
      const completedIncidents = downtimeIncidents.filter(i => i.endTime !== null);
      const mttr = completedIncidents.length > 0
        ? completedIncidents.reduce((sum, i) => sum + i.durationMinutes, 0) / completedIncidents.length
        : null;

      // Calcular MTBF (Mean Time Between Failures)
      // Tempo médio entre o início de duas falhas consecutivas
      let mtbf: number | null = null;
      if (downtimeIncidents.length > 1) {
        let totalTimeBetweenFailures = 0;
        for (let i = 1; i < downtimeIncidents.length; i++) {
          const timeBetween = differenceInMinutes(
            downtimeIncidents[i].startTime,
            downtimeIncidents[i - 1].startTime
          );
          totalTimeBetweenFailures += timeBetween;
        }
        mtbf = totalTimeBetweenFailures / (downtimeIncidents.length - 1);
      }

      // Calcular dados mensais
      const monthlyData: DeviceSLAData['monthlyData'] = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const monthRecords = records.filter(r => {
          const date = new Date(r.collected_at);
          return date >= monthStart && date <= monthEnd;
        });

        const monthOnline = monthRecords.filter(r => r.is_online).length;
        const monthTotal = monthRecords.length;
        const monthUptime = monthTotal > 0 ? (monthOnline / monthTotal) * 100 : 100;

        // Calcular minutos down no mês
        const monthIncidents = downtimeIncidents.filter(inc => {
          return inc.startTime >= monthStart && inc.startTime <= monthEnd;
        });
        const totalMinutesDown = monthIncidents.reduce((sum, inc) => sum + inc.durationMinutes, 0);

        monthlyData.push({
          month: format(monthStart, 'MMM yyyy'),
          uptimePercentage: Math.round(monthUptime * 100) / 100,
          totalMinutesDown
        });
      }

      return {
        deviceId: device.device_id,
        deviceName: device.hostname || device.device_id,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        totalChecks,
        onlineChecks,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
        downtimeIncidents,
        mttr: mttr ? Math.round(mttr) : null,
        mtbf: mtbf ? Math.round(mtbf) : null,
        monthlyData
      };
    },
    enabled: !!deviceUuid,
    staleTime: 60000
  });
}

export function useAllDevicesSLA(months = 1) {
  return useQuery({
    queryKey: ['all-devices-sla', months],
    queryFn: async () => {
      const startDate = subMonths(new Date(), months);

      // Buscar todos os dispositivos
      const { data: devices } = await supabase
        .from('monitored_devices')
        .select('id, device_id, hostname')
        .eq('is_active', true);

      if (!devices || devices.length === 0) return [];

      // Buscar todo o histórico
      const { data: allHistory } = await supabase
        .from('device_uptime_history')
        .select('*')
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      const history = (allHistory || []) as (UptimeRecord & { device_uuid: string })[];

      // Calcular SLA por dispositivo
      return devices.map(device => {
        const deviceHistory = history.filter(h => h.device_uuid === device.id);
        const total = deviceHistory.length;
        const online = deviceHistory.filter(h => h.is_online).length;
        const uptime = total > 0 ? (online / total) * 100 : 100;

        return {
          id: device.id,
          deviceId: device.device_id,
          deviceName: device.hostname || device.device_id,
          uptimePercentage: Math.round(uptime * 100) / 100,
          totalChecks: total,
          onlineChecks: online
        };
      }).sort((a, b) => a.uptimePercentage - b.uptimePercentage);
    },
    staleTime: 60000
  });
}
