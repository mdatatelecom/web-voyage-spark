import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertStat {
  date: string;
  count: number;
  critical: number;
  warning: number;
  info: number;
}

interface AlertTrendChartProps {
  data: AlertStat[];
}

export const AlertTrendChart = ({ data }: AlertTrendChartProps) => {
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="critical"
          name="Crítico"
          stackId="1"
          stroke="hsl(0, 84%, 60%)"
          fillOpacity={1}
          fill="url(#colorCritical)"
        />
        <Area
          type="monotone"
          dataKey="warning"
          name="Alerta"
          stackId="1"
          stroke="hsl(45, 93%, 47%)"
          fillOpacity={1}
          fill="url(#colorWarning)"
        />
        <Area
          type="monotone"
          dataKey="info"
          name="Info"
          stackId="1"
          stroke="hsl(217, 91%, 60%)"
          fillOpacity={1}
          fill="url(#colorInfo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
