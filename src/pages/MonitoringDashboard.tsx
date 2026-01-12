import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitoringCard } from '@/components/monitoring/MonitoringCard';
import { GrafanaConfigDialog } from '@/components/monitoring/GrafanaConfigDialog';
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { useRefreshDeviceStatus } from '@/hooks/useDeviceStatus';
import { useGrafanaConfig } from '@/hooks/useGrafanaConfig';
import { Activity, Server, CheckCircle, XCircle, RefreshCw, Plus, Settings, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MonitoringDashboard() {
  const navigate = useNavigate();
  const { devices, isLoading } = useMonitoredDevices();
  const { refreshAll } = useRefreshDeviceStatus();
  const { config: grafanaConfig, isLoading: grafanaLoading } = useGrafanaConfig();
  
  const [grafanaDialogOpen, setGrafanaDialogOpen] = useState(false);

  const activeDevices = devices?.filter((d) => d.is_active) || [];
  const onlineCount = activeDevices.filter((d) => d.status === 'online').length;
  const offlineCount = activeDevices.filter((d) => d.status === 'offline').length;

  const handleRefreshAll = () => {
    refreshAll();
  };

  const isGrafanaConfigured = !!grafanaConfig?.grafana_url && !!grafanaConfig?.datasource_uid;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Monitoramento de Rede
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o status dos dispositivos via Grafana/Zabbix
            </p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setGrafanaDialogOpen(true)}
                    className="relative"
                  >
                    <Settings className="h-4 w-4" />
                    {isGrafanaConfigured && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configurar Grafana/Zabbix</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Tudo
            </Button>
            <Button onClick={() => navigate('/monitoring/devices')}>
              <Plus className="h-4 w-4 mr-2" />
              Gerenciar Dispositivos
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Dispositivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{devices?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monitorados Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{activeDevices.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{onlineCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{offlineCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grafana Status Banner */}
        {!grafanaLoading && !isGrafanaConfigured && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Integração Grafana/Zabbix não configurada</p>
                    <p className="text-xs text-muted-foreground">
                      Configure para coletar métricas do Zabbix via Grafana
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGrafanaDialogOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !devices || devices.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione dispositivos para começar o monitoramento
              </p>
              <Button onClick={() => navigate('/monitoring/devices')}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <MonitoringCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>

      {/* Grafana Config Dialog */}
      <GrafanaConfigDialog
        open={grafanaDialogOpen}
        onOpenChange={setGrafanaDialogOpen}
      />
    </AppLayout>
  );
}
