import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Award } from 'lucide-react';

interface TopConnectionsChartProps {
  data?: Array<{
    connection_id: string;
    connection_code: string;
    scan_count: number;
  }>;
}

export const TopConnectionsChart = ({ data }: TopConnectionsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Top 10 Conexões Mais Escaneadas
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado disponível
        </div>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.connection_code,
    scans: item.scan_count,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award className="h-5 w-5" />
        Top 10 Conexões Mais Escaneadas
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip />
          <Bar dataKey="scans" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
