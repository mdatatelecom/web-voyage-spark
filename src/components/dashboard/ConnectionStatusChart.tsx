import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { useConnectionStatusStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  testing: 'Em Teste',
  faulty: 'Com Falha',
  reserved: 'Reservado',
  inactive: 'Inativo'
};

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--chart-2))',
  testing: 'hsl(var(--chart-3))',
  faulty: 'hsl(var(--chart-1))',
  reserved: 'hsl(var(--chart-4))',
  inactive: 'hsl(var(--muted))'
};

export function ConnectionStatusChart() {
  const { data: connectionStats, isLoading } = useConnectionStatusStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = connectionStats?.map(item => ({
    status: STATUS_LABELS[item.status] || item.status,
    count: item.count,
    percentage: item.percentage,
    fill: STATUS_COLORS[item.status] || 'hsl(var(--chart-5))'
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status das Conexões</CardTitle>
        <CardDescription>Distribuição por status</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            count: {
              label: 'Conexões',
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="status" />
              <YAxis />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props.payload.percentage}%)`,
                  'Conexões'
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
