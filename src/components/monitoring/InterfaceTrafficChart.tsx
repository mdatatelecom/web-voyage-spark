import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { format, subHours, subDays } from 'date-fns';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TrafficChartProps {
  deviceUuid: string;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

interface MetricRow {
  id: string;
  oid: string;
  value: string;
  category: string;
  collected_at: string;
}

export function InterfaceTrafficChart({ deviceUuid }: TrafficChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const getStartDate = (range: TimeRange) => {
    switch (range) {
      case '1h': return subHours(new Date(), 1);
      case '6h': return subHours(new Date(), 6);
      case '24h': return subDays(new Date(), 1);
      case '7d': return subDays(new Date(), 7);
    }
  };

  const { data: trafficData, isLoading } = useQuery({
    queryKey: ['interface-traffic', deviceUuid, timeRange],
    queryFn: async () => {
      const startDate = getStartDate(timeRange);

      const { data, error } = await supabase
        .from('snmp_metrics')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .eq('category', 'trafego')
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) throw error;

      const metrics = (data || []) as MetricRow[];

      // Agrupar por timestamp e calcular totais
      const grouped = new Map<string, { rx: number; tx: number; timestamp: Date }>();

      for (const metric of metrics) {
        const ts = new Date(metric.collected_at);
        const key = ts.toISOString();
        
        if (!grouped.has(key)) {
          grouped.set(key, { rx: 0, tx: 0, timestamp: ts });
        }
        
        const entry = grouped.get(key)!;
        const value = parseInt(metric.value) || 0;
        
        // OIDs de tráfego: ifInOctets contém "In", ifOutOctets contém "Out"
        if (metric.oid.includes('In') || metric.oid.includes('1.3.6.1.2.1.2.2.1.10')) {
          entry.rx += value;
        } else if (metric.oid.includes('Out') || metric.oid.includes('1.3.6.1.2.1.2.2.1.16')) {
          entry.tx += value;
        }
      }

      // Converter para array e calcular rates
      const sorted = Array.from(grouped.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Calcular taxa de bits por segundo entre coletas
      const chartData = [];
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const timeDiffSec = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
        
        if (timeDiffSec > 0) {
          const rxRate = ((curr.rx - prev.rx) * 8) / timeDiffSec / 1000000; // Mbps
          const txRate = ((curr.tx - prev.tx) * 8) / timeDiffSec / 1000000; // Mbps
          
          chartData.push({
            time: format(curr.timestamp, timeRange === '7d' ? 'dd/MM HH:mm' : 'HH:mm'),
            timestamp: curr.timestamp,
            rx: Math.max(0, rxRate),
            tx: Math.max(0, txRate)
          });
        }
      }

      return chartData;
    },
    refetchInterval: 60000,
    enabled: !!deviceUuid
  });

  // Calcular totais
  const totalRx = trafficData?.reduce((sum, d) => sum + d.rx, 0) || 0;
  const totalTx = trafficData?.reduce((sum, d) => sum + d.tx, 0) || 0;
  const avgRx = trafficData && trafficData.length > 0 ? totalRx / trafficData.length : 0;
  const avgTx = trafficData && trafficData.length > 0 ? totalTx / trafficData.length : 0;

  const chartConfig = {
    rx: { label: 'Download (Mbps)', color: 'hsl(var(--chart-1))' },
    tx: { label: 'Upload (Mbps)', color: 'hsl(var(--chart-2))' },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Tráfego de Rede</CardTitle>
        </div>
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
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <ArrowDown className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Download Médio</p>
              <p className="text-lg font-semibold">{avgRx.toFixed(2)} Mbps</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <ArrowUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Upload Médio</p>
              <p className="text-lg font-semibold">{avgTx.toFixed(2)} Mbps</p>
            </div>
          </div>
        </div>

        {!trafficData || trafficData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sem dados de tráfego para este período</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Line
                  type="monotone"
                  dataKey="rx"
                  stroke="var(--color-rx)"
                  strokeWidth={2}
                  dot={false}
                  name="Download"
                />
                <Line
                  type="monotone"
                  dataKey="tx"
                  stroke="var(--color-tx)"
                  strokeWidth={2}
                  dot={false}
                  name="Upload"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
