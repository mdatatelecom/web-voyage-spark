import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useTicketStats';
import { TrendingUp } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';

export const SLATrendChart = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência SLA Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.slaTrend) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tendência SLA Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.slaTrend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, 'Compliance SLA']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine 
              y={90} 
              stroke="hsl(var(--warning))" 
              strokeDasharray="5 5" 
              label={{ value: 'Meta 90%', position: 'right', fontSize: 10 }}
            />
            <Area 
              type="monotone" 
              dataKey="compliance" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))" 
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
