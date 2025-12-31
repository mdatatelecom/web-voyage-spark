import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useTicketStats';
import { LayoutGrid } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Cell
} from 'recharts';

const getComplianceColor = (compliance: number): string => {
  if (compliance >= 90) return 'hsl(142, 76%, 36%)'; // green
  if (compliance >= 70) return 'hsl(45, 93%, 47%)';  // yellow
  if (compliance >= 50) return 'hsl(24, 94%, 50%)';  // orange
  return 'hsl(0, 84%, 60%)'; // red
};

export const SLAByCategoryChart = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.slaByCategory || stats.slaByCategory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            SLA por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de SLA por categoria
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          SLA por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.slaByCategory} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              dataKey="label" 
              type="category" 
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, _name: string, props: any) => [
                `${value}% (${props.payload.onTime}/${props.payload.total})`, 
                'Compliance'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine 
              x={90} 
              stroke="hsl(var(--warning))" 
              strokeDasharray="5 5" 
            />
            <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
              {stats.slaByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getComplianceColor(entry.compliance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
