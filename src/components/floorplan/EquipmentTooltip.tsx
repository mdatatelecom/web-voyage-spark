import { Badge } from '@/components/ui/badge';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPE_COLORS } from './equipment-icons';

interface Equipment {
  id: string;
  name: string;
  type: string;
  ip_address?: string | null;
  equipment_status?: string | null;
  model?: string | null;
  manufacturer?: string | null;
}

interface EquipmentTooltipProps {
  equipment: Equipment | undefined;
  customLabel?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: '#22c55e' },
  planned: { label: 'Planejado', color: '#3b82f6' },
  offline: { label: 'Offline', color: '#ef4444' },
  staged: { label: 'Em teste', color: '#f59e0b' },
  failed: { label: 'Falha', color: '#dc2626' },
  decommissioning: { label: 'Desativando', color: '#6b7280' },
};

export function EquipmentTooltip({ equipment, customLabel }: EquipmentTooltipProps) {
  if (!equipment) return null;

  const status = equipment.equipment_status || 'active';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const typeLabel = EQUIPMENT_TYPE_LABELS[equipment.type] || equipment.type;
  const typeColor = EQUIPMENT_TYPE_COLORS[equipment.type] || '#6b7280';

  return (
    <div 
      className="bg-card/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-border/50 max-w-[220px] pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      {/* Arrow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid hsl(var(--border) / 0.5)',
        }}
      />
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%-1px)]"
        style={{
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid hsl(var(--card) / 0.95)',
        }}
      />

      {/* Content */}
      <div className="space-y-2">
        {/* Name */}
        <h4 className="font-semibold text-sm text-foreground leading-tight">
          {customLabel || equipment.name}
        </h4>

        {/* Type Badge */}
        <Badge 
          variant="secondary" 
          className="text-xs font-medium"
          style={{ backgroundColor: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}40` }}
        >
          {typeLabel}
        </Badge>

        {/* IP Address */}
        {equipment.ip_address && (
          <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
            {equipment.ip_address}
          </p>
        )}

        {/* Model & Manufacturer */}
        {(equipment.model || equipment.manufacturer) && (
          <p className="text-xs text-muted-foreground">
            {equipment.manufacturer && <span className="font-medium">{equipment.manufacturer}</span>}
            {equipment.manufacturer && equipment.model && ' • '}
            {equipment.model}
          </p>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          <span 
            className="w-2 h-2 rounded-full animate-pulse" 
            style={{ backgroundColor: statusConfig.color }}
          />
          <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
}
