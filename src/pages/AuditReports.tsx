import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Camera, 
  HardDrive, 
  Network,
  Cable,
  Monitor,
  Loader2
} from 'lucide-react';
import { useAuditStats } from '@/hooks/useAuditStats';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AuditReports() {
  const { data: stats, isLoading, error } = useAuditStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Carregando estatísticas de auditoria...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <XCircle className="w-8 h-8 mr-2" />
        <span>Erro ao carregar estatísticas</span>
      </div>
    );
  }

  const portChartData = [
    { name: 'Disponíveis', value: stats.portStats.available, color: 'hsl(var(--chart-1))' },
    { name: 'Em Uso', value: stats.portStats.inUse, color: 'hsl(var(--chart-2))' },
    { name: 'Reservadas', value: stats.portStats.reserved, color: 'hsl(var(--chart-3))' },
    { name: 'Desabilitadas', value: stats.portStats.disabled, color: 'hsl(var(--chart-4))' }
  ];

  const poeChartData = stats.poeSwitches.map(sw => ({
    name: sw.name.length > 15 ? sw.name.substring(0, 15) + '...' : sw.name,
    usado: sw.poeUsed,
    disponivel: sw.poeAvailable
  }));

  const criticalIssues = 
    stats.camerasWithoutNvr.length +
    stats.poeSwitches.filter(s => s.isCritical).length +
    stats.nvrDvrChannels.filter(n => n.isFull).length +
    stats.faultyConnections.length;

  const warningIssues = 
    stats.testingConnections.length +
    stats.equipmentWithoutIp.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Auditoria</h1>
          <p className="text-muted-foreground">Análise de conformidade e problemas da infraestrutura</p>
        </div>
        <div className="flex gap-2">
          {criticalIssues > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <XCircle className="w-4 h-4 mr-1" />
              {criticalIssues} Críticos
            </Badge>
          )}
          {warningIssues > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {warningIssues} Avisos
            </Badge>
          )}
          {criticalIssues === 0 && warningIssues === 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Tudo OK
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="w-4 h-4" />
              Portas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.portStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.portStats.available} disponíveis • {stats.portStats.inUse} em uso
            </p>
          </CardContent>
        </Card>

        <Card className={stats.camerasWithoutNvr.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Câmeras sem NVR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.camerasWithoutNvr.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.camerasWithoutNvr.length > 0 ? 'Requer atenção' : 'Todas conectadas'}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.poeSwitches.filter(s => s.isCritical).length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Switches PoE Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.poeSwitches.filter(s => s.isCritical).length}</div>
            <p className="text-xs text-muted-foreground">
              Acima de 90% de uso
            </p>
          </CardContent>
        </Card>

        <Card className={stats.faultyConnections.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cable className="w-4 h-4" />
              Conexões Defeituosas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.faultyConnections.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.testingConnections.length} em teste há +7 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Portas</CardTitle>
            <CardDescription>Status de todas as portas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {portChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget PoE por Switch</CardTitle>
            <CardDescription>Consumo vs Disponível (Watts)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {poeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poeChartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="usado" name="Usado (W)" stackId="a" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="disponivel" name="Disponível (W)" stackId="a" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum switch PoE com budget definido
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="cameras" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cameras" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Câmeras ({stats.camerasWithoutNvr.length})
          </TabsTrigger>
          <TabsTrigger value="poe" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            PoE ({stats.poeSwitches.length})
          </TabsTrigger>
          <TabsTrigger value="nvr" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            NVR/DVR ({stats.nvrDvrChannels.length})
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Cable className="w-4 h-4" />
            Conexões ({stats.faultyConnections.length + stats.testingConnections.length})
          </TabsTrigger>
          <TabsTrigger value="noip" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Sem IP ({stats.equipmentWithoutIp.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cameras">
          <Card>
            <CardHeader>
              <CardTitle>Câmeras IP sem Conexão a NVR</CardTitle>
              <CardDescription>Câmeras que precisam ser associadas a um gravador</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.camerasWithoutNvr.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                  Todas as câmeras estão conectadas a NVRs
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Câmera</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.camerasWithoutNvr.map(camera => (
                      <TableRow key={camera.id}>
                        <TableCell className="font-medium">{camera.name}</TableCell>
                        <TableCell>{camera.rackName}</TableCell>
                        <TableCell>{camera.ipAddress || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Sem NVR</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="poe">
          <Card>
            <CardHeader>
              <CardTitle>Status de Budget PoE</CardTitle>
              <CardDescription>Switches com capacidade PoE monitorada</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.poeSwitches.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Nenhum switch PoE com budget definido
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Switch</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Budget Total</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.poeSwitches.map(sw => (
                      <TableRow key={sw.id}>
                        <TableCell className="font-medium">{sw.name}</TableCell>
                        <TableCell>{sw.rackName}</TableCell>
                        <TableCell>{sw.poeBudget}W</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={sw.percentUsed} 
                              className={`w-24 ${sw.isCritical ? '[&>div]:bg-destructive' : ''}`}
                            />
                            <span className="text-sm">{sw.percentUsed}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sw.isCritical ? (
                            <Badge variant="destructive">Crítico</Badge>
                          ) : sw.percentUsed > 70 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Alerta</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nvr">
          <Card>
            <CardHeader>
              <CardTitle>Capacidade de NVR/DVR</CardTitle>
              <CardDescription>Canais disponíveis em gravadores</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.nvrDvrChannels.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Nenhum NVR/DVR cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Canais</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.nvrDvrChannels.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{device.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{device.rackName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(device.usedChannels / device.totalChannels) * 100} 
                              className={`w-24 ${device.isFull ? '[&>div]:bg-destructive' : ''}`}
                            />
                            <span className="text-sm">
                              {device.usedChannels}/{device.totalChannels}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {device.isFull ? (
                            <Badge variant="destructive">Cheio</Badge>
                          ) : device.availableChannels <= 2 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Quase cheio</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {device.availableChannels} livres
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  Conexões Defeituosas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.faultyConnections.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                    Nenhuma conexão defeituosa
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Equipamento A</TableHead>
                        <TableHead>Equipamento B</TableHead>
                        <TableHead>Dias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.faultyConnections.map(conn => (
                        <TableRow key={conn.id}>
                          <TableCell className="font-medium">{conn.connectionCode}</TableCell>
                          <TableCell>{conn.equipmentA}</TableCell>
                          <TableCell>{conn.equipmentB}</TableCell>
                          <TableCell>{conn.daysSinceInstall}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Conexões em Teste há +7 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.testingConnections.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                    Nenhuma conexão em teste prolongado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Equipamento A</TableHead>
                        <TableHead>Equipamento B</TableHead>
                        <TableHead>Dias em Teste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.testingConnections.map(conn => (
                        <TableRow key={conn.id}>
                          <TableCell className="font-medium">{conn.connectionCode}</TableCell>
                          <TableCell>{conn.equipmentA}</TableCell>
                          <TableCell>{conn.equipmentB}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {conn.daysSinceInstall} dias
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="noip">
          <Card>
            <CardHeader>
              <CardTitle>Equipamentos de Rede sem IP</CardTitle>
              <CardDescription>Dispositivos que deveriam ter IP configurado</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.equipmentWithoutIp.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                  Todos os equipamentos têm IP configurado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.equipmentWithoutIp.map(eq => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-medium">{eq.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{eq.type}</Badge>
                        </TableCell>
                        <TableCell>{eq.rackName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Sem IP
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
