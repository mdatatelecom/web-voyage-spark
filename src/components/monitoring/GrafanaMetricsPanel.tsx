import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGrafanaIntegration, ZabbixMetric, ZabbixAlert } from '@/hooks/useGrafanaIntegration';
import { useGrafanaConfig } from '@/hooks/useGrafanaConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  MemoryStick, 
  Network, 
  HardDrive,
  Thermometer,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GrafanaMetricsPanelProps {
  deviceId?: string;
  zabbixHostId?: string;
  grafanaDashboardUid?: string;
}

// Map Zabbix severity to color
const severityColors: Record<string, string> = {
  '0': 'bg-gray-500', // Not classified
  '1': 'bg-blue-500', // Information
  '2': 'bg-yellow-500', // Warning
  '3': 'bg-orange-500', // Average
  '4': 'bg-red-500', // High
  '5': 'bg-red-700', // Disaster
};

const severityLabels: Record<string, string> = {
  '0': 'Não classificado',
  '1': 'Informação',
  '2': 'Aviso',
  '3': 'Média',
  '4': 'Alta',
  '5': 'Desastre',
};

// Categorize metrics by type
const categorizeMetric = (key: string): string => {
  if (key.includes('cpu') || key.includes('processor')) return 'cpu';
  if (key.includes('memory') || key.includes('vm.memory') || key.includes('swap')) return 'memory';
  if (key.includes('net.if') || key.includes('ifHC') || key.includes('network')) return 'network';
  if (key.includes('vfs.fs') || key.includes('disk') || key.includes('storage')) return 'disk';
  if (key.includes('sensor') || key.includes('temp')) return 'temperature';
  if (key.includes('uptime') || key.includes('system.uptime')) return 'uptime';
  return 'other';
};

// Format metric value with units
const formatMetricValue = (value: string, units: string): string => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  
  if (units === '%') return `${numValue.toFixed(1)}%`;
  if (units === 'B' || units === 'Bytes') {
    if (numValue > 1073741824) return `${(numValue / 1073741824).toFixed(2)} GB`;
    if (numValue > 1048576) return `${(numValue / 1048576).toFixed(2)} MB`;
    if (numValue > 1024) return `${(numValue / 1024).toFixed(2)} KB`;
    return `${numValue} B`;
  }
  if (units === 'bps') {
    if (numValue > 1000000000) return `${(numValue / 1000000000).toFixed(2)} Gbps`;
    if (numValue > 1000000) return `${(numValue / 1000000).toFixed(2)} Mbps`;
    if (numValue > 1000) return `${(numValue / 1000).toFixed(2)} Kbps`;
    return `${numValue} bps`;
  }
  if (units === 's' || units === 'uptime') {
    const days = Math.floor(numValue / 86400);
    const hours = Math.floor((numValue % 86400) / 3600);
    const minutes = Math.floor((numValue % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }
  
  return units ? `${numValue.toFixed(2)} ${units}` : numValue.toFixed(2);
};

// Get icon for category
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'cpu': return <Cpu className="h-4 w-4" />;
    case 'memory': return <MemoryStick className="h-4 w-4" />;
    case 'network': return <Network className="h-4 w-4" />;
    case 'disk': return <HardDrive className="h-4 w-4" />;
    case 'temperature': return <Thermometer className="h-4 w-4" />;
    case 'uptime': return <Clock className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

export function GrafanaMetricsPanel({ deviceId, zabbixHostId, grafanaDashboardUid }: GrafanaMetricsPanelProps) {
  const { config } = useGrafanaConfig();
  const { 
    metrics, 
    alerts, 
    isLoading, 
    refetchMetrics, 
    refetchAlerts,
    cpuMetric,
    memoryMetric,
  } = useGrafanaIntegration(deviceId, zabbixHostId);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!zabbixHostId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas do Grafana/Zabbix
          </CardTitle>
          <CardDescription>
            Configure o host do Zabbix para visualizar as métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum host Zabbix associado a este dispositivo</p>
            <p className="text-sm mt-1">Edite o dispositivo e selecione um host Zabbix</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas do Grafana/Zabbix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Grafana não configurado</p>
            <p className="text-sm mt-1">Configure a conexão com o Grafana no Dashboard de Monitoramento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchMetrics(), refetchAlerts()]);
    setIsRefreshing(false);
  };

  // Group metrics by category
  const metricsByCategory = (metrics || []).reduce((acc, metric) => {
    const category = categorizeMetric(metric.key_);
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, ZabbixMetric[]>);

  // Category order for display
  const categoryOrder = ['cpu', 'memory', 'disk', 'network', 'uptime', 'temperature', 'other'];
  const categoryLabels: Record<string, string> = {
    cpu: 'CPU',
    memory: 'Memória',
    disk: 'Disco',
    network: 'Rede',
    uptime: 'Uptime',
    temperature: 'Temperatura',
    other: 'Outros',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas do Zabbix
          </CardTitle>
          <CardDescription>
            Dados coletados via Grafana
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {grafanaDashboardUid && config.grafana_url && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href={`${config.grafana_url}/d/${grafanaDashboardUid}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver no Grafana
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="metrics">
              Métricas ({metrics?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alertas ({alerts?.length || 0})
              {(alerts?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {alerts?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* CPU */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm">CPU</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {cpuMetric ? formatMetricValue(cpuMetric.lastvalue, cpuMetric.units) : 'N/A'}
                  </div>
                </div>

                {/* Memory */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MemoryStick className="h-4 w-4" />
                    <span className="text-sm">Memória</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {memoryMetric ? formatMetricValue(memoryMetric.lastvalue, memoryMetric.units) : 'N/A'}
                  </div>
                </div>

                {/* Alerts */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Alertas Ativos</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {alerts?.length || 0}
                  </div>
                </div>

                {/* Total Metrics */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Métricas</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics?.length || 0}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryOrder
                    .filter(cat => metricsByCategory[cat]?.length > 0)
                    .map(category => (
                      <div key={category}>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          {getCategoryIcon(category)}
                          {categoryLabels[category]}
                          <Badge variant="secondary">{metricsByCategory[category].length}</Badge>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {metricsByCategory[category].slice(0, 10).map(metric => (
                            <div 
                              key={metric.itemid} 
                              className="p-3 border rounded-lg text-sm flex justify-between items-center"
                            >
                              <span className="truncate flex-1" title={metric.name}>
                                {metric.name}
                              </span>
                              <span className="font-mono font-medium ml-2">
                                {formatMetricValue(metric.lastvalue, metric.units)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {metricsByCategory[category].length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            +{metricsByCategory[category].length - 10} métricas adicionais
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alerts">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div 
                      key={alert.eventid} 
                      className="p-3 border rounded-lg flex items-start gap-3"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${severityColors[alert.severity] || 'bg-gray-500'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{alert.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline">{severityLabels[alert.severity] || 'Desconhecido'}</Badge>
                          <span>•</span>
                          <span>
                            {format(new Date(parseInt(alert.clock) * 1000), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          {alert.acknowledged === '1' && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary">Reconhecido</Badge>
                            </>
                          )}
                        </div>
                        {alert.tags && alert.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {alert.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag.tag}: {tag.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum alerta ativo</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
