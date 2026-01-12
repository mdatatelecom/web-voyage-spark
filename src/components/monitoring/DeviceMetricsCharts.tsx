import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Cpu, HardDrive, Network } from 'lucide-react';
import { useGrafanaIntegration } from '@/hooks/useGrafanaIntegration';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

interface DeviceMetricsChartsProps {
  deviceId: string;
  zabbixHostId?: string | null;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 hora' },
  { value: '6h', label: '6 horas' },
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
];

function getTimeRangeSeconds(range: TimeRange): number {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case '1h':
      return now - 3600;
    case '6h':
      return now - 21600;
    case '24h':
      return now - 86400;
    case '7d':
      return now - 604800;
    default:
      return now - 86400;
  }
}

export function DeviceMetricsCharts({
  deviceId,
  zabbixHostId,
}: DeviceMetricsChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { fetchMetricHistory, isLoading: isLoadingMetrics } = useGrafanaIntegration(
    deviceId,
    zabbixHostId || undefined
  );

  const timeFrom = getTimeRangeSeconds(timeRange);
  const timeTill = Math.floor(Date.now() / 1000);

  // Fetch CPU metrics
  const {
    data: cpuData,
    isLoading: isLoadingCpu,
    refetch: refetchCpu,
  } = useQuery({
    queryKey: ['device-cpu-history', deviceId, timeRange],
    queryFn: async () => {
      if (!zabbixHostId) return [];
      const data = await fetchMetricHistory('system.cpu.util', timeFrom, timeTill);
      return data.map((point) => ({
        time: new Date(parseInt(point.clock, 10) * 1000).getTime(),
        value: parseFloat(point.value),
      }));
    },
    enabled: !!zabbixHostId,
    staleTime: 60000,
  });

  // Fetch Memory metrics
  const {
    data: memoryData,
    isLoading: isLoadingMemory,
    refetch: refetchMemory,
  } = useQuery({
    queryKey: ['device-memory-history', deviceId, timeRange],
    queryFn: async () => {
      if (!zabbixHostId) return [];
      const data = await fetchMetricHistory('vm.memory.utilization', timeFrom, timeTill);
      return data.map((point) => ({
        time: new Date(parseInt(point.clock, 10) * 1000).getTime(),
        value: parseFloat(point.value),
      }));
    },
    enabled: !!zabbixHostId,
    staleTime: 60000,
  });

  // Fetch Network metrics (RX/TX)
  const {
    data: networkData,
    isLoading: isLoadingNetwork,
    refetch: refetchNetwork,
  } = useQuery({
    queryKey: ['device-network-history', deviceId, timeRange],
    queryFn: async () => {
      if (!zabbixHostId) return [];
      const rxData = await fetchMetricHistory('net.if.in', timeFrom, timeTill);
      const txData = await fetchMetricHistory('net.if.out', timeFrom, timeTill);

      // Merge RX and TX data by timestamp
      const merged: Record<number, { time: number; rx: number; tx: number }> = {};

      rxData.forEach((point) => {
        const time = new Date(parseInt(point.clock, 10) * 1000).getTime();
        if (!merged[time]) {
          merged[time] = { time, rx: 0, tx: 0 };
        }
        merged[time].rx = parseFloat(point.value) / 1000000; // Convert to Mbps
      });

      txData.forEach((point) => {
        const time = new Date(parseInt(point.clock, 10) * 1000).getTime();
        if (!merged[time]) {
          merged[time] = { time, rx: 0, tx: 0 };
        }
        merged[time].tx = parseFloat(point.value) / 1000000; // Convert to Mbps
      });

      return Object.values(merged).sort((a, b) => a.time - b.time);
    },
    enabled: !!zabbixHostId,
    staleTime: 60000,
  });

  const handleRefreshAll = () => {
    refetchCpu();
    refetchMemory();
    refetchNetwork();
  };

  const formatXAxis = (timestamp: number) => {
    if (timeRange === '7d') {
      return format(new Date(timestamp), 'dd/MM', { locale: ptBR });
    }
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  };

  const isLoading = isLoadingCpu || isLoadingMemory || isLoadingNetwork || isLoadingMetrics;

  if (!zabbixHostId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Configure o Zabbix Host ID para visualizar os gráficos de métricas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* CPU Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            CPU Usage (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCpu ? (
            <Skeleton className="h-[200px] w-full" />
          ) : cpuData && cpuData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cpuData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatXAxis}
                  className="text-xs"
                />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip
                  labelFormatter={(value) =>
                    format(new Date(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                  }
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="CPU"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-green-500" />
            Memory Usage (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMemory ? (
            <Skeleton className="h-[200px] w-full" />
          ) : memoryData && memoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={memoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatXAxis}
                  className="text-xs"
                />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip
                  labelFormatter={(value) =>
                    format(new Date(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                  }
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Memória']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Memória"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4 text-orange-500" />
            Network Traffic (Mbps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingNetwork ? (
            <Skeleton className="h-[200px] w-full" />
          ) : networkData && networkData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatXAxis}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  labelFormatter={(value) =>
                    format(new Date(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                  }
                  formatter={(value: number) => [`${value.toFixed(2)} Mbps`]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rx"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="RX"
                />
                <Line
                  type="monotone"
                  dataKey="tx"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="TX"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
