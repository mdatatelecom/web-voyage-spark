import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Package, Edit, Trash2, Eye } from 'lucide-react';
import { useRacks } from '@/hooks/useRacks';
import { useUserRole } from '@/hooks/useUserRole';
import { RackDialog } from '@/components/racks/RackDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RackMiniVisualization } from '@/components/racks/RackMiniVisualization';
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

  const getOccupancyColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
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
          {isAdmin && roomId && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Rack
            </Button>
          )}
        </div>

        {!roomId && (
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                💡 Para criar novos racks, navegue até a sala específica através de Localizações {'>'} Prédio {'>'} Andar {'>'} Sala
              </p>
            </CardContent>
          </Card>
        )}

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
            {racks?.map((rack) => (
              <Card key={rack.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{rack.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rack.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
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

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tamanho</span>
                      <span className="font-medium">{rack.size_u}U</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ocupação</span>
                      <span className={`font-medium ${getOccupancyColor(rack.occupancyPercentage)}`}>
                        {rack.occupiedUs}/{rack.size_u}U ({Math.round(rack.occupancyPercentage)}%)
                      </span>
                    </div>
                    <Progress value={rack.occupancyPercentage} className="h-2" />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => navigate(`/racks/${rack.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
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
