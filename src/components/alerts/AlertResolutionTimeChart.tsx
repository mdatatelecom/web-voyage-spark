import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AlertResolutionTime {
  type: string;
  avgHours: number;
  label: string;
}

interface AlertResolutionTimeChartProps {
  data: AlertResolutionTime[];
}

export const AlertResolutionTimeChart = ({ data }: AlertResolutionTimeChartProps) => {
  const formattedData = data.map((item) => ({
    ...item,
    avgHoursDisplay: Math.round(item.avgHours * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formattedData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}h`}
        />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          width={75}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: number) => [`${value.toFixed(1)} horas`, 'Tempo Médio']}
        />
        <Bar dataKey="avgHoursDisplay" name="Tempo Médio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
