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
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { useMonitoredInterfaces } from '@/hooks/useMonitoredInterfaces';
import { useMonitoredVlans } from '@/hooks/useMonitoredVlans';
import { useUptimeHistory } from '@/hooks/useUptimeHistory';
import { useDeviceStatus, useRefreshDeviceStatus } from '@/hooks/useDeviceStatus';
import { ArrowLeft, RefreshCw, Server, Network, Layers, FileText, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonitoringDeviceDetails() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  
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
          <Button
            variant="outline"
            onClick={() => refreshDevice(device.device_id)}
            disabled={statusFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statusFetching ? 'animate-spin' : ''}`} />
            Atualizar Agora
          </Button>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium">{device.customer_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Device ID</span>
                <p className="font-mono">{device.device_id}</p>
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
            </div>
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

          <TabsContent value="documentation">
            <DeviceDocumentation
              device={device}
              interfaces={interfaces || []}
              vlans={vlans || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
