import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Layers, DoorOpen, Edit, Trash2 } from 'lucide-react';
import { useFloors } from '@/hooks/useFloors';
import { useUserRole } from '@/hooks/useUserRole';
import { FloorDialog } from '@/components/floors/FloorDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function Floors() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { floors, isLoading, deleteFloor } = useFloors(buildingId);
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
      deleteFloor(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Andares</h1>
            <p className="text-muted-foreground">Gerencie os andares deste prédio</p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Andar
            </Button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : floors?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">Nenhum andar cadastrado</p>
              <p className="text-muted-foreground mb-4">Comece adicionando o primeiro andar</p>
              {isAdmin && (
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Andar
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {floors?.map((floor) => (
              <Card key={floor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <CardTitle>{floor.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(floor.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(floor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Número do Andar</span>
                    <Badge variant="secondary">
                      {floor.floor_number !== null ? `${floor.floor_number}º` : 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DoorOpen className="h-4 w-4" />
                      <span>Salas</span>
                    </div>
                    <Badge>{floor.rooms?.[0]?.count || 0}</Badge>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/buildings/${buildingId}/floors/${floor.id}/rooms`)}
                  >
                    Ver Salas
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FloorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        floorId={editingId}
        buildingId={buildingId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este andar? Esta ação não pode ser desfeita.
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
