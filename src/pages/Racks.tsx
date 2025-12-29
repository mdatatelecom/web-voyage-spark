import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Package, Edit, Trash2, Eye, MapPin, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useRacks } from '@/hooks/useRacks';
import { useUserRole } from '@/hooks/useUserRole';
import { RackDialog } from '@/components/racks/RackDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RackMiniVisualization } from '@/components/racks/RackMiniVisualization';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Get color class based on occupancy percentage
const getOccupancyConfig = (percentage: number) => {
  if (percentage < 50) return { 
    color: 'bg-[hsl(var(--status-ok))]', 
    textColor: 'text-[hsl(var(--status-ok))]',
    icon: CheckCircle,
    label: 'Disponível'
  };
  if (percentage < 80) return { 
    color: 'bg-[hsl(var(--status-warning))]', 
    textColor: 'text-[hsl(var(--status-warning))]',
    icon: AlertTriangle,
    label: 'Moderado'
  };
  return { 
    color: 'bg-[hsl(var(--status-error))]', 
    textColor: 'text-[hsl(var(--status-error))]',
    icon: AlertCircle,
    label: 'Crítico'
  };
};

export default function Racks() {
  const { buildingId, floorId, roomId } = useParams();
  const navigate = useNavigate();
  const { racks, isLoading, deleteRack } = useRacks(roomId);
  const { isAdmin } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingId(undefined);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRack(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Racks</h1>
            <p className="text-muted-foreground">
              {roomId ? 'Gerencie os racks desta sala' : 'Visualize todos os racks do sistema'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Rack
            </Button>
          )}
        </div>


        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : racks?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">Nenhum rack cadastrado</p>
              <p className="text-muted-foreground mb-4">Comece adicionando o primeiro rack</p>
              {isAdmin && (
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Rack
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {racks?.map((rack) => {
              const occupancyConfig = getOccupancyConfig(rack.occupancyPercentage);
              const OccupancyIcon = occupancyConfig.icon;
              
              return (
                <Card key={rack.id} className="hover:shadow-lg transition-all duration-200 group border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary flex-shrink-0" />
                          <CardTitle className="text-xl font-bold truncate">{rack.name}</CardTitle>
                        </div>
                        {/* Location path */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {rack.room?.floor?.building?.name && (
                              <>
                                {rack.room.floor.building.name}
                                {rack.room?.floor?.name && ` › ${rack.room.floor.name}`}
                                {rack.room?.name && ` › ${rack.room.name}`}
                              </>
                            )}
                            {!rack.room?.floor?.building?.name && rack.room?.name && rack.room.name}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(rack.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(rack.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mini Visualization */}
                    <div className="flex justify-center py-2">
                      <RackMiniVisualization
                        sizeU={rack.size_u}
                        equipment={rack.equipment || []}
                      />
                    </div>

                    {/* Occupancy Stats with Tooltip */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-2 cursor-help">
                            {/* Progress bar with dynamic color */}
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full transition-all duration-300", occupancyConfig.color)}
                                style={{ width: `${rack.occupancyPercentage}%` }}
                              />
                            </div>
                            
                            {/* Stats row */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1.5">
                                <OccupancyIcon className={cn("h-4 w-4", occupancyConfig.textColor)} />
                                <span className={cn("font-semibold", occupancyConfig.textColor)}>
                                  {Math.round(rack.occupancyPercentage)}%
                                </span>
                              </div>
                              <span className="text-muted-foreground font-mono text-xs">
                                {rack.occupiedUs}U / {rack.size_u}U
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-medium">
                          <div className="space-y-1">
                            <p className="font-bold">{rack.occupiedUs}U ocupados | {rack.availableUs}U livres</p>
                            <p className="text-xs text-muted-foreground">
                              Capacidade: {rack.size_u}U total
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      className="w-full"
                      onClick={() => navigate(`/racks/${rack.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rackId={editingId}
        roomId={roomId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este rack? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}