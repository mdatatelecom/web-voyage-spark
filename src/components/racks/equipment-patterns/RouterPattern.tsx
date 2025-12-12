import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface RouterPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
}

export const RouterPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
}: RouterPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const portCount = Math.min(Math.floor((width - 120) / 16), 8);

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#166534" : "#14532d"}
        stroke="#15803d"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left panel with logo area */}
      <rect
        x={x + 2}
        y={y + 2}
        width={35}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Router icon */}
      <g transform={`translate(${x + 8}, ${y + 6})`}>
        <rect x={0} y={4} width={20} height={8} fill="#374151" rx="2" />
        <circle cx={5} cy={0} r={2} fill="#64748b" />
        <circle cx={15} cy={0} r={2} fill="#64748b" />
        <line x1={5} y1={2} x2={5} y2={4} stroke="#64748b" strokeWidth="1" />
        <line x1={15} y1={2} x2={15} y2={4} stroke="#64748b" strokeWidth="1" />
      </g>
      
      {/* Status LEDs */}
      <circle cx={x + 19} cy={y + height - 10} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 19} cy={y + height - 20} r={2} fill={ledColors.activity} className={ledColors.animate ? "animate-pulse" : ""} />
      
      {/* Ventilation */}
      <rect x={x + 40} y={y + 2} width={30} height={height - 4} fill="url(#ventPattern)" opacity="0.4" />
      
      {/* Interface section */}
      <rect
        x={x + 75}
        y={y + 3}
        width={width - 125}
        height={height - 6}
        fill="#0d1b2a"
        rx="2"
      />
      
      {/* WAN port */}
      <g transform={`translate(${x + 80}, ${y + 6})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">WAN</text>
        <rect x={0} y={3} width={14} height={height - 16} fill="#1e3a5f" rx="1" stroke="#3b82f6" strokeWidth="0.5" />
        <circle cx={7} cy={height - 14} r={2} fill="#22c55e" className="animate-pulse" />
      </g>
      
      {/* LAN ports */}
      <text x={x + 100} y={y + 6} fill="#64748b" fontSize="5">LAN</text>
      {Array.from({ length: portCount }).map((_, i) => (
        <g key={i} transform={`translate(${x + 100 + i * 16}, ${y + 9})`}>
          <rect x={0} y={0} width={14} height={height - 16} fill="#0f172a" rx="1" stroke="#334155" strokeWidth="0.5" />
          <circle cx={7} cy={height - 18} r={1.5} fill={Math.random() > 0.5 ? "#22c55e" : "#374151"} />
        </g>
      ))}
      
      {/* Console port */}
      <g transform={`translate(${x + width - 65}, ${y + 6})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">CON</text>
        <rect x={0} y={3} width={12} height={height - 16} fill="#0c4a6e" rx="1" />
      </g>
      
      {/* Right panel */}
      <rect
        x={x + width - 48}
        y={y + 2}
        width={46}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Status display */}
      <rect x={x + width - 44} y={y + 4} width={38} height={12} fill="#001a00" rx="1" />
      <text x={x + width - 25} y={y + 13} fill="#00ff00" fontSize="6" textAnchor="middle">
        ROUTING
      </text>
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 44}
            y={y + height - 14}
            width={38}
            height={10}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 25}
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
        y={y + height - 3}
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
