import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMonitoredDevices } from '@/hooks/useMonitoredDevices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { GitCompare, Plus, Minus, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConfigSnapshot {
  id: string;
  device_uuid: string;
  config_type: string;
  config_data: Record<string, unknown>;
  collected_at: string;
}

export default function ConfigComparison() {
  const { devices } = useMonitoredDevices();
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<string>('interfaces');
  const [snapshot1, setSnapshot1] = useState<string | undefined>();
  const [snapshot2, setSnapshot2] = useState<string | undefined>();

  // Buscar snapshots do dispositivo
  const { data: snapshots, isLoading: isLoadingSnapshots } = useQuery({
    queryKey: ['config-snapshots', selectedDevice, selectedType],
    queryFn: async () => {
      if (!selectedDevice) return [];
      
      const { data, error } = await supabase
        .from('device_config_snapshots')
        .select('*')
        .eq('device_uuid', selectedDevice)
        .eq('config_type', selectedType)
        .order('collected_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ConfigSnapshot[];
    },
    enabled: !!selectedDevice
  });

  // Buscar detalhes dos snapshots selecionados
  const snapshot1Data = snapshots?.find(s => s.id === snapshot1);
  const snapshot2Data = snapshots?.find(s => s.id === snapshot2);

  // Função para comparar dois objetos
  const compareConfigs = (config1: Record<string, unknown>, config2: Record<string, unknown>) => {
    const changes: Array<{
      key: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: unknown;
      newValue?: unknown;
    }> = [];

    const allKeys = new Set([...Object.keys(config1 || {}), ...Object.keys(config2 || {})]);

    for (const key of allKeys) {
      const val1 = config1?.[key];
      const val2 = config2?.[key];

      if (val1 === undefined && val2 !== undefined) {
        changes.push({ key, type: 'added', newValue: val2 });
      } else if (val1 !== undefined && val2 === undefined) {
        changes.push({ key, type: 'removed', oldValue: val1 });
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({ key, type: 'modified', oldValue: val1, newValue: val2 });
      }
    }

    return changes;
  };

  const changes = snapshot1Data && snapshot2Data
    ? compareConfigs(snapshot1Data.config_data, snapshot2Data.config_data)
    : [];

  const formatValue = (value: unknown): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitCompare className="h-8 w-8" />
            Comparação de Configurações
          </h1>
          <p className="text-muted-foreground">
            Compare snapshots de configuração para detectar mudanças
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Dispositivo</label>
                <Select value={selectedDevice} onValueChange={(v) => {
                  setSelectedDevice(v);
                  setSnapshot1(undefined);
                  setSnapshot2(undefined);
                }}>
                  <SelectTrigger>
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
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Config</label>
                <Select value={selectedType} onValueChange={(v) => {
                  setSelectedType(v);
                  setSnapshot1(undefined);
                  setSnapshot2(undefined);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interfaces">Interfaces</SelectItem>
                    <SelectItem value="vlans">VLANs</SelectItem>
                    <SelectItem value="full">Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Snapshot Anterior</label>
                <Select value={snapshot1} onValueChange={setSnapshot1} disabled={!selectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots?.map((snap) => (
                      <SelectItem key={snap.id} value={snap.id}>
                        {format(new Date(snap.collected_at), "dd/MM HH:mm", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Snapshot Atual</label>
                <Select value={snapshot2} onValueChange={setSnapshot2} disabled={!selectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots?.map((snap) => (
                      <SelectItem key={snap.id} value={snap.id}>
                        {format(new Date(snap.collected_at), "dd/MM HH:mm", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultado da Comparação</CardTitle>
            {changes.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  {changes.filter(c => c.type === 'added').length} adicionados
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  {changes.filter(c => c.type === 'removed').length} removidos
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {changes.filter(c => c.type === 'modified').length} modificados
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDevice ? (
              <div className="text-center py-12 text-muted-foreground">
                <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um dispositivo para comparar configurações</p>
              </div>
            ) : isLoadingSnapshots ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !snapshots || snapshots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum snapshot disponível para este dispositivo</p>
                <p className="text-sm">Os snapshots são criados automaticamente durante a coleta</p>
              </div>
            ) : !snapshot1 || !snapshot2 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Selecione dois snapshots para comparar</p>
              </div>
            ) : changes.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <GitCompare className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Sem Alterações</h3>
                <p className="text-muted-foreground">As configurações são idênticas</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Chave</TableHead>
                      <TableHead>Valor Anterior</TableHead>
                      <TableHead>Valor Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((change, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {change.type === 'added' && (
                            <Badge className="bg-green-500">
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionado
                            </Badge>
                          )}
                          {change.type === 'removed' && (
                            <Badge variant="destructive">
                              <Minus className="h-3 w-3 mr-1" />
                              Removido
                            </Badge>
                          )}
                          {change.type === 'modified' && (
                            <Badge className="bg-yellow-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Modificado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{change.key}</TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {change.oldValue !== undefined ? formatValue(change.oldValue) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {change.newValue !== undefined ? formatValue(change.newValue) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Snapshots */}
        {selectedDevice && snapshots && snapshots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Snapshots Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.slice(0, 10).map((snap) => (
                    <TableRow key={snap.id}>
                      <TableCell>
                        {format(new Date(snap.collected_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{snap.config_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {Object.keys(snap.config_data || {}).length} entradas
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
