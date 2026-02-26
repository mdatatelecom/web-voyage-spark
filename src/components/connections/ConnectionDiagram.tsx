import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cable, Zap } from 'lucide-react';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';
import { CABLE_TYPES } from '@/constants/cables';
import { EquipmentSVG } from '@/components/racks/EquipmentSVG';
import { SVGDefs } from '@/components/racks/SVGDefs';

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

const EquipmentIllustration = ({ 
  type, name, manufacturer, model, portName, rackName, side 
}: { 
  type: string; name: string; manufacturer?: string; model?: string; 
  portName?: string; rackName?: string; side: 'A' | 'B' 
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Side label */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {side === 'A' ? 'Ponto de Origem' : 'Ponto de Destino'}
        </span>
      </div>
      
      {/* SVG Equipment illustration */}
      <div className="bg-gradient-to-b from-muted/50 to-muted rounded-lg p-3 border">
        <svg width="220" height="50" viewBox="0 0 220 50" className="drop-shadow-md">
          <SVGDefs />
          <EquipmentSVG
            type={type || 'other'}
            x={0}
            y={0}
            width={220}
            height={50}
            name={name || 'N/A'}
            manufacturer={manufacturer}
            isHovered={false}
            status="active"
          />
        </svg>
      </div>
      
      {/* Equipment info */}
      <div className="text-center space-y-1">
        <p className="font-semibold text-sm leading-tight">
          Ponto {side}
        </p>
        <p className="text-xs text-foreground">
          {name} / {portName || 'N/A'}
        </p>
        {model && (
          <p className="text-xs text-muted-foreground">
            Model: {manufacturer ? `${manufacturer} ` : ''}{model}
          </p>
        )}
        {rackName && (
          <p className="text-xs text-muted-foreground">📦 {rackName}</p>
        )}
      </div>
    </div>
  );
};

const CableIllustration = ({ connection, poeInfo }: { connection: any; poeInfo: any }) => {
  const cableLabel = getCableTypeLabel(connection.cable_type);
  const isFiber = connection.cable_type?.startsWith('fiber_');
  const cableColor = connection.cable_color || (isFiber ? '#00bcd4' : '#3b82f6');

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      {/* Cable type label */}
      <div className="flex items-center gap-1.5">
        <Cable className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Link Type: {cableLabel}</span>
      </div>
      
      {/* Cable SVG illustration */}
      <svg width="180" height="24" viewBox="0 0 180 24" className="my-1">
        <defs>
          <linearGradient id="cableGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={cableColor} stopOpacity="0.3" />
            <stop offset="20%" stopColor={cableColor} />
            <stop offset="80%" stopColor={cableColor} />
            <stop offset="100%" stopColor={cableColor} stopOpacity="0.3" />
          </linearGradient>
          <filter id="cableShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={cableColor} floodOpacity="0.3" />
          </filter>
        </defs>
        {/* Connector A */}
        <rect x="0" y="7" width="16" height="10" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.6" />
        <rect x="2" y="9" width="10" height="6" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        {/* Cable line */}
        <line x1="16" y1="12" x2="164" y2="12" stroke="url(#cableGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#cableShadow)" />
        {/* Cable highlights */}
        <line x1="20" y1="10.5" x2="160" y2="10.5" stroke="white" strokeWidth="0.5" opacity="0.3" strokeLinecap="round" />
        {/* Connector B */}
        <rect x="164" y="7" width="16" height="10" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.6" />
        <rect x="168" y="9" width="10" height="6" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      </svg>
      
      {/* Bandwidth / length info */}
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
      
      {/* PoE badge */}
      {poeInfo && (
        <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-xs">
          <Zap className="w-3 h-3 mr-1" />
          {poeInfo.watts}W ({poeInfo.poeClass})
        </Badge>
      )}
    </div>
  );
};

export const ConnectionDiagram = ({ connection }: ConnectionDiagramProps) => {
  const poeInfo = getPoePowerInfo(connection);
  const statusConfig = getStatusConfig(connection.status);

  return (
    <Card className="p-5 overflow-hidden">
      {/* Header with connection code + status */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-bold tracking-tight">{connection.connection_code}</h2>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
      
      {/* Diagram: Point A ← Cable → Point B */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Point A */}
        <EquipmentIllustration
          type={connection.equipment_a_type}
          name={connection.equipment_a_name}
          manufacturer={connection.equipment_a_manufacturer}
          model={connection.equipment_a_model}
          portName={connection.port_a_name}
          rackName={connection.rack_a_name}
          side="A"
        />

        {/* Cable */}
        <CableIllustration connection={connection} poeInfo={poeInfo} />

        {/* Point B */}
        <EquipmentIllustration
          type={connection.equipment_b_type}
          name={connection.equipment_b_name}
          manufacturer={connection.equipment_b_manufacturer}
          model={connection.equipment_b_model}
          portName={connection.port_b_name}
          rackName={connection.rack_b_name}
          side="B"
        />
      </div>

      {/* PoE power flow indicators */}
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
