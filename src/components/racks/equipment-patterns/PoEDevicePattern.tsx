import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface PoEDevicePatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  isSplitter?: boolean;
}

export const PoEDevicePattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  isSplitter = false,
}: PoEDevicePatternProps) => {
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
        fill={isHovered ? "#854d0e" : "#713f12"}
        stroke="#ca8a04"
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
      
      {/* PoE label */}
      <rect x={x + 4} y={y + 4} width={34} height={12} fill="#eab308" rx="2" />
      <text x={x + 21} y={y + 13} fill="#1c1917" fontSize="7" textAnchor="middle" fontWeight="bold">
        PoE
      </text>
      
      {/* Type indicator */}
      <text x={x + 21} y={y + 26} fill="#9ca3af" fontSize="5" textAnchor="middle">
        {isSplitter ? 'SPLITTER' : 'INJECTOR'}
      </text>
      
      {/* Status LEDs */}
      <circle cx={x + 14} cy={y + height - 8} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 28} cy={y + height - 8} r={2} fill="#eab308" className="animate-pulse" />
      
      {/* Main diagram area */}
      <rect
        x={x + 45}
        y={y + 2}
        width={width - 100}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      {isSplitter ? (
        // Splitter diagram: PoE IN → Data OUT + Power OUT
        <g transform={`translate(${x + 55}, ${y + 6})`}>
          <text x={0} y={0} fill="#64748b" fontSize="5">PoE IN</text>
          <rect x={0} y={4} width={30} height={height - 18} fill="#1e3a5f" rx="2" />
          <circle cx={15} cy={height / 2 - 4} r={4} fill="#eab308" />
          
          {/* Arrow split */}
          <path 
            d={`M35,${height / 2 - 4} L50,${height / 4} M35,${height / 2 - 4} L50,${height * 0.75 - 8}`} 
            fill="none" 
            stroke="#64748b" 
            strokeWidth="1"
          />
          
          {/* Data OUT */}
          <text x={55} y={0} fill="#64748b" fontSize="5">DATA</text>
          <rect x={55} y={4} width={25} height={(height - 18) / 2 - 4} fill="#1e3a5f" rx="2" />
          <circle cx={67} cy={(height - 18) / 4 + 4} r={3} fill="#22c55e" className="animate-pulse" />
          
          {/* Power OUT */}
          <text x={55} y={(height - 18) / 2 + 8} fill="#64748b" fontSize="5">PWR</text>
          <rect x={55} y={(height - 18) / 2 + 12} width={25} height={(height - 18) / 2 - 8} fill="#dc2626" opacity="0.3" rx="2" />
          <text x={67} y={(height - 18) * 0.75 + 8} fill="#ef4444" fontSize="6" textAnchor="middle">12V</text>
        </g>
      ) : (
        // Injector diagram: Data IN + Power IN → PoE OUT
        <g transform={`translate(${x + 55}, ${y + 6})`}>
          {/* Data IN */}
          <text x={0} y={0} fill="#64748b" fontSize="5">DATA</text>
          <rect x={0} y={4} width={25} height={(height - 18) / 2 - 4} fill="#1e3a5f" rx="2" />
          <circle cx={12} cy={(height - 18) / 4 + 4} r={3} fill="#22c55e" className="animate-pulse" />
          
          {/* Power IN */}
          <text x={0} y={(height - 18) / 2 + 8} fill="#64748b" fontSize="5">48V DC</text>
          <rect x={0} y={(height - 18) / 2 + 12} width={25} height={(height - 18) / 2 - 8} fill="#dc2626" opacity="0.3" rx="2" />
          
          {/* Arrow merge */}
          <path 
            d={`M30,${height / 4} L45,${height / 2 - 4} M30,${height * 0.75 - 8} L45,${height / 2 - 4}`} 
            fill="none" 
            stroke="#64748b" 
            strokeWidth="1"
          />
          
          {/* PoE OUT */}
          <text x={50} y={0} fill="#64748b" fontSize="5">PoE OUT</text>
          <rect x={50} y={4} width={30} height={height - 18} fill="#eab308" opacity="0.2" rx="2" />
          <circle cx={65} cy={height / 2 - 4} r={4} fill="#eab308" />
          <circle cx={65} cy={height - 16} r={2} fill="#22c55e" className="animate-pulse" />
        </g>
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
      
      {/* Power specs */}
      <rect x={x + width - 48} y={y + 4} width={42} height={14} fill="#1e293b" rx="1" />
      <text x={x + width - 27} y={y + 14} fill="#eab308" fontSize="6" textAnchor="middle" fontWeight="bold">
        {isSplitter ? '48V→12V' : '30W MAX'}
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
