import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface NVRPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  isNVR?: boolean;
}

export const NVRPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  isNVR = true,
}: NVRPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const channelCount = isNVR ? 16 : 8;
  const hddCount = Math.min(Math.floor((width - 150) / 25), 4);

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#1e3a5f" : "#0c4a6e"}
        stroke="#0369a1"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left control panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Camera icon */}
      <g transform={`translate(${x + 10}, ${y + 6})`}>
        <circle cx={10} cy={6} r={6} fill="none" stroke="#64748b" strokeWidth="1" />
        <circle cx={10} cy={6} r={3} fill="#64748b" />
        <rect x={16} y={3} width={8} height={6} fill="#64748b" rx="1" />
      </g>
      
      {/* Recording status */}
      <circle cx={x + 20} cy={y + 22} r={4} fill="#ef4444" className="animate-pulse" />
      <text x={x + 28} y={y + 24} fill="#9ca3af" fontSize="5">REC</text>
      
      {/* Status LEDs */}
      <circle cx={x + 14} cy={y + height - 12} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 28} cy={y + height - 12} r={2} fill="#22c55e" className="animate-pulse" />
      <circle cx={x + 40} cy={y + height - 12} r={2} fill={ledColors.activity} />
      
      {/* Channel indicators */}
      <rect
        x={x + 55}
        y={y + 2}
        width={70}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      <text x={x + 90} y={y + 10} fill="#64748b" fontSize="6" textAnchor="middle">CHANNELS</text>
      
      <g transform={`translate(${x + 58}, ${y + 14})`}>
        {Array.from({ length: Math.min(channelCount, 16) }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isRecording = Math.random() > 0.3;
          return (
            <circle
              key={i}
              cx={col * 8 + 4}
              cy={row * 10 + 4}
              r={2.5}
              fill={isRecording ? "#22c55e" : "#374151"}
              className={isRecording ? "animate-pulse" : ""}
            />
          );
        })}
      </g>
      
      {/* HDD bay */}
      <rect
        x={x + 130}
        y={y + 2}
        width={width - 185}
        height={height - 4}
        fill="#111827"
        rx="2"
      />
      <text x={x + 135} y={y + 10} fill="#64748b" fontSize="5">HDD</text>
      
      {Array.from({ length: hddCount }).map((_, i) => (
        <g key={i} transform={`translate(${x + 135 + i * 25}, ${y + 14})`}>
          <rect x={0} y={0} width={22} height={height - 22} fill="#1e293b" rx="1" stroke="#374151" strokeWidth="0.5" />
          <rect x={2} y={2} width={18} height={3} fill="#0f172a" rx="0.5" />
          <circle cx={11} cy={height - 28} r={2} fill={Math.random() > 0.2 ? "#22c55e" : "#ef4444"} />
        </g>
      ))}
      
      {/* Right panel */}
      <rect
        x={x + width - 50}
        y={y + 2}
        width={48}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Status display */}
      <rect x={x + width - 46} y={y + 4} width={40} height={14} fill="#001a00" rx="1" />
      <text x={x + width - 26} y={y + 14} fill="#00ff00" fontSize="7" textAnchor="middle" fontWeight="bold">
        {isNVR ? 'NVR' : 'DVR'}
      </text>
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 46}
            y={y + height - 14}
            width={40}
            height={10}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 26}
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
