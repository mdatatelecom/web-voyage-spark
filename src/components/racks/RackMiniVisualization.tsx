import { getEquipmentColor } from '@/constants/equipmentColors';

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

// Get status LED color
const getStatusLEDColor = (status?: string) => {
  switch(status) {
    case 'active': return '#22c55e';
    case 'warning': return '#eab308';
    case 'offline': return '#ef4444';
    case 'maintenance': return '#3b82f6';
    case 'failed': return '#ef4444';
    default: return '#22c55e';
  }
};

export const RackMiniVisualization = ({ sizeU, equipment }: RackMiniVisualizationProps) => {
  const height = 200;
  const width = 110;
  const railWidth = 10;
  const uHeight = (height - 8) / sizeU; // Leave padding for frame
  const contentWidth = width - (railWidth * 2) - 4;

  // U markers to show (every 5 U)
  const uMarkers = Array.from({ length: Math.ceil(sizeU / 5) }, (_, i) => (i + 1) * 5).filter(u => u <= sizeU);

  return (
    <svg 
      width={width} 
      height={height} 
      className="drop-shadow-md"
      style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
    >
      <defs>
        {/* Rack background gradient */}
        <linearGradient id="rackBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--muted))" />
        </linearGradient>
        
        {/* Rail metallic gradient */}
        <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4a5568" />
          <stop offset="30%" stopColor="#718096" />
          <stop offset="50%" stopColor="#a0aec0" />
          <stop offset="70%" stopColor="#718096" />
          <stop offset="100%" stopColor="#4a5568" />
        </linearGradient>
        
        {/* Equipment shine effect */}
        <linearGradient id="equipShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        
        {/* Shadow filter */}
        <filter id="equipShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3"/>
        </filter>

        {/* LED glow filter */}
        <filter id="ledGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer frame with shadow */}
      <rect 
        x="0" 
        y="0" 
        width={width} 
        height={height} 
        fill="url(#rackBgGradient)" 
        rx="4"
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />
      
      {/* Left rail with metallic effect */}
      <rect 
        x="2" 
        y="4" 
        width={railWidth} 
        height={height - 8} 
        fill="url(#railGradient)" 
        rx="1"
      />
      
      {/* Right rail with metallic effect */}
      <rect 
        x={width - railWidth - 2} 
        y="4" 
        width={railWidth} 
        height={height - 8} 
        fill="url(#railGradient)" 
        rx="1"
      />
      
      {/* Rail mounting holes */}
      {Array.from({ length: Math.min(sizeU, 20) }, (_, i) => {
        if (i % 3 !== 0) return null;
        const y = 4 + (i * uHeight) + uHeight / 2;
        return (
          <g key={`holes-${i}`}>
            <circle cx="7" cy={y} r="1.5" fill="#2d3748" />
            <circle cx={width - 7} cy={y} r="1.5" fill="#2d3748" />
          </g>
        );
      })}
      
      {/* U position markers on left rail */}
      {uMarkers.map(u => {
        const y = 4 + ((sizeU - u) * uHeight) + uHeight / 2;
        return (
          <text
            key={`marker-${u}`}
            x={railWidth + 4}
            y={y + 3}
            fill="hsl(var(--muted-foreground))"
            fontSize="7"
            fontWeight="500"
          >
            {u}
          </text>
        );
      })}
      
      {/* U position guides (subtle) */}
      {Array.from({ length: sizeU + 1 }, (_, i) => (
        <line
          key={i}
          x1={railWidth + 2}
          y1={4 + i * uHeight}
          x2={width - railWidth - 2}
          y2={4 + i * uHeight}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          strokeDasharray="2,3"
          opacity="0.4"
        />
      ))}
      
      {/* Render equipment */}
      {equipment.map((eq) => {
        const start = Math.min(eq.position_u_start, eq.position_u_end);
        const end = Math.max(eq.position_u_start, eq.position_u_end);
        const equipHeight = (end - start + 1) * uHeight;
        const y = 4 + (sizeU - end) * uHeight;
        const color = getEquipmentColor(eq.type);
        const isActive = eq.equipment_status === 'active' || !eq.equipment_status;
        const statusColor = getStatusLEDColor(eq.equipment_status);
        
        return (
          <g key={eq.id} filter="url(#equipShadow)">
            {/* Equipment body */}
            <rect
              x={railWidth + 4}
              y={y + 1}
              width={contentWidth}
              height={Math.max(equipHeight - 2, 6)}
              fill={color}
              rx="2"
              opacity={isActive ? 1 : 0.6}
            />
            
            {/* Equipment shine/highlight */}
            <rect
              x={railWidth + 4}
              y={y + 1}
              width={contentWidth}
              height={Math.max(equipHeight - 2, 6) / 2}
              fill="url(#equipShine)"
              rx="2"
            />
            
            {/* Left bezel */}
            <rect
              x={railWidth + 4}
              y={y + 1}
              width="3"
              height={Math.max(equipHeight - 2, 6)}
              fill="rgba(255,255,255,0.15)"
              rx="1"
            />
            
            {/* Status LED with glow */}
            <circle
              cx={width - railWidth - 8}
              cy={y + equipHeight / 2}
              r={2.5}
              fill={statusColor}
              filter="url(#ledGlow)"
              opacity={isActive ? 1 : 0.5}
            />
            
            {/* Type label (if equipment is tall enough) */}
            {equipHeight > 12 && (
              <text
                x={railWidth + 4 + contentWidth / 2}
                y={y + equipHeight / 2 + 3}
                fill="white"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {getTypeShortLabel(eq.type)}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Empty rack indicator */}
      {equipment.length === 0 && (
        <g>
          <text
            x={width / 2}
            y={height / 2 - 8}
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
          >
            Vazio
          </text>
          <text
            x={width / 2}
            y={height / 2 + 8}
            fill="hsl(var(--muted-foreground))"
            fontSize="9"
            textAnchor="middle"
            opacity="0.7"
          >
            {sizeU}U disponíveis
          </text>
        </g>
      )}
      
      {/* Capacity indicator at bottom */}
      {equipment.length > 0 && (
        <g>
          <rect
            x={railWidth + 4}
            y={height - 12}
            width={contentWidth}
            height="6"
            fill="hsl(var(--muted))"
            rx="3"
          />
          <rect
            x={railWidth + 4}
            y={height - 12}
            width={contentWidth * (equipment.reduce((acc, eq) => 
              acc + (Math.abs(eq.position_u_end - eq.position_u_start) + 1), 0
            ) / sizeU)}
            height="6"
            fill="hsl(var(--primary))"
            rx="3"
          />
        </g>
      )}
    </svg>
  );
};