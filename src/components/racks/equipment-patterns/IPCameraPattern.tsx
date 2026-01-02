import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface IPCameraPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  isAnalog?: boolean;
}

export const IPCameraPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  isAnalog = false,
}: IPCameraPatternProps) => {
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
        fill={isHovered ? "#1e293b" : "#0f172a"}
        stroke="#334155"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Camera section */}
      <rect
        x={x + 2}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Camera lens icon */}
      <g transform={`translate(${x + 27}, ${y + height / 2})`}>
        <circle cx={0} cy={0} r={12} fill="#1e293b" stroke="#374151" strokeWidth="1" />
        <circle cx={0} cy={0} r={8} fill="#0f172a" />
        <circle cx={0} cy={0} r={4} fill="#374151" />
        <circle cx={-3} cy={-3} r={2} fill="#64748b" opacity="0.5" />
      </g>
      
      {/* IR LED indicator */}
      <circle cx={x + 12} cy={y + 8} r={3} fill="#ef4444" opacity="0.7" className="animate-pulse" />
      
      {/* Status LED */}
      <circle cx={x + 12} cy={y + height - 8} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      
      {/* Info section */}
      <rect
        x={x + 55}
        y={y + 2}
        width={width - 110}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      {/* Resolution indicator */}
      <g transform={`translate(${x + 60}, ${y + 6})`}>
        <rect x={0} y={0} width={40} height={14} fill="#1e293b" rx="2" />
        <text x={20} y={10} fill="#22c55e" fontSize="7" textAnchor="middle" fontWeight="bold">4K</text>
      </g>
      
      {/* Stream indicators */}
      <g transform={`translate(${x + 105}, ${y + 6})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">STREAMS</text>
        <rect x={0} y={4} width={18} height={height - 18} fill="#22c55e" opacity="0.2" rx="1" />
        <text x={9} y={height / 2 - 2} fill="#22c55e" fontSize="6" textAnchor="middle">M</text>
        
        <rect x={22} y={4} width={18} height={height - 18} fill="#3b82f6" opacity="0.2" rx="1" />
        <text x={31} y={height / 2 - 2} fill="#3b82f6" fontSize="6" textAnchor="middle">S</text>
      </g>
      
      {/* Recording status */}
      <g transform={`translate(${x + 150}, ${y + 6})`}>
        <circle cx={8} cy={height / 2 - 4} r={5} fill="#ef4444" className="animate-pulse" />
        <text x={8} y={height - 14} fill="#9ca3af" fontSize="5" textAnchor="middle">REC</text>
      </g>
      
      {/* PoE indicator (only for IP cameras) */}
      {!isAnalog && (
        <g transform={`translate(${x + 175}, ${y + 6})`}>
          <rect x={0} y={0} width={30} height={height - 14} fill="#eab308" opacity="0.1" rx="2" />
          <text x={15} y={10} fill="#eab308" fontSize="6" textAnchor="middle" fontWeight="bold">PoE+</text>
          <text x={15} y={height - 18} fill="#9ca3af" fontSize="5" textAnchor="middle">15W</text>
        </g>
      )}
      
      {/* Analog indicator (only for analog cameras) */}
      {isAnalog && (
        <g transform={`translate(${x + 175}, ${y + 6})`}>
          <rect x={0} y={0} width={30} height={height - 14} fill="#8b5cf6" opacity="0.1" rx="2" />
          <text x={15} y={10} fill="#8b5cf6" fontSize="6" textAnchor="middle" fontWeight="bold">BNC</text>
          <text x={15} y={height - 18} fill="#9ca3af" fontSize="5" textAnchor="middle">Coax</text>
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
      
      {/* Network port (IP) or BNC port (Analog) */}
      {!isAnalog ? (
        <>
          <rect x={x + width - 48} y={y + 6} width={18} height={14} fill="#1e3a5f" rx="1" />
          <circle cx={x + width - 39} cy={y + 24} r={2} fill="#22c55e" className="animate-pulse" />
          <text x={x + width - 39} y={y + 32} fill="#64748b" fontSize="4" textAnchor="middle">LAN</text>
        </>
      ) : (
        <>
          <circle cx={x + width - 39} cy={y + 13} r={6} fill="#1e293b" stroke="#8b5cf6" strokeWidth="1" />
          <circle cx={x + width - 39} cy={y + 13} r={2} fill="#8b5cf6" />
          <text x={x + width - 39} y={y + 26} fill="#64748b" fontSize="4" textAnchor="middle">BNC</text>
        </>
      )}
      
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
