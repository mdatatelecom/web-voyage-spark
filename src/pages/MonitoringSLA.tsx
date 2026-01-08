import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllDevicesSLA, useDeviceSLA } from '@/hooks/useDeviceSLA';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Clock, AlertTriangle, TrendingUp, Server, RefreshCw, Wrench } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { ExportButton } from '@/components/export/ExportButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MonitoringSLA() {
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>();
  const { devices } = useMonitoredDevices();
  const { data: allDevicesSLA, isLoading: isLoadingAll } = useAllDevicesSLA(1);
  const { data: deviceSLA, isLoading: isLoadingDevice } = useDeviceSLA(selectedDevice, 3);

  const getSLAColor = (percentage: number) => {
    if (percentage >= 99.9) return 'text-green-600';
    if (percentage >= 99) return 'text-yellow-600';
    if (percentage >= 95) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSLABadge = (percentage: number) => {
    if (percentage >= 99.9) return <Badge className="bg-green-500">Excelente</Badge>;
    if (percentage >= 99) return <Badge className="bg-yellow-500">Bom</Badge>;
    if (percentage >= 95) return <Badge className="bg-orange-500">Regular</Badge>;
    return <Badge variant="destructive">Crítico</Badge>;
  };

  const chartConfig = {
    uptimePercentage: { label: 'Uptime %', color: 'hsl(var(--primary))' },
  };

  const exportData = allDevicesSLA?.map(d => ({
    Dispositivo: d.deviceName,
    'Device ID': d.deviceId,
    'Uptime (%)': d.uptimePercentage,
    'Total Verificações': d.totalChecks,
    'Online': d.onlineChecks,
    'Offline': d.totalChecks - d.onlineChecks
  })) || [];
  
  const exportColumns = ['Dispositivo', 'Device ID', 'Uptime (%)', 'Total Verificações', 'Online', 'Offline'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Award className="h-8 w-8" />
              Relatório de SLA
            </h1>
            <p className="text-muted-foreground">
              Disponibilidade e uptime dos dispositivos monitorados
            </p>
          </div>
          <ExportButton
            data={exportData}
            filename="relatorio-sla"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Server className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dispositivos Ativos</p>
                  <p className="text-2xl font-bold">{allDevicesSLA?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">SLA Médio</p>
                  <p className="text-2xl font-bold">
                    {allDevicesSLA && allDevicesSLA.length > 0
                      ? (allDevicesSLA.reduce((sum, d) => sum + d.uptimePercentage, 0) / allDevicesSLA.length).toFixed(2)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Abaixo do SLA (99%)</p>
                  <p className="text-2xl font-bold">
                    {allDevicesSLA?.filter(d => d.uptimePercentage < 99).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Verificações</p>
                  <p className="text-2xl font-bold">
                    {allDevicesSLA?.reduce((sum, d) => sum + d.totalChecks, 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Devices SLA Table */}
        <Card>
          <CardHeader>
            <CardTitle>SLA por Dispositivo (Último Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAll ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !allDevicesSLA || allDevicesSLA.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum dado de SLA disponível</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verificações</TableHead>
                    <TableHead className="w-[200px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDevicesSLA.map((device) => (
                    <TableRow 
                      key={device.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDevice(device.id)}
                    >
                      <TableCell className="font-medium">{device.deviceName}</TableCell>
                      <TableCell className="font-mono text-sm">{device.deviceId}</TableCell>
                      <TableCell className={`font-bold ${getSLAColor(device.uptimePercentage)}`}>
                        {device.uptimePercentage.toFixed(2)}%
                      </TableCell>
                      <TableCell>{getSLABadge(device.uptimePercentage)}</TableCell>
                      <TableCell>
                        {device.onlineChecks}/{device.totalChecks}
                      </TableCell>
                      <TableCell>
                        <Progress value={device.uptimePercentage} className="h-2" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Device Detail Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhes do Dispositivo</CardTitle>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um dispositivo" />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname || device.device_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {!selectedDevice ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Selecione um dispositivo para ver detalhes</p>
              </div>
            ) : isLoadingDevice ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : deviceSLA ? (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Uptime (3 meses)</p>
                    <p className={`text-2xl font-bold ${getSLAColor(deviceSLA.uptimePercentage)}`}>
                      {deviceSLA.uptimePercentage.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
                    <p className="text-2xl font-bold">
                      {deviceSLA.avgResponseTime ? `${deviceSLA.avgResponseTime}ms` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Incidentes</p>
                    <p className="text-2xl font-bold">{deviceSLA.downtimeIncidents.length}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Verificações</p>
                    <p className="text-2xl font-bold">{deviceSLA.totalChecks}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-muted rounded-lg cursor-help">
                          <div className="flex items-center gap-1">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">MTTR</p>
                          </div>
                          <p className="text-2xl font-bold">
                            {deviceSLA.mttr !== null 
                              ? deviceSLA.mttr < 60 
                                ? `${deviceSLA.mttr} min`
                                : `${Math.floor(deviceSLA.mttr / 60)}h ${deviceSLA.mttr % 60}m`
                              : 'N/A'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">Mean Time To Recovery</p>
                        <p className="text-sm text-muted-foreground">
                          Tempo médio para recuperar de uma falha
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-muted rounded-lg cursor-help">
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">MTBF</p>
                          </div>
                          <p className="text-2xl font-bold">
                            {deviceSLA.mtbf !== null 
                              ? deviceSLA.mtbf < 60 
                                ? `${deviceSLA.mtbf} min`
                                : deviceSLA.mtbf < 1440
                                  ? `${Math.floor(deviceSLA.mtbf / 60)}h ${deviceSLA.mtbf % 60}m`
                                  : `${Math.floor(deviceSLA.mtbf / 1440)}d ${Math.floor((deviceSLA.mtbf % 1440) / 60)}h`
                              : 'N/A'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">Mean Time Between Failures</p>
                        <p className="text-sm text-muted-foreground">
                          Tempo médio entre falhas
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Monthly Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Uptime Mensal</h3>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceSLA.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="uptimePercentage" fill="var(--color-uptimePercentage)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {/* Downtime Incidents */}
                {deviceSLA.downtimeIncidents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Histórico de Quedas</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Início</TableHead>
                          <TableHead>Fim</TableHead>
                          <TableHead>Duração</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deviceSLA.downtimeIncidents.slice(0, 10).map((incident, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {format(incident.startTime, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {incident.endTime 
                                ? format(incident.endTime, "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : <Badge variant="destructive">Em andamento</Badge>
                              }
                            </TableCell>
                            <TableCell>
                              {incident.durationMinutes < 60
                                ? `${incident.durationMinutes} min`
                                : `${Math.floor(incident.durationMinutes / 60)}h ${incident.durationMinutes % 60}min`
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
