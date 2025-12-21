import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats, formatResolutionTime } from '@/hooks/useTicketStats';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export const ResolutionByCategoryChart = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tempo de Resolução por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.resolutionByCategory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tempo de Resolução por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const data = stats.resolutionByCategory.map(item => ({
    ...item,
    avgHours: Math.round(item.avgMinutes / 60 * 10) / 10,
    formattedTime: formatResolutionTime(item.avgMinutes)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>⏱️</span>
          Tempo Médio por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis 
              type="number" 
              tickFormatter={(value) => `${value}h`}
            />
            <YAxis 
              type="category" 
              dataKey="label" 
              width={70}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                props.payload.formattedTime,
                'Tempo Médio'
              ]}
              labelFormatter={(label) => `Categoria: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          {data.slice(0, 4).map((item, i) => (
            <div key={item.category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span>{item.label}: {item.formattedTime} ({item.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
