import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';

interface HourDistributionChartProps {
  data?: Array<{ hour: string; count: number }>;
}

export const HourDistributionChart = ({ data }: HourDistributionChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Distribuição por Hora do Dia
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado disponível
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Distribuição por Hora do Dia
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--chart-1))" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
