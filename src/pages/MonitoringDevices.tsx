import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeviceStatusBadge } from '@/components/monitoring/DeviceStatusBadge';
import { DeviceDialog } from '@/components/monitoring/DeviceDialog';
import { ExternalPanelDialog } from '@/components/monitoring/ExternalPanelDialog';
import { useMonitoredDevices, MonitoredDevice, CreateDeviceInput } from '@/hooks/useMonitoredDevices';
import { useDeviceBatchSync } from '@/hooks/useDeviceBatchSync';
import { useAllDevicesStats } from '@/hooks/useDeviceMonitoringStats';
import { Plus, Pencil, Trash2, Server, ExternalLink, RefreshCw, Network, Layers, PanelTop } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  const { isSyncing, lastSyncTime, syncAllDevices, startAutoSync, stopAutoSync } = useDeviceBatchSync();

  // Buscar estatísticas de todos os dispositivos
  const deviceIds = devices?.map((d) => d.id) || [];
  const { data: deviceStats } = useAllDevicesStats(deviceIds);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MonitoredDevice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<MonitoredDevice | null>(null);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);
  const [selectedDeviceForPanel, setSelectedDeviceForPanel] = useState<MonitoredDevice | null>(null);

  useEffect(() => {
    startAutoSync(60000);
    return () => stopAutoSync();
  }, [startAutoSync, stopAutoSync]);

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

  const handleOpenPanel = (device: MonitoredDevice) => {
    setSelectedDeviceForPanel(device);
    setPanelDialogOpen(true);
  };

  const truncateUptime = (uptime: string | null) => {
    if (!uptime) return '-';
    if (uptime.length > 20) {
      return uptime.substring(0, 20) + '...';
    }
    return uptime;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="h-8 w-8" />
              Gerenciar Dispositivos
            </h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie os dispositivos monitorados via Grafana/Zabbix
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {lastSyncTime && (
              <span className="text-sm text-muted-foreground">
                Sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR })}
              </span>
            )}
            <Button variant="outline" onClick={() => syncAllDevices()} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

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
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead className="text-center">VLANs</TableHead>
                    <TableHead className="text-center">Interfaces</TableHead>
                    <TableHead className="text-center">Painel</TableHead>
                    <TableHead>Última Coleta</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const stats = deviceStats?.[device.id];
                    return (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.hostname || '-'}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {device.vendor || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {device.model || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {device.ip_address || '-'}
                                </code>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{device.ip_address}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{device.customer_name || '-'}</TableCell>
                        <TableCell>
                          <DeviceStatusBadge status={device.status} size="sm" />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm">
                                  {truncateUptime(device.uptime_raw)}
                                </span>
                              </TooltipTrigger>
                              {device.uptime_raw && device.uptime_raw.length > 20 && (
                                <TooltipContent>
                                  <p>{device.uptime_raw}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1">
                            <Layers className="h-3 w-3" />
                            {stats?.vlanCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1">
                            <Network className="h-3 w-3" />
                            {stats?.interfaceCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {device.external_panel_url ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenPanel(device)}
                            >
                              <PanelTop className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {device.last_seen
                            ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: ptBR })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/monitoring/${device.id}`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(device)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(device)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <DeviceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={editingDevice}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      <ExternalPanelDialog
        open={panelDialogOpen}
        onOpenChange={setPanelDialogOpen}
        url={selectedDeviceForPanel?.external_panel_url}
        deviceName={selectedDeviceForPanel?.hostname || selectedDeviceForPanel?.device_id || 'Dispositivo'}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o dispositivo "{deviceToDelete?.hostname || deviceToDelete?.device_id}"?
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
