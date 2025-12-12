import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface UPSPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
}

export const UPSPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
}: UPSPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const batteryLevel = 85; // Simulated battery level
  const batteryBars = 10;
  const filledBars = Math.round((batteryLevel / 100) * batteryBars);

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#1e293b" : "#0f172a"}
        stroke="#334155"
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
      
      {/* LCD Display */}
      <rect x={x + 5} y={y + 4} width={44} height={20} fill="#001a00" rx="2" />
      <text x={x + 27} y={y + 12} fill="#00ff00" fontSize="8" textAnchor="middle" fontWeight="bold">
        {batteryLevel}%
      </text>
      <text x={x + 27} y={y + 20} fill="#00aa00" fontSize="5" textAnchor="middle">
        ONLINE
      </text>
      
      {/* Status LEDs */}
      <g transform={`translate(${x + 8}, ${y + 28})`}>
        <circle cx={0} cy={0} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
        <text x={8} y={2} fill="#9ca3af" fontSize="5">PWR</text>
        
        <circle cx={0} cy={10} r={3} fill="#eab308" />
        <text x={8} y={12} fill="#9ca3af" fontSize="5">BAT</text>
        
        <circle cx={0} cy={20} r={3} fill="#22c55e" className="animate-pulse" />
        <text x={8} y={22} fill="#9ca3af" fontSize="5">OUT</text>
      </g>
      
      {/* Battery capacity bars */}
      <rect
        x={x + 55}
        y={y + 4}
        width={width - 110}
        height={height - 8}
        fill="#0d1117"
        rx="2"
      />
      
      {/* Battery bar grid */}
      <g transform={`translate(${x + 60}, ${y + 8})`}>
        {Array.from({ length: batteryBars }).map((_, i) => {
          const barWidth = (width - 130) / batteryBars - 2;
          const isFilled = i < filledBars;
          let fillColor = '#22c55e';
          if (i >= batteryBars * 0.7) fillColor = '#22c55e';
          else if (i >= batteryBars * 0.3) fillColor = '#eab308';
          else fillColor = '#ef4444';
          
          return (
            <rect
              key={i}
              x={i * (barWidth + 2)}
              y={0}
              width={barWidth}
              height={height - 16}
              fill={isFilled ? fillColor : '#1e293b'}
              rx="1"
              opacity={isFilled ? 1 : 0.3}
            />
          );
        })}
      </g>
      
      {/* Wattage display */}
      <text
        x={x + 55 + (width - 110) / 2}
        y={y + height - 6}
        fill="#64748b"
        fontSize="7"
        textAnchor="middle"
      >
        1500VA / 900W
      </text>
      
      {/* Right outlet panel */}
      <rect
        x={x + width - 52}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#1a1a1a"
        rx="2"
      />
      
      {/* Outlets */}
      {Array.from({ length: Math.min(4, Math.floor(height / 15)) }).map((_, i) => (
        <g key={i} transform={`translate(${x + width - 45}, ${y + 6 + i * 12})`}>
          <rect x={0} y={0} width={36} height={10} fill="#0a0a0a" rx="1" stroke="#374151" strokeWidth="0.5" />
          <circle cx={12} cy={5} r={2} fill="#22c55e" className={i < 2 ? "animate-pulse" : ""} />
          <circle cx={24} cy={5} r={2} fill={i < 3 ? "#22c55e" : "#374151"} />
        </g>
      ))}
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + 5}
            y={y + height - 12}
            width={40}
            height={8}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + 25}
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
        {name.substring(0, 30)}
      </text>
    </g>
  );
};
