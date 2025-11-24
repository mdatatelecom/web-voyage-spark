import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Server, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { EquipmentDialog } from '@/components/equipment/EquipmentDialog';
import { EquipmentEditDialog } from '@/components/equipment/EquipmentEditDialog';
import { useEquipment } from '@/hooks/useEquipment';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '@/components/export/ExportButton';

export default function Equipment() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const { equipment, isLoading, updateEquipment, deleteEquipment, isUpdating, isDeleting } = useEquipment();
  const navigate = useNavigate();

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      switch: 'bg-blue-500',
      router: 'bg-green-500',
      server: 'bg-orange-500',
      patch_panel: 'bg-gray-500',
      firewall: 'bg-red-500',
      storage: 'bg-purple-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const handleEdit = (eq: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEquipment(eq);
    setEditDialogOpen(true);
  };

  const handleDelete = (eq: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEquipment(eq);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedEquipment) {
      await deleteEquipment(selectedEquipment.id);
      setDeleteDialogOpen(false);
      setSelectedEquipment(null);
    }
  };

  const handleUpdateEquipment = async (data: any) => {
    await updateEquipment(data);
    setEditDialogOpen(false);
    setSelectedEquipment(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="w-8 h-8" />
              Equipamentos
            </h1>
            <p className="text-muted-foreground">Gerencie todos os equipamentos de rede</p>
          </div>
          <div className="flex gap-2">
            {equipment && equipment.length > 0 && (
              <ExportButton data={equipment.map(eq => ({ 'Nome': eq.name, 'Tipo': eq.type }))} filename="equipamentos" sheetName="Equipamentos" />
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Novo Equipamento
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : equipment && equipment.length > 0 ? (
          <div className="grid gap-4">
            {equipment.map((eq) => (
              <div key={eq.id} onClick={() => navigate(`/equipment/${eq.id}`)} className="p-6 border rounded-lg hover:shadow-lg transition-all cursor-pointer relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/equipment/${eq.id}`)}><Eye className="w-4 h-4 mr-2" />Ver Detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(eq, e)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDelete(eq, e)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{eq.name}</h3>
                  <Badge className={getTypeColor(eq.type)}>{eq.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhum equipamento cadastrado</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Primeiro Equipamento</Button>
          </div>
        )}
      </div>

      <EquipmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EquipmentEditDialog equipment={selectedEquipment} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSave={handleUpdateEquipment} isLoading={isUpdating} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{selectedEquipment?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
