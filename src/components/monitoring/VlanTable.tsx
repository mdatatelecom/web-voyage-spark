import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MonitoredVlan } from '@/hooks/useMonitoredVlans';
import { Skeleton } from '@/components/ui/skeleton';

interface VlanTableProps {
  vlans: MonitoredVlan[];
  isLoading: boolean;
  onToggleMonitoring: (id: string, isMonitored: boolean) => void;
  isToggling: boolean;
}

export function VlanTable({ vlans, isLoading, onToggleMonitoring, isToggling }: VlanTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!vlans || vlans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma VLAN encontrada. Execute uma coleta para popular os dados.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>VLAN ID</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Interfaces</TableHead>
          <TableHead className="text-center">Monitorar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vlans.map((vlan) => (
          <TableRow key={vlan.id}>
            <TableCell className="font-medium font-mono">
              {vlan.vlan_id}
            </TableCell>
            <TableCell>{vlan.vlan_name || '-'}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(vlan.interfaces) && vlan.interfaces.length > 0 ? (
                  vlan.interfaces.slice(0, 5).map((iface, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {iface}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                {Array.isArray(vlan.interfaces) && vlan.interfaces.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{vlan.interfaces.length - 5}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={vlan.is_monitored}
                onCheckedChange={(checked) => onToggleMonitoring(vlan.id, checked)}
                disabled={isToggling}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
