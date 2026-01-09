import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeviceStatusBadge } from '@/components/monitoring/DeviceStatusBadge';
import { InterfaceTable } from '@/components/monitoring/InterfaceTable';
import { VlanTable } from '@/components/monitoring/VlanTable';
import { UptimeChart } from '@/components/monitoring/UptimeChart';
import { DeviceDocumentation } from '@/components/monitoring/DeviceDocumentation';
import { DeviceMetricsHistory } from '@/components/monitoring/DeviceMetricsHistory';
import { DeviceAlertConfigDialog } from '@/components/monitoring/DeviceAlertConfigDialog';
import { ConfigComparisonDialog } from '@/components/monitoring/ConfigComparisonDialog';
import { InterfaceTrafficChart } from '@/components/monitoring/InterfaceTrafficChart';
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { useMonitoredInterfaces } from '@/hooks/useMonitoredInterfaces';
import { useMonitoredVlans } from '@/hooks/useMonitoredVlans';
import { useUptimeHistory } from '@/hooks/useUptimeHistory';
import { useDeviceStatus, useRefreshDeviceStatus } from '@/hooks/useDeviceStatus';
import { ArrowLeft, RefreshCw, Server, Network, Layers, FileText, Clock, Bell, GitCompare, Activity, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonitoringDeviceDetails() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  
  const { devices, isLoading: devicesLoading } = useMonitoredDevices();
  const device = devices?.find((d) => d.id === deviceId) || null;
  
  const { interfaces, isLoading: interfacesLoading, toggleMonitoring: toggleInterface, isToggling: isTogglingInterface } = useMonitoredInterfaces(deviceId || null);
  const { vlans, isLoading: vlansLoading, toggleMonitoring: toggleVlan, isToggling: isTogglingVlan } = useMonitoredVlans(deviceId || null);
  const { data: history, isLoading: historyLoading } = useUptimeHistory(deviceId || null);
  const { data: status, isFetching: statusFetching } = useDeviceStatus(device);
  const { refreshDevice } = useRefreshDeviceStatus();

  if (devicesLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!device) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dispositivo não encontrado</h2>
          <Button onClick={() => navigate('/monitoring')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/monitoring')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{device.hostname || device.device_id}</h1>
                <DeviceStatusBadge status={device.status} size="lg" />
              </div>
              <p className="text-muted-foreground">
                {device.vendor} {device.model} • {device.ip_address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAlertDialogOpen(true)}
              title="Configurar Alertas"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setComparisonDialogOpen(true)}
              title="Comparar Configurações"
            >
              <GitCompare className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => refreshDevice(device.device_id)}
              disabled={statusFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statusFetching ? 'animate-spin' : ''}`} />
              Atualizar Agora
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium">{device.customer_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Device ID</span>
                <p className="font-mono text-xs">{device.device_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime</span>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {device.uptime_raw || '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Interfaces</span>
                <p className="font-medium">{interfaces?.length || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">VLANs</span>
                <p className="font-medium">{vlans?.length || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">sysName</span>
                <p className="font-medium truncate" title={device.sys_name || undefined}>
                  {device.sys_name || '-'}
                </p>
              </div>
            </div>
            
            {/* System Info Section */}
            {(device.sys_description || device.sys_location || device.sys_contact) && (
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                {device.sys_description && (
                  <div>
                    <span className="text-muted-foreground">Descrição SNMP:</span>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                      {device.sys_description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {device.sys_location && (
                    <div>
                      <span className="text-muted-foreground">Localização:</span>
                      <p className="font-medium">{device.sys_location}</p>
                    </div>
                  )}
                  {device.sys_contact && (
                    <div>
                      <span className="text-muted-foreground">Contato:</span>
                      <p className="font-medium">{device.sys_contact}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uptime Chart */}
        <UptimeChart history={history || []} isLoading={historyLoading} />

        {/* Tabs */}
        <Tabs defaultValue="interfaces" className="space-y-4">
          <TabsList>
            <TabsTrigger value="interfaces" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Interfaces
            </TabsTrigger>
            <TabsTrigger value="vlans" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              VLANs
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="traffic" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tráfego
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interfaces">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Interfaces do Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InterfaceTable
                  interfaces={interfaces || []}
                  isLoading={interfacesLoading}
                  onToggleMonitoring={(id, isMonitored) => toggleInterface({ id, is_monitored: isMonitored })}
                  isToggling={isTogglingInterface}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vlans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  VLANs Configuradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VlanTable
                  vlans={vlans || []}
                  isLoading={vlansLoading}
                  onToggleMonitoring={(id, isMonitored) => toggleVlan({ id, is_monitored: isMonitored })}
                  isToggling={isTogglingVlan}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Histórico de Métricas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceMetricsHistory deviceUuid={deviceId || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic">
            <InterfaceTrafficChart deviceUuid={deviceId || ''} />
          </TabsContent>

          <TabsContent value="documentation">
            <DeviceDocumentation
              device={device}
              interfaces={interfaces || []}
              vlans={vlans || []}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <DeviceAlertConfigDialog
          deviceUuid={deviceId || ''}
          deviceName={device.hostname || device.device_id}
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
        />
        <ConfigComparisonDialog
          deviceUuid={deviceId || ''}
          deviceName={device.hostname || device.device_id}
          open={comparisonDialogOpen}
          onOpenChange={setComparisonDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
