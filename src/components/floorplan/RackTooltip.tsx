import React from 'react';
import { RackPosition } from '@/hooks/useRackPositions';
import { Server, Layers, MapPin, Percent } from 'lucide-react';

interface RackTooltipProps {
  position: RackPosition;
}

export const RackTooltip: React.FC<RackTooltipProps> = ({ position }) => {
  const rack = position.rack;
  const occupancy = position.occupancy_percent || 0;
  const usedU = position.used_u || 0;
  const sizeU = rack?.size_u || 42;
  const equipmentCount = position.equipment_count || 0;
  const roomName = rack?.room?.name || 'Sala não definida';

  const getOccupancyColor = (occ: number) => {
    if (occ > 85) return 'bg-destructive';
    if (occ > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getOccupancyTextColor = (occ: number) => {
    if (occ > 85) return 'text-destructive';
    if (occ > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="bg-card/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-border max-w-[260px] animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <div className="p-1.5 bg-primary/10 rounded-md">
          <Server className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground leading-tight">
            {rack?.name || 'Rack'}
          </h4>
          <p className="text-xs text-muted-foreground">{sizeU}U</p>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Occupancy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            <span>Ocupação</span>
          </div>
          <span className={`font-semibold ${getOccupancyTextColor(occupancy)}`}>
            {usedU} / {sizeU}U ({occupancy}%)
          </span>
        </div>

        {/* Equipment Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>Equipamentos</span>
          </div>
          <span className="font-medium text-foreground">{equipmentCount}</span>
        </div>

        {/* Room */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>Sala</span>
          </div>
          <span className="font-medium text-foreground truncate max-w-[120px]">
            {roomName}
          </span>
        </div>
      </div>
      
      {/* Occupancy Bar */}
      <div className="mt-3 pt-2 border-t border-border">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${getOccupancyColor(occupancy)}`}
            style={{ width: `${Math.min(100, occupancy)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
