import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAllDeviceMetrics, TimeRange } from '@/hooks/useDeviceMetricsHistory';
import { format } from 'date-fns';
import { Cpu, HardDrive, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DeviceMetricsHistoryProps {
  deviceUuid: string;
}

interface ProcessedMetric {
  time: string;
  timestamp: Date;
  value: number;
}

export function DeviceMetricsHistory({ deviceUuid }: DeviceMetricsHistoryProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { data: metrics, isLoading } = useAllDeviceMetrics(deviceUuid, timeRange);

  // Processar métricas de CPU
  const cpuData: ProcessedMetric[] = [];
  if (metrics?.cpu) {
    const grouped = new Map<string, number[]>();
    for (const m of metrics.cpu) {
      const time = format(new Date(m.collected_at), timeRange === '7d' ? 'dd/MM HH:mm' : 'HH:mm');
      if (!grouped.has(time)) grouped.set(time, []);
      const val = parseFloat(m.value);
      if (!isNaN(val)) grouped.get(time)!.push(val);
    }
    for (const [time, values] of grouped) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      cpuData.push({ time, timestamp: new Date(), value: avg });
    }
  }

  // Processar métricas de memória
  const memoryData: ProcessedMetric[] = [];
  if (metrics?.memoria) {
    const grouped = new Map<string, number[]>();
    for (const m of metrics.memoria) {
      const time = format(new Date(m.collected_at), timeRange === '7d' ? 'dd/MM HH:mm' : 'HH:mm');
      if (!grouped.has(time)) grouped.set(time, []);
      const val = parseFloat(m.value);
      if (!isNaN(val)) grouped.get(time)!.push(val);
    }
    for (const [time, values] of grouped) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      memoryData.push({ time, timestamp: new Date(), value: avg });
    }
  }

  const chartConfig = {
    cpu: { label: 'CPU (%)', color: 'hsl(var(--chart-1))' },
    memory: { label: 'Memória (%)', color: 'hsl(var(--chart-2))' },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hora</SelectItem>
            <SelectItem value="6h">6 horas</SelectItem>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Uso de CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cpuData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sem dados de CPU</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-cpu)"
                      fill="var(--color-cpu)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="CPU"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Memory Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Uso de Memória
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memoryData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sem dados de Memória</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-memory)"
                      fill="var(--color-memory)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Memória"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">CPU Média</p>
              <p className="text-lg font-semibold">
                {cpuData.length > 0
                  ? `${(cpuData.reduce((a, b) => a + b.value, 0) / cpuData.length).toFixed(1)}%`
                  : '-'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">CPU Máx</p>
              <p className="text-lg font-semibold">
                {cpuData.length > 0
                  ? `${Math.max(...cpuData.map(d => d.value)).toFixed(1)}%`
                  : '-'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Memória Média</p>
              <p className="text-lg font-semibold">
                {memoryData.length > 0
                  ? `${(memoryData.reduce((a, b) => a + b.value, 0) / memoryData.length).toFixed(1)}%`
                  : '-'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Memória Máx</p>
              <p className="text-lg font-semibold">
                {memoryData.length > 0
                  ? `${Math.max(...memoryData.map(d => d.value)).toFixed(1)}%`
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
