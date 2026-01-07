import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AlertTypeCount {
  type: string;
  count: number;
  label: string;
}

interface AlertsByTypeChartProps {
  data: AlertTypeCount[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(330, 65%, 60%)',
  'hsl(45, 93%, 47%)',
  'hsl(170, 60%, 50%)',
  'hsl(0, 84%, 60%)',
];

export const AlertsByTypeChart = ({ data }: AlertsByTypeChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
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
        />
        <Bar dataKey="count" name="Alertas" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
