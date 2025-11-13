import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, DoorOpen, Package, Edit, Trash2 } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import { useUserRole } from '@/hooks/useUserRole';
import { RoomDialog } from '@/components/rooms/RoomDialog';
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

const getRoomTypeColor = (type: string | null) => {
  switch (type) {
    case 'Data Center':
      return 'bg-blue-500';
    case 'Sala Técnica':
      return 'bg-yellow-500';
    case 'Sala de Comunicações':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export default function Rooms() {
  const { buildingId, floorId } = useParams<{ buildingId: string; floorId: string }>();
  const navigate = useNavigate();
  const { rooms, isLoading, deleteRoom } = useRooms(floorId);
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
      deleteRoom(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Salas</h1>
            <p className="text-muted-foreground">Gerencie as salas deste andar</p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Sala
            </Button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : rooms?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DoorOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">Nenhuma sala cadastrada</p>
              <p className="text-muted-foreground mb-4">Comece adicionando a primeira sala</p>
              {isAdmin && (
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Sala
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms?.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{room.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(room.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {room.room_type && (
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${getRoomTypeColor(room.room_type)}`} />
                      <span className="text-sm text-muted-foreground">{room.room_type}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Racks</span>
                    </div>
                    <Badge>{room.racks?.[0]?.count || 0}</Badge>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/buildings/${buildingId}/floors/${floorId}/rooms/${room.id}/racks`)}
                  >
                    Ver Racks
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roomId={editingId}
        floorId={floorId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sala? Esta ação não pode ser desfeita.
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
