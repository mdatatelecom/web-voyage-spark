import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeviceStatusBadge } from '@/components/monitoring/DeviceStatusBadge';
import { DeviceDialog } from '@/components/monitoring/DeviceDialog';
import { useMonitoredDevices, MonitoredDevice, CreateDeviceInput } from '@/hooks/useMonitoredDevices';
import { Plus, Pencil, Trash2, Server, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

export default function MonitoringDevices() {
  const navigate = useNavigate();
  const {
    devices,
    isLoading,
    createDevice,
    updateDevice,
    deleteDevice,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMonitoredDevices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MonitoredDevice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<MonitoredDevice | null>(null);

  const handleAdd = () => {
    setEditingDevice(null);
    setDialogOpen(true);
  };

  const handleEdit = (device: MonitoredDevice) => {
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const handleDelete = (device: MonitoredDevice) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      deleteDevice(deviceToDelete.id);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const handleSave = (data: CreateDeviceInput | Partial<MonitoredDevice>) => {
    if (editingDevice) {
      updateDevice(data as Partial<MonitoredDevice> & { id: string });
    } else {
      createDevice(data as CreateDeviceInput);
    }
    setDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="h-8 w-8" />
              Gerenciar Dispositivos
            </h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie os dispositivos monitorados
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Dispositivo
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dispositivos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !devices || devices.length === 0 ? (
              <div className="text-center py-12">
                <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Clique no botão acima para adicionar seu primeiro dispositivo
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Coleta</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.hostname || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.device_id}
                      </TableCell>
                      <TableCell className="font-mono">
                        {device.ip_address || '-'}
                      </TableCell>
                      <TableCell>{device.customer_name || '-'}</TableCell>
                      <TableCell>
                        <DeviceStatusBadge status={device.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.last_seen
                          ? formatDistanceToNow(new Date(device.last_seen), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.is_active ? 'default' : 'secondary'}>
                          {device.is_active ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/monitoring/${device.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(device)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(device)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Dialog */}
      <DeviceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={editingDevice}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o dispositivo "{deviceToDelete?.hostname || deviceToDelete?.device_id}"?
              Esta ação não pode ser desfeita e todo o histórico será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
