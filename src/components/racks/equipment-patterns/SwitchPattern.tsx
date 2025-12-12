import { getStatusLEDColors } from '@/constants/manufacturerLogos';

interface SwitchPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  isPoe?: boolean;
  status?: string;
  activePortIds?: string[];
}

export const SwitchPattern = ({ x, y, width, height, name, manufacturer, isHovered, isPoe, status, activePortIds = [] }: SwitchPatternProps) => {
  const portCount = Math.min(24, Math.floor((width - 80) / 10));
  const portRows = height > 25 ? 2 : 1;
  const portsPerRow = Math.ceil(portCount / portRows);
  const ledColors = getStatusLEDColors(status);
  const activeCount = activePortIds.length;
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "url(#switchGradientHover)" : "url(#switchGradient)"}
        stroke="#000"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left panel with LEDs */}
      <rect
        x={x + 2}
        y={y + 2}
        width={30}
        height={height - 4}
        fill="#0f172a"
        rx="2"
      />
      
      {/* Status LEDs column */}
      <g>
        <circle cx={x + 10} cy={y + height * 0.3} r={2.5} fill={ledColors.power} filter="url(#ledGlow)" className="animate-pulse" />
        <circle cx={x + 22} cy={y + height * 0.3} r={2.5} fill={ledColors.activity} filter="url(#ledGlow)" />
        {height > 22 && (
          <>
            <circle cx={x + 10} cy={y + height * 0.7} r={2.5} fill={isPoe ? "#f59e0b" : "#374151"} filter={isPoe ? "url(#ledGlow)" : undefined} />
            <circle cx={x + 22} cy={y + height * 0.7} r={2.5} fill="#ef4444" />
          </>
        )}
      </g>
      
      {/* Port area */}
      <rect
        x={x + 38}
        y={y + 3}
        width={width - 85}
        height={height - 6}
        fill="#0c1222"
        rx="2"
      />
      
      {/* Ports - use real active port data */}
      {Array.from({ length: portRows }).map((_, rowIndex) => (
        <g key={rowIndex}>
          {Array.from({ length: portsPerRow }).map((_, portIndex) => {
            const portX = x + 42 + portIndex * 10;
            const portY = y + 5 + rowIndex * (height / portRows - 2);
            const globalPortIndex = rowIndex * portsPerRow + portIndex;
            // Port is active if within the active count
            const isActive = globalPortIndex < activeCount;
            
            return (
              <g key={portIndex}>
                {/* Port housing */}
                <rect
                  x={portX}
                  y={portY}
                  width={8}
                  height={height / portRows - 5}
                  fill="#1a1a2e"
                  stroke="#2d3748"
                  strokeWidth="0.5"
                  rx="1"
                />
                {/* Port LED - green and pulsing if active */}
                <circle
                  cx={portX + 4}
                  cy={portY + 2}
                  r={1.5}
                  fill={isActive ? "#22c55e" : "#374151"}
                  filter={isActive ? "url(#ledGlow)" : undefined}
                  className={isActive ? "animate-pulse" : undefined}
                />
              </g>
            );
          })}
        </g>
      ))}
      
      {/* SFP ports area */}
      <rect
        x={x + width - 42}
        y={y + 3}
        width={35}
        height={height - 6}
        fill="#0f172a"
        rx="2"
      />
      
      {/* SFP slots */}
      {Array.from({ length: height > 25 ? 4 : 2 }).map((_, i) => (
        <rect
          key={i}
          x={x + width - 38 + (i % 2) * 15}
          y={y + 5 + Math.floor(i / 2) * (height / 2 - 2)}
          width={12}
          height={height / (height > 25 ? 3 : 2) - 4}
          fill="#0a0a0a"
          stroke="#374151"
          strokeWidth="0.5"
          rx="1"
        />
      ))}
      
      {/* Name label */}
      <text
        x={x + 38 + (width - 85) / 2}
        y={y + height - 3}
        fill="#94a3b8"
        fontSize="7"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        {name.substring(0, 20)}
      </text>
      
      {/* Manufacturer */}
      {manufacturer && (
        <text
          x={x + 16}
          y={y + height - 3}
          fill="#475569"
          fontSize="5"
          fontFamily="sans-serif"
          textAnchor="middle"
        >
          {manufacturer.substring(0, 6).toUpperCase()}
        </text>
      )}
      
      {/* PoE indicator with active port count */}
      {isPoe && (
        <text
          x={x + width - 20}
          y={y + height - 3}
          fill="#f59e0b"
          fontSize="5"
          fontWeight="bold"
        >
          PoE+ {activeCount > 0 ? `(${activeCount})` : ''}
        </text>
      )}
      
      {/* Active ports indicator */}
      {!isPoe && activeCount > 0 && (
        <text
          x={x + width - 20}
          y={y + height - 3}
          fill="#22c55e"
          fontSize="5"
          fontWeight="bold"
        >
          🔌 {activeCount}
        </text>
      )}
    </g>
  );
};
