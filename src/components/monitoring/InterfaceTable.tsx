import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MonitoredInterface } from '@/hooks/useMonitoredInterfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Wifi, Cable, Layers } from 'lucide-react';

interface InterfaceTableProps {
  interfaces: MonitoredInterface[];
  isLoading: boolean;
  onToggleMonitoring: (id: string, isMonitored: boolean) => void;
  isToggling: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getInterfaceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'ethernet':
      return <Network className="h-4 w-4" />;
    case 'fiber':
      return <Cable className="h-4 w-4" />;
    case 'wireless':
    case 'wifi':
      return <Wifi className="h-4 w-4" />;
    case 'bridge':
    case 'bond':
      return <Layers className="h-4 w-4" />;
    default:
      return <Network className="h-4 w-4" />;
  }
}

export function InterfaceTable({ interfaces, isLoading, onToggleMonitoring, isToggling }: InterfaceTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!interfaces || interfaces.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma interface encontrada. Execute uma coleta para popular os dados.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Interface</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Velocidade</TableHead>
          <TableHead>RX</TableHead>
          <TableHead>TX</TableHead>
          <TableHead>MAC</TableHead>
          <TableHead className="text-center">Monitorar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interfaces.map((iface) => (
          <TableRow key={iface.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {getInterfaceIcon(iface.interface_type)}
                {iface.interface_name}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{iface.interface_type}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={iface.status === 'up' ? 'default' : 'secondary'}
                className={iface.status === 'up' ? 'bg-green-500' : ''}
              >
                {iface.status}
              </Badge>
            </TableCell>
            <TableCell>{iface.speed || '-'}</TableCell>
            <TableCell className="font-mono text-sm">
              {formatBytes(iface.rx_bytes)}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {formatBytes(iface.tx_bytes)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {iface.mac_address || '-'}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={iface.is_monitored}
                onCheckedChange={(checked) => onToggleMonitoring(iface.id, checked)}
                disabled={isToggling}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
