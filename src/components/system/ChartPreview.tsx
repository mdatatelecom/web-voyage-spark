import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';

interface ChartPreviewProps {
  colors: {
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
}

export const ChartPreview = ({ colors }: ChartPreviewProps) => {
  const pieData = [
    { name: 'Switch', value: 35 },
    { name: 'Servidor', value: 25 },
    { name: 'Router', value: 20 },
    { name: 'Firewall', value: 12 },
    { name: 'Outros', value: 8 },
  ];

  const barData = [
    { name: 'Ativo', value: 45 },
    { name: 'Teste', value: 12 },
    { name: 'Reserv.', value: 8 },
    { name: 'Inativo', value: 5 },
    { name: 'Outros', value: 3 },
  ];

  const COLORS = [
    `hsl(${colors.chart1})`,
    `hsl(${colors.chart2})`,
    `hsl(${colors.chart3})`,
    `hsl(${colors.chart4})`,
    `hsl(${colors.chart5})`,
  ];

  return (
    <Card className="p-4 bg-muted/30">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Preview ao Vivo dos Gráficos
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mini Pie Chart */}
        <div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  dataKey="value" 
                  outerRadius={60}
                  innerRadius={30}
                  paddingAngle={2}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">Equipamentos por Tipo</p>
        </div>

        {/* Mini Bar Chart */}
        <div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={50}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {barData.map((_, index) => (
                    <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">Status das Conexões</p>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex gap-3 mt-4 flex-wrap justify-center border-t pt-3">
        {['Chart 1', 'Chart 2', 'Chart 3', 'Chart 4', 'Chart 5'].map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border border-border/50"
              style={{ backgroundColor: COLORS[i] }}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
