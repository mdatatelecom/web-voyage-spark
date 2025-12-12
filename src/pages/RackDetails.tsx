import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Edit, Plus, MapPin, Layers, DoorOpen, Package, Cable, AlertCircle, Box } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RackVisualization } from '@/components/racks/RackVisualization';
import { Rack3DDialog } from '@/components/racks/Rack3DDialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';
import { useAlertsByEntity } from '@/hooks/useAlerts';

export default function RackDetails() {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isTechnician } = useUserRole();
  const { data: rackAlerts } = useAlertsByEntity(rackId, 'rack');
  const [show3DDialog, setShow3DDialog] = useState(false);

  const { data: rack, isLoading } = useQuery({
    queryKey: ['rack-details', rackId],
    queryFn: async () => {
      if (!rackId) return null;
      
      const { data, error } = await supabase
        .from('racks')
        .select(`
          *,
          room:rooms(
            name,
            floor:floors(
              name,
              floor_number,
              building:buildings(name)
            )
          ),
          equipment(
            id,
            name,
            type,
            manufacturer,
            model,
            position_u_start,
            position_u_end,
            ip_address,
            hostname,
            serial_number,
            mount_side,
            ports(count)
          )
        `)
        .eq('id', rackId)
        .single();
      
      if (error) throw error;
      
      // Calculate occupancy (use Math.abs to handle inverted positions)
      const occupiedUs = data.equipment?.reduce((total: number, eq: any) => {
        return total + Math.abs(eq.position_u_end - eq.position_u_start) + 1;
      }, 0) || 0;
      
      const totalPorts = data.equipment?.reduce((total: number, eq: any) => {
        return total + (eq.ports?.[0]?.count || 0);
      }, 0) || 0;
      
      return {
        ...data,
        occupiedUs,
        availableUs: data.size_u - occupiedUs,
        occupancyPercentage: (occupiedUs / data.size_u) * 100,
        totalPorts,
      };
    },
    enabled: !!rackId,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-8">Carregando...</div>
      </AppLayout>
    );
  }

  if (!rack) {
    return (
      <AppLayout>
        <div className="text-center py-8">Rack não encontrado</div>
      </AppLayout>
    );
  }

  const getOccupancyColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Alerts */}
        {rackAlerts && rackAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Alerta de Capacidade:</strong> {rackAlerts[0].message}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{rack.name}</h1>
            <p className="text-muted-foreground">Tamanho: {rack.size_u}U</p>
          </div>
          <div className="flex gap-2">
            {(isAdmin || isTechnician) && (
              <>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Rack
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Equipamento
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Left Column - Info */}
          <div className="space-y-4">
            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Prédio:</span>
                  <span className="font-medium">{rack.room?.floor?.building?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Andar:</span>
                  <span className="font-medium">{rack.room?.floor?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Sala:</span>
                  <span className="font-medium">{rack.room?.name || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Ocupação</span>
                    <span className={`font-medium ${getOccupancyColor(rack.occupancyPercentage)}`}>
                      {rack.occupiedUs}/{rack.size_u}U ({Math.round(rack.occupancyPercentage)}%)
                    </span>
                  </div>
                  <Progress value={rack.occupancyPercentage} className="h-2" />
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipamentos</span>
                    <span className="font-medium">{rack.equipment?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Us Disponíveis</span>
                    <span className="font-medium">{rack.availableUs}U</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Cable className="h-3 w-3" />
                      Portas Totais
                    </span>
                    <span className="font-medium">{rack.totalPorts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            {rack.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rack.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Visualization */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Visualização do Rack</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShow3DDialog(true)}
                >
                  <Box className="mr-2 h-4 w-4" />
                  Abrir em 3D
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <RackVisualization
                  rackId={rack.id}
                  sizeU={rack.size_u}
                  equipment={rack.equipment || []}
                  onEquipmentClick={(eq) => {
                    navigate(`/equipment/${eq.id}`);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3D Dialog */}
        <Rack3DDialog
          open={show3DDialog}
          onOpenChange={setShow3DDialog}
          rackId={rack.id}
          rackName={rack.name}
          sizeU={rack.size_u}
          equipment={rack.equipment || []}
          onEquipmentClick={(eq) => {
            navigate(`/equipment/${eq.id}`);
            setShow3DDialog(false);
          }}
        />
      </div>
    </AppLayout>
  );
}
