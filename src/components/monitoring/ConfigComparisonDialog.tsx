import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useConfigSnapshots, compareSnapshots, ConfigSnapshot } from '@/hooks/useConfigSnapshots';
import { GitCompare, Plus, Minus, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfigComparisonDialogProps {
  deviceUuid: string;
  deviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigComparisonDialog({
  deviceUuid,
  deviceName,
  open,
  onOpenChange,
}: ConfigComparisonDialogProps) {
  const { data: snapshots, isLoading } = useConfigSnapshots(deviceUuid, 20);
  const [snapshot1Id, setSnapshot1Id] = useState<string>('');
  const [snapshot2Id, setSnapshot2Id] = useState<string>('');

  const snapshot1 = snapshots?.find(s => s.id === snapshot1Id) || null;
  const snapshot2 = snapshots?.find(s => s.id === snapshot2Id) || null;

  const comparison = compareSnapshots(snapshot1, snapshot2);

  const hasChanges =
    comparison.interfaces.added.length > 0 ||
    comparison.interfaces.removed.length > 0 ||
    comparison.interfaces.changed.length > 0 ||
    comparison.vlans.added.length > 0 ||
    comparison.vlans.removed.length > 0 ||
    comparison.vlans.changed.length > 0;

  const formatSnapshotDate = (s: ConfigSnapshot) =>
    format(new Date(s.collected_at), "dd/MM/yyyy HH:mm", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparação de Configurações
          </DialogTitle>
          <DialogDescription>
            Compare snapshots de configuração de {deviceName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !snapshots || snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum snapshot de configuração disponível</p>
            <p className="text-sm">Os snapshots são criados automaticamente durante a coleta</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Snapshot Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Snapshot Anterior</label>
                <Select value={snapshot1Id} onValueChange={setSnapshot1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatSnapshotDate(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Snapshot Atual</label>
                <Select value={snapshot2Id} onValueChange={setSnapshot2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatSnapshotDate(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparison Results */}
            {snapshot1 && snapshot2 && (
              <div className="space-y-4">
                {!hasChanges ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mudança detectada entre os snapshots</p>
                  </div>
                ) : (
                  <>
                    {/* Interface Changes */}
                    <div className="space-y-2">
                      <h3 className="font-medium">Interfaces</h3>
                      <div className="space-y-1">
                        {comparison.interfaces.added.map((name) => (
                          <div key={name} className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-sm">
                            <Plus className="h-4 w-4 text-green-500" />
                            <span>{name}</span>
                            <Badge variant="outline" className="ml-auto text-green-500 border-green-500">
                              NOVA
                            </Badge>
                          </div>
                        ))}
                        {comparison.interfaces.removed.map((name) => (
                          <div key={name} className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-sm">
                            <Minus className="h-4 w-4 text-red-500" />
                            <span>{name}</span>
                            <Badge variant="outline" className="ml-auto text-red-500 border-red-500">
                              REMOVIDA
                            </Badge>
                          </div>
                        ))}
                        {comparison.interfaces.changed.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-sm">
                            <RefreshCw className="h-4 w-4 text-yellow-500" />
                            <span>{change.name}:</span>
                            <span className="text-muted-foreground line-through">{change.before}</span>
                            <span>→</span>
                            <span className="font-medium">{change.after}</span>
                          </div>
                        ))}
                        {comparison.interfaces.added.length === 0 &&
                          comparison.interfaces.removed.length === 0 &&
                          comparison.interfaces.changed.length === 0 && (
                            <p className="text-sm text-muted-foreground p-2">Sem mudanças</p>
                          )}
                      </div>
                    </div>

                    {/* VLAN Changes */}
                    <div className="space-y-2">
                      <h3 className="font-medium">VLANs</h3>
                      <div className="space-y-1">
                        {comparison.vlans.added.map((id) => (
                          <div key={id} className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-sm">
                            <Plus className="h-4 w-4 text-green-500" />
                            <span>VLAN {id}</span>
                            <Badge variant="outline" className="ml-auto text-green-500 border-green-500">
                              NOVA
                            </Badge>
                          </div>
                        ))}
                        {comparison.vlans.removed.map((id) => (
                          <div key={id} className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-sm">
                            <Minus className="h-4 w-4 text-red-500" />
                            <span>VLAN {id}</span>
                            <Badge variant="outline" className="ml-auto text-red-500 border-red-500">
                              REMOVIDA
                            </Badge>
                          </div>
                        ))}
                        {comparison.vlans.changed.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-sm">
                            <RefreshCw className="h-4 w-4 text-yellow-500" />
                            <span>VLAN {change.id}:</span>
                            <span className="text-muted-foreground line-through">{change.before}</span>
                            <span>→</span>
                            <span className="font-medium">{change.after}</span>
                          </div>
                        ))}
                        {comparison.vlans.added.length === 0 &&
                          comparison.vlans.removed.length === 0 &&
                          comparison.vlans.changed.length === 0 && (
                            <p className="text-sm text-muted-foreground p-2">Sem mudanças</p>
                          )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
