import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface FirewallPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  subtype?: 'firewall' | 'waf' | 'load_balancer';
}

export const FirewallPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  subtype = 'firewall',
}: FirewallPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  
  const subtypeColors = {
    firewall: { main: '#dc2626', accent: '#991b1b' },
    waf: { main: '#7c3aed', accent: '#5b21b6' },
    load_balancer: { main: '#0891b2', accent: '#0e7490' },
  };
  
  const colors = subtypeColors[subtype];
  const portCount = Math.min(Math.floor((width - 80) / 12), 8);

  return (
    <g>
      {/* Main body with gradient */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? colors.main : colors.accent}
        stroke="#1e293b"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left security panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={25}
        height={height - 4}
        fill="#1a1a1a"
        rx="2"
      />
      
      {/* Shield icon */}
      <path
        d={`M${x + 14},${y + 8} L${x + 20},${y + 10} L${x + 20},${y + 16} L${x + 14},${y + 20} L${x + 8},${y + 16} L${x + 8},${y + 10} Z`}
        fill={ledColors.power}
        filter="url(#ledGlow)"
        className={ledColors.animate ? "animate-pulse" : ""}
      />
      
      {/* Status LEDs */}
      <circle cx={x + 14} cy={y + height - 12} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 14} cy={y + height - 22} r={2} fill={ledColors.activity} className={ledColors.animate ? "animate-pulse" : ""} />
      
      {/* Ventilation area */}
      <rect x={x + 30} y={y + 2} width={60} height={height - 4} fill="url(#ventPattern)" opacity="0.5" />
      
      {/* Interface section */}
      <rect
        x={x + 95}
        y={y + 4}
        width={width - 140}
        height={height - 8}
        fill="#0f172a"
        rx="2"
      />
      
      {/* Port labels and ports */}
      <text x={x + 100} y={y + 12} fill="#64748b" fontSize="6">WAN</text>
      <rect x={x + 100} y={y + 14} width={18} height={height - 22} fill="#1e3a5f" rx="1" />
      <circle cx={x + 109} cy={y + height - 10} r={2} fill="#22c55e" className="animate-pulse" />
      
      <text x={x + 122} y={y + 12} fill="#64748b" fontSize="6">LAN</text>
      {Array.from({ length: portCount }).map((_, i) => (
        <g key={i}>
          <rect
            x={x + 122 + i * 12}
            y={y + 14}
            width={10}
            height={height - 22}
            fill="#0d1b2a"
            rx="1"
          />
          <circle
            cx={x + 127 + i * 12}
            cy={y + height - 10}
            r={1.5}
            fill={Math.random() > 0.4 ? "#22c55e" : "#374151"}
          />
        </g>
      ))}
      
      {/* Right panel with display */}
      <rect
        x={x + width - 42}
        y={y + 2}
        width={40}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Status display */}
      <rect x={x + width - 38} y={y + 4} width={32} height={10} fill="#001a00" rx="1" />
      <text x={x + width - 22} y={y + 12} fill="#00ff00" fontSize="6" textAnchor="middle">
        {subtype === 'firewall' ? 'SECURE' : subtype === 'waf' ? 'PROTECT' : 'ACTIVE'}
      </text>
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 38}
            y={y + height - 14}
            width={32}
            height={10}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 22}
            y={y + height - 6}
            fill={manufacturerInfo.text}
            fontSize="6"
            textAnchor="middle"
            fontWeight="bold"
          >
            {manufacturerInfo.shortName}
          </text>
        </g>
      )}
      
      {/* Name label */}
      <text
        x={x + width / 2}
        y={y + height - 4}
        fill="#e2e8f0"
        fontSize="8"
        textAnchor="middle"
        fontWeight="bold"
      >
        {name.substring(0, 25)}
      </text>
    </g>
  );
};
