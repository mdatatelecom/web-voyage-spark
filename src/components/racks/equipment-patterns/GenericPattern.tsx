import { getEquipmentColor } from '@/constants/equipmentColors';

interface GenericPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: string;
  manufacturer?: string;
  isHovered: boolean;
}

export const GenericPattern = ({ x, y, width, height, name, type, manufacturer, isHovered }: GenericPatternProps) => {
  const baseColor = getEquipmentColor(type);
  
  // Adjust color for hover
  const fillColor = isHovered ? adjustBrightness(baseColor, 20) : baseColor;
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke="#000"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left bezel */}
      <rect
        x={x}
        y={y}
        width={10}
        height={height}
        fill={adjustBrightness(baseColor, -20)}
        rx="3"
      />
      
      {/* Ventilation pattern */}
      <rect
        x={x + 15}
        y={y + 3}
        width={30}
        height={height - 6}
        fill="#1a1a1a"
        rx="2"
      />
      <g>
        {Array.from({ length: Math.floor((height - 6) / 4) }).map((_, i) => (
          <rect
            key={i}
            x={x + 18}
            y={y + 5 + i * 4}
            width={24}
            height={2}
            fill="#333"
            rx="0.5"
          />
        ))}
      </g>
      
      {/* Status LEDs */}
      <g>
        <circle cx={x + 55} cy={y + height / 2} r={3} fill="#22c55e" filter="url(#ledGlow)" />
        {height > 22 && (
          <circle cx={x + 65} cy={y + height / 2} r={3} fill="#3b82f6" filter="url(#ledGlow)" />
        )}
      </g>
      
      {/* Name display */}
      <rect
        x={x + 80}
        y={y + (height - 14) / 2}
        width={width - 140}
        height={14}
        fill="#0a0a0a"
        rx="2"
      />
      <text
        x={x + 80 + (width - 140) / 2}
        y={y + height / 2 + 3}
        fill="#fff"
        fontSize="8"
        fontWeight="bold"
        textAnchor="middle"
      >
        {name.substring(0, 20)}
      </text>
      
      {/* Type label */}
      <text
        x={x + width - 50}
        y={y + height / 2 + 2}
        fill={adjustBrightness(baseColor, 50)}
        fontSize="7"
        textAnchor="middle"
      >
        {getTypeShortLabel(type)}
      </text>
      
      {/* Manufacturer */}
      {manufacturer && (
        <text
          x={x + width - 10}
          y={y + height - 3}
          fill="#666"
          fontSize="5"
          textAnchor="end"
        >
          {manufacturer.substring(0, 8).toUpperCase()}
        </text>
      )}
    </g>
  );
};

// Helper to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Short type labels
function getTypeShortLabel(type: string): string {
  const labels: Record<string, string> = {
    router: 'RTR',
    firewall: 'FW',
    load_balancer: 'LB',
    waf: 'WAF',
    access_point: 'AP',
    ups: 'UPS',
    dvr: 'DVR',
    nvr: 'NVR',
    pabx: 'PABX',
    voip_gateway: 'VoIP',
    modem: 'MDM',
    olt: 'OLT',
    onu: 'ONU',
    kvm: 'KVM',
    console_server: 'CON',
    media_converter: 'MC',
    environment_sensor: 'ENV',
    rack_monitor: 'MON',
    dslam: 'DSLAM',
    msan: 'MSAN',
  };
  return labels[type] || type.substring(0, 4).toUpperCase();
}
