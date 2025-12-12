import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface AccessPointPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
}

export const AccessPointPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
}: AccessPointPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#1e40af" : "#1e3a8a"}
        stroke="#3b82f6"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left antenna section */}
      <rect
        x={x + 2}
        y={y + 2}
        width={30}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* WiFi waves icon */}
      <g transform={`translate(${x + 17}, ${y + height / 2})`}>
        <path d="M-10,-5 Q0,-12 10,-5" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
        <path d="M-7,-3 Q0,-8 7,-3" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
        <path d="M-4,-1 Q0,-4 4,-1" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <circle cx={0} cy={2} r={2} fill="#22c55e" />
      </g>
      
      {/* Status LED */}
      <circle cx={x + 17} cy={y + height - 8} r={3} fill={ledColors.power} filter="url(#ledGlow)" className={ledColors.animate ? "animate-pulse" : ""} />
      
      {/* Main display area */}
      <rect
        x={x + 35}
        y={y + 3}
        width={width - 90}
        height={height - 6}
        fill="#0d1117"
        rx="2"
      />
      
      {/* Client indicators */}
      <text x={x + 45} y={y + 12} fill="#64748b" fontSize="6">CLIENTS</text>
      <g transform={`translate(${x + 45}, ${y + 16})`}>
        {Array.from({ length: Math.min(12, Math.floor((width - 120) / 10)) }).map((_, i) => (
          <circle
            key={i}
            cx={i * 10 + 5}
            cy={4}
            r={3}
            fill={Math.random() > 0.4 ? "#22c55e" : "#374151"}
            className={Math.random() > 0.6 ? "animate-pulse" : ""}
          />
        ))}
      </g>
      
      {/* Signal strength bars */}
      <g transform={`translate(${x + width - 100}, ${y + 8})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">2.4GHz</text>
        {Array.from({ length: 4 }).map((_, i) => (
          <rect
            key={i}
            x={i * 6}
            y={4}
            width={4}
            height={4 + i * 2}
            fill="#22c55e"
            opacity={1 - i * 0.15}
          />
        ))}
      </g>
      
      <g transform={`translate(${x + width - 100}, ${y + 22})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">5GHz</text>
        {Array.from({ length: 4 }).map((_, i) => (
          <rect
            key={i}
            x={i * 6}
            y={4}
            width={4}
            height={4 + i * 2}
            fill="#3b82f6"
            opacity={1 - i * 0.15}
          />
        ))}
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
      
      {/* Ports */}
      <rect x={x + width - 48} y={y + 6} width={16} height={height - 16} fill="#1e3a5f" rx="1" />
      <text x={x + width - 40} y={y + height - 8} fill="#64748b" fontSize="5" textAnchor="middle">ETH</text>
      
      {/* PoE indicator */}
      <g transform={`translate(${x + width - 28}, ${y + 10})`}>
        <text x={0} y={0} fill="#eab308" fontSize="6" fontWeight="bold">PoE</text>
        <circle cx={8} cy={8} r={3} fill="#22c55e" />
      </g>
      
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
