import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SVGDefs } from './SVGDefs';
import { EquipmentSVG } from './EquipmentSVG';

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

// Helper to normalize equipment position range (handles inverted start/end)
const getEquipmentRange = (eq: Equipment) => {
  const start = Math.min(eq.position_u_start, eq.position_u_end);
  const end = Math.max(eq.position_u_start, eq.position_u_end);
  return { start, end, height: end - start + 1 };
};

export const RackVisualization = ({ sizeU, equipment, onEquipmentClick }: RackVisualizationProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'rear'>('front');
  
  const width = 400;
  const uHeight = 20;
  const height = sizeU * uHeight;

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
      <div className="flex gap-2 mb-2">
        <Button
          variant={view === 'front' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('front')}
        >
          🔵 Frontal
        </Button>
        <Button
          variant={view === 'rear' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('rear')}
        >
          🔴 Traseira
        </Button>
      </div>
      
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="border-2 border-border rounded-lg">
        <SVGDefs />
        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="hsl(var(--card))" />
        
        {/* Render each U position */}
        {uPositions.map((u, index) => {
          const y = index * uHeight;
          const eq = uMap.get(u);
          const range = eq ? getEquipmentRange(eq) : null;
          const isFirstUOfEquipment = eq && range && range.end === u;
          const equipmentHeight = range ? range.height * uHeight : 0;

          return (
            <g key={u}>
              {/* U divider line */}
              <line
                x1="10"
                y1={y}
                x2={width - 10}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              
              {/* U number on the left */}
              <text
                x="20"
                y={y + 15}
                fill="hsl(var(--muted-foreground))"
                fontSize="12"
                fontFamily="monospace"
              >
                U{u}
              </text>

              {/* Equipment block (only render on first U of equipment) */}
              {isFirstUOfEquipment && eq && (
                <TooltipProvider key={eq.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => setHoveredId(eq.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onEquipmentClick?.(eq)}
                        style={{ cursor: 'pointer' }}
                      >
                        <EquipmentSVG
                          type={eq.type}
                          x={60}
                          y={y}
                          width={320}
                          height={equipmentHeight}
                          name={eq.name}
                          manufacturer={eq.manufacturer}
                          model={eq.model}
                          isHovered={hoveredId === eq.id}
                        />
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-bold">{eq.name}</p>
                        <p className="text-sm">Tipo: {getTypeLabel(eq.type)}</p>
                        {eq.manufacturer && <p className="text-sm">Fabricante: {eq.manufacturer}</p>}
                        {eq.model && <p className="text-sm">Modelo: {eq.model}</p>}
                        {eq.ip_address && <p className="text-sm">IP: {eq.ip_address}</p>}
                        {eq.hostname && <p className="text-sm">Hostname: {eq.hostname}</p>}
                        <p className="text-sm">
                          Posição: U{range?.start}-{range?.end} ({range?.height}U)
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </g>
          );
        })}
      </svg>

      {equipment.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-center px-4">
            Rack vazio. Adicione equipamentos para começar.
          </p>
        </div>
      )}
    </div>
  );
};
