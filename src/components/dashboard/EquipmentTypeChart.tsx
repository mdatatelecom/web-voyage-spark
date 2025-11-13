import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useEquipmentTypeStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const TYPE_LABELS: Record<string, string> = {
  switch: 'Switch',
  router: 'Roteador',
  server: 'Servidor',
  patch_panel: 'Patch Panel',
  firewall: 'Firewall',
  storage: 'Storage',
  other: 'Outro'
};

export function EquipmentTypeChart() {
  const { data: equipmentTypes, isLoading } = useEquipmentTypeStats();

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

  const chartData = equipmentTypes?.map(item => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: item.count,
    percentage: item.percentage
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Equipamentos</CardTitle>
        <CardDescription>Distribuição por categoria</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: 'Quantidade',
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="hsl(var(--chart-1))"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props.payload.percentage}%)`,
                  props.payload.name
                ]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
