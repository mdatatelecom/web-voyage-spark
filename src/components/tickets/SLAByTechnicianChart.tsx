import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useTicketStats';
import { Users } from 'lucide-react';
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

export const SLAByTechnicianChart = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.slaByTechnician || stats.slaByTechnician.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            SLA por Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de SLA por técnico
          </div>
        </CardContent>
      </Card>
    );
  }

  // Truncate long names for display
  const chartData = stats.slaByTechnician.map(t => ({
    ...t,
    displayName: t.name.length > 15 ? t.name.substring(0, 12) + '...' : t.name
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          SLA por Técnico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayName" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, _name: string, props: any) => [
                `${value}% (${props.payload.onTime}/${props.payload.total})`, 
                'Compliance'
              ]}
              labelFormatter={(label) => {
                const tech = stats.slaByTechnician.find(t => 
                  t.name === label || t.name.startsWith(label.replace('...', ''))
                );
                return tech?.name || label;
              }}
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
            <Bar dataKey="compliance" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getComplianceColor(entry.compliance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
