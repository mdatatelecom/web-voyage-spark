interface ServerPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
}

export const ServerPattern = ({ x, y, width, height, name, manufacturer, isHovered }: ServerPatternProps) => {
  const fanSize = Math.min(height * 0.6, 14);
  const numFans = height > 30 ? 2 : 1;
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "url(#serverGradientHover)" : "url(#serverGradient)"}
        stroke="#000"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left bezel */}
      <rect
        x={x}
        y={y}
        width={8}
        height={height}
        fill="url(#bezelGradient)"
        rx="3"
      />
      
      {/* Ventilation area */}
      <rect
        x={x + 12}
        y={y + 2}
        width={40}
        height={height - 4}
        fill="#1a1a1a"
        rx="2"
      />
      
      {/* Fans */}
      {Array.from({ length: numFans }).map((_, i) => {
        const fanY = y + (height / (numFans + 1)) * (i + 1);
        return (
          <g key={i}>
            <circle
              cx={x + 32}
              cy={fanY}
              r={fanSize / 2}
              fill="#222"
              stroke="#444"
              strokeWidth="1"
            />
            <g className="animate-spin" style={{ transformOrigin: `${x + 32}px ${fanY}px`, animationDuration: '0.5s' }}>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <line
                  key={angle}
                  x1={x + 32}
                  y1={fanY}
                  x2={x + 32 + Math.cos(angle * Math.PI / 180) * (fanSize / 2 - 2)}
                  y2={fanY + Math.sin(angle * Math.PI / 180) * (fanSize / 2 - 2)}
                  stroke="#666"
                  strokeWidth="1.5"
                />
              ))}
            </g>
            <circle cx={x + 32} cy={fanY} r={2} fill="#333" />
          </g>
        );
      })}
      
      {/* Display panel */}
      <rect
        x={x + 58}
        y={y + (height - 12) / 2}
        width={60}
        height={12}
        fill="#0a0a0a"
        stroke="#333"
        strokeWidth="0.5"
        rx="1"
      />
      <text
        x={x + 88}
        y={y + height / 2 + 3}
        fill="#22c55e"
        fontSize="7"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {name.substring(0, 10)}
      </text>
      
      {/* HDD slots area */}
      {height > 25 && (
        <g>
          {Array.from({ length: Math.min(6, Math.floor((width - 180) / 18)) }).map((_, i) => (
            <g key={i}>
              <rect
                x={x + 130 + i * 18}
                y={y + 3}
                width={15}
                height={height - 6}
                fill="#1a1a1a"
                stroke="#333"
                strokeWidth="0.5"
                rx="1"
              />
              <circle
                cx={x + 137.5 + i * 18}
                cy={y + height - 6}
                r={2}
                fill={i % 3 === 0 ? "#22c55e" : "#374151"}
                filter={i % 3 === 0 ? "url(#ledGlow)" : undefined}
              />
            </g>
          ))}
        </g>
      )}
      
      {/* Status LEDs */}
      <g>
        <circle cx={x + width - 25} cy={y + height / 2 - 4} r={3} fill="#22c55e" filter="url(#ledGlow)" className="animate-pulse" />
        <circle cx={x + width - 15} cy={y + height / 2 - 4} r={3} fill="#3b82f6" filter="url(#ledGlow)" />
        {height > 25 && <circle cx={x + width - 25} cy={y + height / 2 + 6} r={3} fill="#eab308" filter="url(#ledGlow)" />}
      </g>
      
      {/* Manufacturer label */}
      {manufacturer && (
        <text
          x={x + width - 50}
          y={y + height - 4}
          fill="#666"
          fontSize="6"
          fontFamily="sans-serif"
          textAnchor="end"
        >
          {manufacturer.toUpperCase()}
        </text>
      )}
    </g>
  );
};
