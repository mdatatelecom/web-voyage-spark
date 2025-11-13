import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { usePortUsageStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function PortUsageChart() {
  const { data: portStats, isLoading } = usePortUsageStats();

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

  const chartData = [
    {
      name: 'Portas',
      available: portStats?.available || 0,
      inUse: portStats?.inUse || 0,
      reserved: portStats?.reserved || 0,
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de Portas</CardTitle>
        <CardDescription>
          Total: {portStats?.total || 0} portas ({portStats?.availablePercentage || 0}% disponíveis)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            available: {
              label: 'Disponíveis',
              color: 'hsl(var(--chart-2))',
            },
            inUse: {
              label: 'Em Uso',
              color: 'hsl(var(--chart-1))',
            },
            reserved: {
              label: 'Reservadas',
              color: 'hsl(var(--chart-3))',
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="available" fill="hsl(var(--chart-2))" name="Disponíveis" stackId="a" />
              <Bar dataKey="inUse" fill="hsl(var(--chart-1))" name="Em Uso" stackId="a" />
              <Bar dataKey="reserved" fill="hsl(var(--chart-3))" name="Reservadas" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
