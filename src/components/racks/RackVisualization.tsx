import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SVGDefs } from './SVGDefs';
import { EquipmentSVG } from './EquipmentSVG';
import { useActivePortsByRack } from '@/hooks/useActivePortsByRack';
import { CheckCircle, AlertTriangle, AlertCircle, Wrench, Activity } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
  ip_address?: string;
  hostname?: string;
  mount_side?: string;
  equipment_status?: string;
}

interface RackVisualizationProps {
  rackId: string;
  sizeU: number;
  equipment: Equipment[];
  onEquipmentClick?: (equipment: Equipment) => void;
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    switch: 'Switch',
    switch_poe: 'Switch PoE',
    router: 'Roteador',
    server: 'Servidor',
    patch_panel: 'Patch Panel',
    patch_panel_fiber: 'Patch Panel Fibra',
    firewall: 'Firewall',
    storage: 'Storage',
    pdu: 'PDU',
    pdu_smart: 'PDU Smart',
    ups: 'UPS',
    dvr: 'DVR',
    nvr: 'NVR',
    cable_organizer_horizontal: 'Organizador Horizontal',
    cable_organizer_vertical: 'Organizador Vertical',
    brush_panel: 'Brush Panel',
    fixed_shelf: 'Bandeja Fixa',
  };
  return labels[type] || type;
};

// Status configuration
const getStatusConfig = (status?: string) => {
  switch(status) {
    case 'active':
      return { 
        color: 'hsl(var(--status-ok))', 
        label: 'Operacional', 
        icon: CheckCircle,
        variant: 'default' as const,
        bgClass: 'bg-[hsl(var(--status-ok))]'
      };
    case 'warning':
      return { 
        color: 'hsl(var(--status-warning))', 
        label: 'Atenção', 
        icon: AlertTriangle,
        variant: 'secondary' as const,
        bgClass: 'bg-[hsl(var(--status-warning))]'
      };
    case 'offline':
    case 'failed':
      return { 
        color: 'hsl(var(--status-error))', 
        label: 'Offline', 
        icon: AlertCircle,
        variant: 'destructive' as const,
        bgClass: 'bg-[hsl(var(--status-error))]'
      };
    case 'maintenance':
      return { 
        color: 'hsl(var(--status-info))', 
        label: 'Manutenção', 
        icon: Wrench,
        variant: 'outline' as const,
        bgClass: 'bg-[hsl(var(--status-info))]'
      };
    default:
      return { 
        color: 'hsl(var(--status-ok))', 
        label: 'Operacional', 
        icon: CheckCircle,
        variant: 'default' as const,
        bgClass: 'bg-[hsl(var(--status-ok))]'
      };
  }
};

// Helper to normalize equipment position range (handles inverted start/end)
const getEquipmentRange = (eq: Equipment) => {
  const start = Math.min(eq.position_u_start, eq.position_u_end);
  const end = Math.max(eq.position_u_start, eq.position_u_end);
  return { start, end, height: end - start + 1 };
};

export const RackVisualization = ({ rackId, sizeU, equipment, onEquipmentClick }: RackVisualizationProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'rear'>('front');
  
  // Fetch active ports for this rack in realtime
  const { getActivePortIdsForEquipment } = useActivePortsByRack(rackId);
  
  const width = 420;
  const uHeight = 22;
  const height = sizeU * uHeight;
  const leftMargin = 50;

  // Filter equipment by current view
  const filteredEquipment = equipment.filter(eq => {
    const mountSide = eq.mount_side || 'front';
    return mountSide === view || mountSide === 'both';
  });

  // Create a map of which equipment is at each U position (using normalized range)
  const uMap = new Map<number, Equipment>();
  filteredEquipment.forEach((eq) => {
    const { start, end } = getEquipmentRange(eq);
    for (let u = start; u <= end; u++) {
      uMap.set(u, eq);
    }
  });

  // Generate array of U positions from top to bottom (sizeU to 1)
  const uPositions = Array.from({ length: sizeU }, (_, i) => sizeU - i);

  return (
    <div className="relative">
      {/* View Toggle */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={view === 'front' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('front')}
          className="gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Frontal
        </Button>
        <Button
          variant={view === 'rear' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('rear')}
          className="gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-red-500" />
          Traseira
        </Button>
      </div>
      
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        className="border-2 border-border rounded-lg shadow-sm bg-card"
      >
        <SVGDefs />
        
        {/* Background with subtle gradient */}
        <defs>
          <linearGradient id="rackBg2d" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--card))" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#rackBg2d)" />
        
        {/* Left rail background */}
        <rect x="0" y="0" width={leftMargin - 5} height={height} fill="hsl(var(--muted))" opacity="0.3" />
        
        {/* Render each U position */}
        {uPositions.map((u, index) => {
          const y = index * uHeight;
          const eq = uMap.get(u);
          const range = eq ? getEquipmentRange(eq) : null;
          const isFirstUOfEquipment = eq && range && range.end === u;
          const equipmentHeight = range ? range.height * uHeight : 0;
          
          // Get active port IDs for this equipment
          const activePortIds = eq ? getActivePortIdsForEquipment(eq.id) : [];
          const statusConfig = eq ? getStatusConfig(eq.equipment_status) : null;

          return (
            <g key={u}>
              {/* U divider line */}
              <line
                x1={leftMargin - 5}
                y1={y}
                x2={width - 5}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                opacity="0.5"
              />
              
              {/* U number on the left with better styling */}
              <rect
                x="2"
                y={y + 2}
                width={leftMargin - 10}
                height={uHeight - 4}
                fill={eq ? 'hsl(var(--primary))' : 'transparent'}
                opacity={eq ? 0.1 : 0}
                rx="2"
              />
              <text
                x="20"
                y={y + uHeight / 2 + 4}
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
                fontFamily="'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
                textAnchor="middle"
                fontWeight={eq ? "600" : "400"}
              >
                U{u}
              </text>

              {/* Equipment block (only render on first U of equipment) */}
              {isFirstUOfEquipment && eq && statusConfig && (
                <TooltipProvider key={eq.id}>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => setHoveredId(eq.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onEquipmentClick?.(eq)}
                        style={{ cursor: 'pointer' }}
                      >
                        <EquipmentSVG
                          type={eq.type}
                          x={leftMargin}
                          y={y}
                          width={width - leftMargin - 10}
                          height={equipmentHeight}
                          name={eq.name}
                          manufacturer={eq.manufacturer}
                          isHovered={hoveredId === eq.id}
                          status={eq.equipment_status}
                          activePortIds={activePortIds}
                        />
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm p-4 space-y-3">
                      {/* Header with name and status */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-base">{eq.name}</p>
                        <Badge 
                          variant={statusConfig.variant}
                          className="gap-1"
                        >
                          <statusConfig.icon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>
                          <span className="ml-1 font-medium">{getTypeLabel(eq.type)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Posição:</span>
                          <span className="ml-1 font-medium font-mono">U{range?.start}-U{range?.end}</span>
                        </div>
                        {eq.manufacturer && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Fabricante:</span>
                            <span className="ml-1 font-medium">{eq.manufacturer}</span>
                          </div>
                        )}
                        {eq.model && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Modelo:</span>
                            <span className="ml-1 font-medium">{eq.model}</span>
                          </div>
                        )}
                        {eq.ip_address && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">IP:</span>
                            <code className="ml-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {eq.ip_address}
                            </code>
                          </div>
                        )}
                        {eq.hostname && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Hostname:</span>
                            <code className="ml-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {eq.hostname}
                            </code>
                          </div>
                        )}
                      </div>
                      
                      {/* Active ports indicator */}
                      {activePortIds.length > 0 && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2 text-[hsl(var(--status-ok))]">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {activePortIds.length} porta(s) ativa(s)
                            </span>
                          </div>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </g>
          );
        })}
      </svg>

      {equipment.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg border">
            <p className="text-muted-foreground font-medium">
              Rack vazio
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Adicione equipamentos para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};