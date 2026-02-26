import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cable, Zap, ArrowRight } from 'lucide-react';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';
import { CABLE_TYPES } from '@/constants/cables';

interface ConnectionDiagramProps {
  connection: any;
}

const getPoePowerInfo = (connection: any) => {
  const aIsPoeSwitch = connection.equipment_a_type === 'switch_poe';
  const bIsPoeSwitch = connection.equipment_b_type === 'switch_poe';
  const bConsumes = POE_POWER_CONSUMPTION[connection.equipment_b_type] || 0;
  const aConsumes = POE_POWER_CONSUMPTION[connection.equipment_a_type] || 0;

  if (aIsPoeSwitch && bConsumes > 0) {
    return { provider: 'A', consumer: 'B', watts: bConsumes, poeClass: getPoeClass(bConsumes) };
  }
  if (bIsPoeSwitch && aConsumes > 0) {
    return { provider: 'B', consumer: 'A', watts: aConsumes, poeClass: getPoeClass(aConsumes) };
  }
  return null;
};

const getPoeClass = (watts: number): string => {
  if (watts <= 15.4) return '802.3af';
  if (watts <= 30) return '802.3at';
  if (watts <= 60) return '802.3bt T3';
  if (watts <= 100) return '802.3bt T4';
  return 'High Power';
};

const getCableTypeLabel = (type: string) => {
  return CABLE_TYPES.find(t => t.value === type)?.label || type;
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Ativo', variant: 'default' },
    inactive: { label: 'Inativo', variant: 'secondary' },
    testing: { label: 'Testando', variant: 'outline' },
    faulty: { label: 'Defeituoso', variant: 'destructive' },
    reserved: { label: 'Reservado', variant: 'outline' },
  };
  return configs[status] || { label: status, variant: 'secondary' as const };
};

export const ConnectionDiagram = ({ connection }: ConnectionDiagramProps) => {
  const poeInfo = getPoePowerInfo(connection);
  const statusConfig = getStatusConfig(connection.status);
  const cableLabel = getCableTypeLabel(connection.cable_type);

  return (
    <Card className="p-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-bold tracking-tight">{connection.connection_code}</h2>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {/* Diagram: Point A → Cable → Point B */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Point A */}
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Ponto de Origem</span>
          <p className="font-semibold text-sm">Ponto A</p>
          <p className="text-xs text-foreground">
            {connection.equipment_a_name} / {connection.port_a_name || 'N/A'}
          </p>
          {connection.rack_a_name && (
            <p className="text-xs text-muted-foreground">📦 {connection.rack_a_name}</p>
          )}
        </div>

        {/* Cable */}
        <div className="flex flex-col items-center justify-center gap-2 py-2">
          <div className="flex items-center gap-1.5">
            <Cable className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{cableLabel}</span>
          </div>
          <ArrowRight className="w-8 h-8 text-muted-foreground" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {connection.cable_length_meters && (
              <span>Comprimento: {connection.cable_length_meters}m</span>
            )}
            {connection.cable_color && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: connection.cable_color }} />
                <span>Cor</span>
              </div>
            )}
          </div>
          {poeInfo && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-xs">
              <Zap className="w-3 h-3 mr-1" />
              {poeInfo.watts}W ({poeInfo.poeClass})
            </Badge>
          )}
        </div>

        {/* Point B */}
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Ponto de Destino</span>
          <p className="font-semibold text-sm">Ponto B</p>
          <p className="text-xs text-foreground">
            {connection.equipment_b_name} / {connection.port_b_name || 'N/A'}
          </p>
          {connection.rack_b_name && (
            <p className="text-xs text-muted-foreground">📦 {connection.rack_b_name}</p>
          )}
        </div>
      </div>

      {/* PoE power flow */}
      {poeInfo && (
        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          {poeInfo.provider === 'A' && (
            <span className="text-yellow-600 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Ponto A fornece PoE → Ponto B recebe {poeInfo.watts}W
            </span>
          )}
          {poeInfo.provider === 'B' && (
            <span className="text-yellow-600 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Ponto B fornece PoE → Ponto A recebe {poeInfo.watts}W
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
