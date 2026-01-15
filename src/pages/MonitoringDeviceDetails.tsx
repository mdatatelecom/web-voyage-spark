import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceStatusBadge } from '@/components/monitoring/DeviceStatusBadge';
import { UptimeChart } from '@/components/monitoring/UptimeChart';
import { DeviceDocumentation } from '@/components/monitoring/DeviceDocumentation';
import { DeviceAlertConfigDialog } from '@/components/monitoring/DeviceAlertConfigDialog';
import { ConfigComparisonDialog } from '@/components/monitoring/ConfigComparisonDialog';
import { GrafanaMetricsPanel } from '@/components/monitoring/GrafanaMetricsPanel';
import { DeviceMetricsCharts } from '@/components/monitoring/DeviceMetricsCharts';
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { useMonitoredInterfaces } from '@/hooks/useMonitoredInterfaces';
import { useMonitoredVlans } from '@/hooks/useMonitoredVlans';
import { useUptimeHistory } from '@/hooks/useUptimeHistory';
import { useDeviceStatus, useRefreshDeviceStatus } from '@/hooks/useDeviceStatus';
import { useDeviceMonitoringStats } from '@/hooks/useDeviceMonitoringStats';
import { 
  ArrowLeft, 
  RefreshCw, 
  Server, 
  FileText, 
  Clock, 
  Bell, 
  GitCompare, 
  BarChart3,
  LineChart,
  Network,
  Layers,
  PanelTop,
} from 'lucide-react';
import { formatUptimeSeconds } from '@/lib/utils';

export default function MonitoringDeviceDetails() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  
  const { devices, isLoading: devicesLoading } = useMonitoredDevices();
  const device = devices?.find((d) => d.id === deviceId) || null;
  
  const { data: history, isLoading: historyLoading } = useUptimeHistory(deviceId || null);
  const { data: status, isFetching: statusFetching } = useDeviceStatus(device);
  const { refreshDevice } = useRefreshDeviceStatus();

  // Buscar interfaces e VLANs reais
  const { interfaces } = useMonitoredInterfaces(deviceId || null);
  const { vlans } = useMonitoredVlans(deviceId || null);
  const { data: stats } = useDeviceMonitoringStats(deviceId || null);

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
                <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Grafana/Zabbix
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {device.vendor} {device.model} • {device.ip_address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {device.external_panel_url && (
              <Button
                variant="outline"
                onClick={() => window.open(device.external_panel_url!, '_blank', 'noopener,noreferrer')}
              >
                <PanelTop className="h-4 w-4 mr-2" />
                Ver Painel
              </Button>
            )}
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
          <CardHeader>
            <CardTitle className="text-lg">Informações do Dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
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
                  {formatUptimeSeconds(device.uptime_raw)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">VLANs</span>
                <p className="font-medium flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {stats?.vlanCount || 0}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Interfaces</span>
                <p className="font-medium flex items-center gap-1">
                  <Network className="h-4 w-4" />
                  {stats?.interfaceCount || 0}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Zabbix Host ID</span>
                <p className="font-mono text-xs">{device.zabbix_host_id || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uptime Chart */}
        <UptimeChart history={history || []} isLoading={historyLoading} />

        {/* Tabs */}
        <Tabs defaultValue="grafana" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grafana" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Grafana/Zabbix
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grafana">
            <GrafanaMetricsPanel
              deviceId={deviceId || ''}
              zabbixHostId={device.zabbix_host_id || ''}
              grafanaDashboardUid={device.grafana_dashboard_uid || ''}
            />
          </TabsContent>

          <TabsContent value="charts">
            <DeviceMetricsCharts
              deviceId={deviceId || ''}
              zabbixHostId={device.zabbix_host_id}
            />
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
