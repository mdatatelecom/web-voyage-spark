import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface KVMPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  isConsoleServer?: boolean;
}

export const KVMPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  isConsoleServer = false,
}: KVMPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const portCount = isConsoleServer ? 16 : 8;

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#4c1d95" : "#3b0764"}
        stroke="#7c3aed"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={40}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* KVM icon */}
      <g transform={`translate(${x + 8}, ${y + 6})`}>
        {/* Monitor */}
        <rect x={0} y={0} width={12} height={8} fill="#374151" rx="1" />
        <rect x={4} y={9} width={4} height={2} fill="#374151" />
        {/* Keyboard */}
        <rect x={14} y={4} width={10} height={6} fill="#374151" rx="1" />
      </g>
      
      {/* Status LEDs */}
      <circle cx={x + 22} cy={y + height - 10} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <text x={x + 22} y={y + height - 18} fill="#9ca3af" fontSize="5" textAnchor="middle">PWR</text>
      
      {/* Port section */}
      <rect
        x={x + 45}
        y={y + 2}
        width={width - 100}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      <text x={x + 50} y={y + 10} fill="#64748b" fontSize="6">
        {isConsoleServer ? 'SERIAL PORTS' : 'KVM PORTS'}
      </text>
      
      {/* Port indicators */}
      <g transform={`translate(${x + 50}, ${y + 14})`}>
        {Array.from({ length: Math.min(portCount, Math.floor((width - 120) / 14)) }).map((_, i) => {
          const isActive = Math.random() > 0.5;
          const isSelected = i === 0;
          return (
            <g key={i} transform={`translate(${i * 14}, 0)`}>
              <rect
                x={0}
                y={0}
                width={12}
                height={height - 24}
                fill={isSelected ? "#7c3aed" : "#1e293b"}
                rx="1"
                stroke={isActive ? "#22c55e" : "#374151"}
                strokeWidth="0.5"
              />
              <text x={6} y={height - 30} fill={isSelected ? "#fff" : "#9ca3af"} fontSize="5" textAnchor="middle">
                {i + 1}
              </text>
              <circle
                cx={6}
                cy={height - 28}
                r={1.5}
                fill={isActive ? "#22c55e" : "#374151"}
                className={isActive ? "animate-pulse" : ""}
              />
            </g>
          );
        })}
      </g>
      
      {/* Right panel */}
      <rect
        x={x + width - 52}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Local console ports */}
      <text x={x + width - 48} y={y + 10} fill="#64748b" fontSize="5">LOCAL</text>
      <rect x={x + width - 48} y={y + 13} width={18} height={8} fill="#1e3a5f" rx="1" />
      <text x={x + width - 39} y={y + 19} fill="#64748b" fontSize="4" textAnchor="middle">VGA</text>
      
      <rect x={x + width - 28} y={y + 13} width={12} height={8} fill="#1e3a5f" rx="1" />
      <text x={x + width - 22} y={y + 19} fill="#64748b" fontSize="4" textAnchor="middle">KB</text>
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 48}
            y={y + height - 12}
            width={42}
            height={8}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 27}
            y={y + height - 5}
            fill={manufacturerInfo.text}
            fontSize="5"
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
        y={y + height - 2}
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
