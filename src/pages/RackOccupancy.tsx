import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRackOccupancyStats } from '@/hooks/useDashboardStats';
import { useExport } from '@/hooks/useExport';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RackOccupancy() {
  const { data: racks, isLoading } = useRackOccupancyStats();
  const { exportMultiSheetExcel } = useExport();
  const navigate = useNavigate();

  const handleExport = () => {
    if (!racks) return;

    const summary = racks.map(rack => ({
      'Nome': rack.name,
      'Localização': rack.location,
      'Total Us': rack.totalUs,
      'Us Ocupados': rack.occupiedUs,
      'Us Disponíveis': rack.availableUs,
      'Ocupação (%)': rack.occupancyPercentage
    }));

    exportMultiSheetExcel(
      [{ name: 'Resumo de Ocupação', data: summary }],
      'relatorio-ocupacao-racks'
    );
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getOccupancyBadge = (percentage: number) => {
    if (percentage < 50) return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">Baixa</Badge>;
    if (percentage < 80) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Média</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">Alta</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatório de Ocupação de Racks</h1>
            <p className="text-muted-foreground mt-2">
              Visualize e exporte relatórios detalhados de ocupação
            </p>
          </div>
          <Button onClick={handleExport} disabled={!racks || racks.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !racks || racks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Nenhum rack encontrado
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {racks.map(rack => (
              <Card 
                key={rack.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/racks/${rack.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{rack.name}</CardTitle>
                      <CardDescription>{rack.location}</CardDescription>
                    </div>
                    {getOccupancyBadge(rack.occupancyPercentage)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ocupação</span>
                      <span className="font-medium">
                        {rack.occupiedUs} / {rack.totalUs} Us ({rack.occupancyPercentage}%)
                      </span>
                    </div>
                    <Progress 
                      value={rack.occupancyPercentage} 
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{rack.totalUs}</p>
                      <p className="text-xs text-muted-foreground">Total Us</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rack.occupiedUs}</p>
                      <p className="text-xs text-muted-foreground">Ocupados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{rack.availableUs}</p>
                      <p className="text-xs text-muted-foreground">Disponíveis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
