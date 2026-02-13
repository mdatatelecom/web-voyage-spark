import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAlerts } from '@/hooks/useAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { HardHat } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export const TicketsByEpiChart = () => {
  const { alerts, isLoading } = useAlerts({ type: 'epi_alert' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Por EPI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px]" />
        </CardContent>
      </Card>
    );
  }

  const epiAlerts = alerts || [];

  // Group by severity
  const severityMap = new Map<string, number>();
  epiAlerts.forEach(alert => {
    const severity = alert.severity || 'info';
    severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
  });

  const severityLabels: Record<string, string> = {
    critical: 'Crítico',
    warning: 'Alerta',
    info: 'Info',
  };

  const data = Array.from(severityMap.entries()).map(([severity, count]) => ({
    name: severityLabels[severity] || severity,
    value: count,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Por EPI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          Nenhum alerta de EPI registrado
        </CardContent>
      </Card>
    );
  }

  // Status breakdown
  const activeCount = epiAlerts.filter(a => a.status === 'active').length;
  const resolvedCount = epiAlerts.filter(a => a.status === 'resolved').length;
  const acknowledgedCount = epiAlerts.filter(a => a.status === 'acknowledged').length;

  const statusData = [
    ...(activeCount > 0 ? [{ name: 'Ativos', value: activeCount }] : []),
    ...(acknowledgedCount > 0 ? [{ name: 'Reconhecidos', value: acknowledgedCount }] : []),
    ...(resolvedCount > 0 ? [{ name: 'Resolvidos', value: resolvedCount }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="h-5 w-5" />
          Por EPI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData.length > 0 ? statusData : data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {(statusData.length > 0 ? statusData : data).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
