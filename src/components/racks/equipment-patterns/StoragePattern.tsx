import { getStatusLEDColors } from '@/constants/manufacturerLogos';

interface StoragePatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
}

export const StoragePattern = ({ x, y, width, height, name, manufacturer, isHovered, status }: StoragePatternProps) => {
  const diskCount = Math.min(12, Math.floor((width - 60) / 22));
  const diskRows = height > 35 ? 2 : 1;
  const disksPerRow = Math.ceil(diskCount / diskRows);
  const ledColors = getStatusLEDColors(status);
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#8b5cf6" : "url(#storageGradient)"}
        stroke="#000"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left control panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={35}
        height={height - 4}
        fill="#1a1a2e"
        rx="2"
      />
      
      {/* Control panel LEDs */}
      <g>
        <circle cx={x + 12} cy={y + 8} r={2.5} fill="#22c55e" filter="url(#ledGlow)" className="animate-pulse" />
        <text x={x + 20} y={y + 10} fill="#666" fontSize="5">PWR</text>
        
        <circle cx={x + 12} cy={y + 16} r={2.5} fill="#3b82f6" filter="url(#ledGlow)" />
        <text x={x + 20} y={y + 18} fill="#666" fontSize="5">ACT</text>
        
        {height > 30 && (
          <>
            <circle cx={x + 12} cy={y + 24} r={2.5} fill="#eab308" filter="url(#ledGlow)" />
            <text x={x + 20} y={y + 26} fill="#666" fontSize="5">FLT</text>
          </>
        )}
      </g>
      
      {/* Disk bay area */}
      <rect
        x={x + 42}
        y={y + 2}
        width={width - 90}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Disk slots */}
      {Array.from({ length: diskRows }).map((_, rowIndex) => (
        <g key={rowIndex}>
          {Array.from({ length: disksPerRow }).map((_, diskIndex) => {
            const diskX = x + 46 + diskIndex * 22;
            const diskY = y + 4 + rowIndex * ((height - 8) / diskRows);
            const diskHeight = (height - 8) / diskRows - 2;
            const isActive = (diskIndex + rowIndex) % 4 !== 0;
            
            return (
              <g key={diskIndex}>
                {/* Disk carrier */}
                <rect
                  x={diskX}
                  y={diskY}
                  width={20}
                  height={diskHeight}
                  fill="#1f1f1f"
                  stroke="#333"
                  strokeWidth="0.5"
                  rx="1"
                />
                
                {/* Disk handle */}
                <rect
                  x={diskX + 2}
                  y={diskY + 1}
                  width={16}
                  height={3}
                  fill="#444"
                  rx="1"
                />
                
                {/* Disk LED */}
                <circle
                  cx={diskX + 10}
                  cy={diskY + diskHeight - 4}
                  r={2}
                  fill={isActive ? "#22c55e" : "#374151"}
                  filter={isActive ? "url(#ledGlow)" : undefined}
                />
                
                {/* Disk activity LED */}
                {isActive && (
                  <circle
                    cx={diskX + 15}
                    cy={diskY + diskHeight - 4}
                    r={1.5}
                    fill="#3b82f6"
                    filter="url(#ledGlow)"
                    className="animate-pulse"
                    style={{ animationDuration: `${0.3 + Math.random() * 0.5}s` }}
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}
      
      {/* Right panel */}
      <rect
        x={x + width - 42}
        y={y + 2}
        width={38}
        height={height - 4}
        fill="#1a1a2e"
        rx="2"
      />
      
      {/* Power supply indicators */}
      <g>
        <text x={x + width - 38} y={y + 10} fill="#666" fontSize="5">PSU1</text>
        <circle cx={x + width - 10} cy={y + 8} r={2} fill="#22c55e" filter="url(#ledGlow)" />
        
        {height > 25 && (
          <>
            <text x={x + width - 38} y={y + 20} fill="#666" fontSize="5">PSU2</text>
            <circle cx={x + width - 10} cy={y + 18} r={2} fill="#22c55e" filter="url(#ledGlow)" />
          </>
        )}
      </g>
      
      {/* Name and manufacturer */}
      <text
        x={x + 42 + (width - 90) / 2}
        y={y + height - 2}
        fill="#a78bfa"
        fontSize="6"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        {name.substring(0, 18)}
      </text>
      
      {manufacturer && (
        <text
          x={x + width - 22}
          y={y + height - 4}
          fill="#666"
          fontSize="5"
          textAnchor="middle"
        >
          {manufacturer.substring(0, 6).toUpperCase()}
        </text>
      )}
    </g>
  );
};
