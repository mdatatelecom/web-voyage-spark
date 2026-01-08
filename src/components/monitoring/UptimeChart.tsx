import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { UptimeRecord, calculateUptimePercentage, getAverageResponseTime } from '@/hooks/useUptimeHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Clock, Zap } from 'lucide-react';

interface UptimeChartProps {
  history: UptimeRecord[];
  isLoading: boolean;
}

export function UptimeChart({ history, isLoading }: UptimeChartProps) {
  const uptimePercentage = calculateUptimePercentage(history);
  const avgResponseTime = getAverageResponseTime(history);

  const chartData = history.map((record) => ({
    time: format(new Date(record.collected_at), 'HH:mm', { locale: ptBR }),
    date: format(new Date(record.collected_at), 'dd/MM', { locale: ptBR }),
    status: record.is_online ? 100 : 0,
    responseTime: record.response_time_ms || 0,
  }));

  const chartConfig = {
    status: {
      label: 'Disponibilidade',
      color: 'hsl(var(--primary))',
    },
    responseTime: {
      label: 'Tempo de Resposta',
      color: 'hsl(var(--secondary))',
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Disponibilidade
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Uptime:</span>
              <span className={`font-bold ${uptimePercentage >= 99 ? 'text-green-500' : uptimePercentage >= 95 ? 'text-yellow-500' : 'text-red-500'}`}>
                {uptimePercentage}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Média:</span>
              <span className="font-bold">{avgResponseTime}ms</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Nenhum dado de histórico disponível
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="stepAfter"
                  dataKey="status"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorStatus)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
