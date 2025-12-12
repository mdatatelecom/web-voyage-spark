import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface MediaConverterPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  isChassis?: boolean;
}

export const MediaConverterPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  isChassis = false,
}: MediaConverterPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const slotCount = isChassis ? Math.min(Math.floor((width - 100) / 20), 14) : 1;

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#365314" : "#3f6212"}
        stroke="#65a30d"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={35}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Type label */}
      <rect x={x + 4} y={y + 4} width={30} height={10} fill="#1e293b" rx="1" />
      <text x={x + 19} y={y + 11} fill="#e2e8f0" fontSize="5" textAnchor="middle" fontWeight="bold">
        {isChassis ? 'CHASSIS' : 'CONV'}
      </text>
      
      {/* Status LEDs */}
      <circle cx={x + 12} cy={y + height - 10} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 26} cy={y + height - 10} r={2} fill={ledColors.activity} className={ledColors.animate ? "animate-pulse" : ""} />
      
      {/* Converter slots/modules area */}
      <rect
        x={x + 40}
        y={y + 2}
        width={width - 95}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      {isChassis ? (
        // Chassis with multiple slots
        <>
          <text x={x + 45} y={y + 10} fill="#64748b" fontSize="5">MODULES</text>
          <g transform={`translate(${x + 45}, ${y + 14})`}>
            {Array.from({ length: slotCount }).map((_, i) => {
              const hasModule = Math.random() > 0.3;
              return (
                <g key={i} transform={`translate(${i * 20}, 0)`}>
                  <rect
                    x={0}
                    y={0}
                    width={18}
                    height={height - 22}
                    fill={hasModule ? "#1e3a5f" : "#0f172a"}
                    rx="1"
                    stroke={hasModule ? "#3b82f6" : "#1e293b"}
                    strokeWidth="0.5"
                  />
                  {hasModule && (
                    <>
                      <circle cx={5} cy={4} r={2} fill="#22c55e" className="animate-pulse" />
                      <circle cx={13} cy={4} r={2} fill="#3b82f6" />
                      <rect x={3} y={8} width={5} height={height - 34} fill="#22c55e" opacity="0.3" rx="1" />
                      <rect x={10} y={8} width={5} height={height - 34} fill="#1e293b" rx="1" />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </>
      ) : (
        // Single converter
        <>
          <g transform={`translate(${x + 50}, ${y + 6})`}>
            {/* Fiber side */}
            <text x={0} y={0} fill="#64748b" fontSize="5">FIBER</text>
            <rect x={0} y={4} width={20} height={height - 18} fill="#22c55e" opacity="0.2" rx="2" />
            <circle cx={10} cy={height / 2 - 4} r={4} fill="#22c55e" />
            <circle cx={10} cy={height - 16} r={2} fill="#22c55e" className="animate-pulse" />
            
            {/* Arrow */}
            <text x={30} y={height / 2 - 4} fill="#64748b" fontSize="10">⇄</text>
            
            {/* Copper side */}
            <text x={50} y={0} fill="#64748b" fontSize="5">RJ45</text>
            <rect x={50} y={4} width={20} height={height - 18} fill="#1e3a5f" rx="2" />
            <rect x={55} y={8} width={10} height={height - 26} fill="#0f172a" rx="1" />
            <circle cx={60} cy={height - 16} r={2} fill="#22c55e" className="animate-pulse" />
          </g>
        </>
      )}
      
      {/* Right panel */}
      <rect
        x={x + width - 52}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Power indicator */}
      <rect x={x + width - 48} y={y + 4} width={42} height={12} fill="#001a00" rx="1" />
      <text x={x + width - 27} y={y + 12} fill="#00ff00" fontSize="6" textAnchor="middle">
        {isChassis ? 'POWER' : 'LINK'}
      </text>
      
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
