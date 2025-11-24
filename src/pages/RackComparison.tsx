import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Rack3DVisualizationMini } from '@/components/racks/Rack3DVisualizationMini';
import { Building2, Layers, Grid3x3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Rack {
  id: string;
  name: string;
  size_u: number;
  room?: {
    name: string;
    floor?: {
      name: string;
      building?: {
        name: string;
      };
    };
  };
  equipment?: Array<{
    id: string;
    name: string;
    type: string;
    position_u_start: number;
    position_u_end: number;
  }>;
}

export default function RackComparison() {
  const [selectedRackIds, setSelectedRackIds] = useState<string[]>([]);

  const { data: racks, isLoading } = useQuery({
    queryKey: ['racks-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('racks')
        .select(`
          *,
          room:rooms(
            name,
            floor:floors(
              name,
              building:buildings(name)
            )
          ),
          equipment(
            id,
            name,
            type,
            position_u_start,
            position_u_end
          )
        `)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(rack => ({
        ...rack,
        occupiedUs: rack.equipment?.reduce((total: number, eq: any) => {
          return total + (eq.position_u_end - eq.position_u_start + 1);
        }, 0) || 0,
        availableUs: rack.size_u - (rack.equipment?.reduce((total: number, eq: any) => {
          return total + (eq.position_u_end - eq.position_u_start + 1);
        }, 0) || 0),
        occupancyPercentage: Math.round(
          ((rack.equipment?.reduce((total: number, eq: any) => {
            return total + (eq.position_u_end - eq.position_u_start + 1);
          }, 0) || 0) / rack.size_u) * 100
        )
      }));
    }
  });

  const selectedRacks = racks?.filter(r => selectedRackIds.includes(r.id)) || [];

  const toggleRackSelection = (rackId: string) => {
    if (selectedRackIds.includes(rackId)) {
      setSelectedRackIds(selectedRackIds.filter(id => id !== rackId));
    } else if (selectedRackIds.length < 4) {
      setSelectedRackIds([...selectedRackIds, rackId]);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando racks...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparação de Racks</h1>
          <p className="text-muted-foreground">
            Compare até 4 racks lado a lado para análise de capacidade
          </p>
        </div>

        {/* Rack Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Racks</CardTitle>
            <CardDescription>
              Escolha até 4 racks para comparar ({selectedRackIds.length}/4 selecionados)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {racks?.map((rack) => (
                <div
                  key={rack.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedRackIds.includes(rack.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleRackSelection(rack.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{rack.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {rack.room?.floor?.building?.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {rack.room?.floor?.name} - {rack.room?.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Grid3x3 className="h-3 w-3" />
                          {rack.occupancyPercentage}% ocupado
                        </div>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedRackIds.includes(rack.id)}
                      onCheckedChange={() => toggleRackSelection(rack.id)}
                      disabled={!selectedRackIds.includes(rack.id) && selectedRackIds.length >= 4}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparison View */}
        {selectedRacks.length > 0 && (
          <>
            {/* 3D Visualizations */}
            <div className={`grid gap-4 ${
              selectedRacks.length === 1 ? 'grid-cols-1' :
              selectedRacks.length === 2 ? 'grid-cols-2' :
              selectedRacks.length === 3 ? 'grid-cols-3' :
              'grid-cols-2 lg:grid-cols-4'
            }`}>
              {selectedRacks.map((rack) => (
                <Card key={rack.id}>
                  <CardContent className="p-4">
                    <Rack3DVisualizationMini rack={rack} />
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ocupação</span>
                        <Badge variant={rack.occupancyPercentage > 80 ? 'destructive' : 'secondary'}>
                          {rack.occupancyPercentage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Equipamentos</span>
                        <span className="font-medium">{rack.equipment?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Métricas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Métrica</TableHead>
                      {selectedRacks.map((rack) => (
                        <TableHead key={rack.id}>{rack.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Tamanho Total (U)</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id}>{rack.size_u}U</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Us Ocupados</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id}>{rack.occupiedUs}U</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Us Disponíveis</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id} className="text-green-600 dark:text-green-400">
                          {rack.availableUs}U
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ocupação (%)</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id}>
                          <Badge variant={rack.occupancyPercentage > 80 ? 'destructive' : 'secondary'}>
                            {rack.occupancyPercentage}%
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Equipamentos</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id}>{rack.equipment?.length || 0}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Localização</TableCell>
                      {selectedRacks.map((rack) => (
                        <TableCell key={rack.id} className="text-xs">
                          {rack.room?.floor?.building?.name} / {rack.room?.floor?.name} / {rack.room?.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {selectedRacks.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Grid3x3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum rack selecionado</h3>
              <p className="text-sm text-muted-foreground">
                Selecione até 4 racks acima para começar a comparação
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
