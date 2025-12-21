import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useTicketStats';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const SLAComplianceChart = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conformidade SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const compliance = stats.slaCompliance;
  const overdue = stats.overdueTickets;
  
  // Determine color based on SLA
  let color = '#10b981'; // green
  let Icon = CheckCircle2;
  let status = 'Excelente';
  
  if (compliance < 70) {
    color = '#ef4444'; // red
    Icon = XCircle;
    status = 'Crítico';
  } else if (compliance < 90) {
    color = '#f59e0b'; // yellow
    Icon = AlertTriangle;
    status = 'Atenção';
  }

  const data = [
    { name: 'Dentro do SLA', value: compliance },
    { name: 'Fora do SLA', value: 100 - compliance }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📊</span>
          Conformidade SLA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill={color} />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl font-bold" style={{ color }}>
                  {compliance}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" style={{ color }} />
              <span className="font-medium" style={{ color }}>{status}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dentro do prazo</span>
                <span className="font-medium text-green-500">{compliance}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atrasados ativos</span>
                <span className="font-medium text-red-500">{overdue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urgentes (24h)</span>
                <span className="font-medium text-amber-500">{stats.urgentTickets.length}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
