import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AlertSeverityCount {
  severity: string;
  count: number;
  color: string;
}

interface AlertsBySeverityChartProps {
  data: AlertSeverityCount[];
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  warning: 'Alerta',
  info: 'Info',
};

export const AlertsBySeverityChart = ({ data }: AlertsBySeverityChartProps) => {
  const chartData = data.map((item) => ({
    ...item,
    name: SEVERITY_LABELS[item.severity] || item.severity,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={5}
          dataKey="count"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
