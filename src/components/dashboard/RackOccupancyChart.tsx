import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { useRackOccupancyStats, DashboardStatsFilters } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

interface RackOccupancyChartProps {
  filters?: DashboardStatsFilters;
}

export function RackOccupancyChart({ filters }: RackOccupancyChartProps) {
  const { data: racks, isLoading } = useRackOccupancyStats(filters);

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

  const topRacks = racks?.slice(0, 10) || [];

  const getOccupancyColor = (percentage: number) => {
    if (percentage < 50) return 'hsl(var(--chart-2))'; // Green
    if (percentage < 80) return 'hsl(var(--chart-3))'; // Yellow
    return 'hsl(var(--chart-1))'; // Red
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupação de Racks</CardTitle>
        <CardDescription>Top 10 racks por porcentagem de ocupação</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            occupancy: {
              label: 'Ocupação',
              color: 'hsl(var(--chart-1))',
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topRacks} layout="vertical" margin={{ left: 100, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={90} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${props.payload.occupiedUs}/${props.payload.totalUs} Us)`,
                  'Ocupação'
                ]}
              />
              <Bar
                dataKey="occupancyPercentage"
                radius={[0, 4, 4, 0]}
              >
                {topRacks.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getOccupancyColor(entry.occupancyPercentage)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
