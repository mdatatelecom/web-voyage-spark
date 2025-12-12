import { getEquipmentColor, EQUIPMENT_COLORS } from '@/constants/equipmentColors';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  equipment_status?: string;
}

interface RackMiniVisualizationProps {
  sizeU: number;
  equipment: Equipment[];
}

const getTypeShortLabel = (type: string): string => {
  const labels: Record<string, string> = {
    switch: 'SW',
    switch_poe: 'PoE',
    router: 'RT',
    server: 'SRV',
    patch_panel: 'PP',
    patch_panel_fiber: 'FIB',
    firewall: 'FW',
    storage: 'STG',
    pdu: 'PDU',
    pdu_smart: 'PDU+',
    ups: 'UPS',
    nvr: 'NVR',
    dvr: 'DVR',
    access_point: 'AP',
    kvm: 'KVM',
    olt: 'OLT',
    onu: 'ONU',
    ip_camera: 'CAM',
  };
  return labels[type] || type.substring(0, 3).toUpperCase();
};

export const RackMiniVisualization = ({ sizeU, equipment }: RackMiniVisualizationProps) => {
  const height = 180;
  const width = 100;
  const uHeight = height / sizeU;

  return (
    <svg width={width} height={height} className="border border-border rounded bg-card">
      {/* Rack frame background */}
      <rect x="0" y="0" width={width} height={height} fill="hsl(var(--card))" />
      
      {/* Left rail */}
      <rect x="0" y="0" width="8" height={height} fill="hsl(var(--muted))" />
      {/* Right rail */}
      <rect x={width - 8} y="0" width="8" height={height} fill="hsl(var(--muted))" />
      
      {/* U position guides */}
      {Array.from({ length: sizeU }, (_, i) => (
        <line
          key={i}
          x1="8"
          y1={i * uHeight}
          x2={width - 8}
          y2={i * uHeight}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          opacity="0.5"
        />
      ))}
      
      {/* Render equipment */}
      {equipment.map((eq) => {
        const start = Math.min(eq.position_u_start, eq.position_u_end);
        const end = Math.max(eq.position_u_start, eq.position_u_end);
        const equipHeight = (end - start + 1) * uHeight;
        const y = (sizeU - end) * uHeight;
        const color = getEquipmentColor(eq.type);
        const isActive = eq.equipment_status === 'active' || !eq.equipment_status;
        
        return (
          <g key={eq.id}>
            {/* Equipment body */}
            <rect
              x="10"
              y={y + 1}
              width={width - 20}
              height={Math.max(equipHeight - 2, 4)}
              fill={color}
              rx="2"
              opacity={isActive ? 1 : 0.5}
            />
            
            {/* Equipment bezel/highlight */}
            <rect
              x="10"
              y={y + 1}
              width="4"
              height={Math.max(equipHeight - 2, 4)}
              fill="rgba(255,255,255,0.2)"
              rx="2"
            />
            
            {/* Status LED */}
            <circle
              cx={width - 16}
              cy={y + equipHeight / 2}
              r={2}
              fill={isActive ? '#22c55e' : '#ef4444'}
            />
            
            {/* Type label (if equipment is tall enough) */}
            {equipHeight > 10 && (
              <text
                x={width / 2}
                y={y + equipHeight / 2 + 3}
                fill="white"
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
                style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
              >
                {getTypeShortLabel(eq.type)}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Empty rack indicator */}
      {equipment.length === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          fill="hsl(var(--muted-foreground))"
          fontSize="10"
          textAnchor="middle"
        >
          Vazio
        </text>
      )}
    </svg>
  );
};
