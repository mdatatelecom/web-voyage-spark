interface PDUPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  isSmart?: boolean;
}

export const PDUPattern = ({ x, y, width, height, name, manufacturer, isHovered, isSmart }: PDUPatternProps) => {
  const outletCount = Math.min(8, Math.floor((width - 80) / 25));
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#8b5cf6" : "url(#pduGradient)"}
        stroke="#000"
        strokeWidth="1"
        rx="2"
      />
      
      {/* Left panel - Display area (for smart PDU) */}
      <rect
        x={x + 3}
        y={y + 2}
        width={isSmart ? 50 : 30}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {isSmart ? (
        <>
          {/* LCD Display */}
          <rect
            x={x + 5}
            y={y + 3}
            width={46}
            height={height - 6}
            fill="#001a00"
            rx="1"
          />
          <text x={x + 28} y={y + height / 2 - 2} fill="#22c55e" fontSize="6" textAnchor="middle" fontFamily="monospace">
            {Math.floor(Math.random() * 1000 + 2000)}W
          </text>
          <text x={x + 28} y={y + height / 2 + 5} fill="#22c55e" fontSize="5" textAnchor="middle" fontFamily="monospace">
            {(Math.random() * 5 + 8).toFixed(1)}A
          </text>
        </>
      ) : (
        <>
          {/* Simple status LEDs */}
          <circle cx={x + 12} cy={y + height / 2 - 4} r={3} fill="#22c55e" filter="url(#ledGlow)" />
          <circle cx={x + 24} cy={y + height / 2 - 4} r={3} fill="#3b82f6" filter="url(#ledGlow)" />
          <text x={x + 18} y={y + height / 2 + 6} fill="#666" fontSize="4" textAnchor="middle">PWR</text>
        </>
      )}
      
      {/* Outlets area */}
      <rect
        x={x + (isSmart ? 58 : 38)}
        y={y + 2}
        width={width - (isSmart ? 100 : 80)}
        height={height - 4}
        fill="#1a1a1a"
        rx="2"
      />
      
      {/* Outlets */}
      {Array.from({ length: outletCount }).map((_, i) => {
        const outletX = x + (isSmart ? 62 : 42) + i * 25;
        const isOn = i % 4 !== 3;
        
        return (
          <g key={i}>
            {/* Outlet body */}
            <rect
              x={outletX}
              y={y + 4}
              width={22}
              height={height - 8}
              fill="#2d2d2d"
              stroke="#444"
              strokeWidth="0.5"
              rx="2"
            />
            
            {/* C13/C14 outlet shape */}
            <rect
              x={outletX + 4}
              y={y + 6}
              width={14}
              height={height - 14}
              fill="#0a0a0a"
              rx="1"
            />
            
            {/* Outlet holes */}
            <rect x={outletX + 6} y={y + 8} width={4} height={2} fill="#333" rx="0.5" />
            <rect x={outletX + 12} y={y + 8} width={4} height={2} fill="#333" rx="0.5" />
            <rect x={outletX + 9} y={y + height - 10} width={4} height={2} fill="#333" rx="0.5" />
            
            {/* Status LED per outlet (smart PDU) */}
            {isSmart && (
              <circle
                cx={outletX + 11}
                cy={y + height - 5}
                r={2}
                fill={isOn ? "#22c55e" : "#ef4444"}
                filter="url(#ledGlow)"
              />
            )}
          </g>
        );
      })}
      
      {/* Right panel - Input */}
      <rect
        x={x + width - 38}
        y={y + 2}
        width={34}
        height={height - 4}
        fill="#333"
        rx="2"
      />
      <text x={x + width - 21} y={y + 8} fill="#888" fontSize="5" textAnchor="middle">INPUT</text>
      
      {/* Input connector */}
      <rect
        x={x + width - 32}
        y={y + 10}
        width={22}
        height={height - 14}
        fill="#1a1a1a"
        rx="2"
      />
      
      {/* Grounding symbol */}
      <text x={x + width - 21} y={y + height / 2 + 4} fill="#eab308" fontSize="8" textAnchor="middle">⏚</text>
      
      {/* Name */}
      <text
        x={x + width / 2}
        y={y + height - 1}
        fill="#c4b5fd"
        fontSize="5"
        textAnchor="middle"
      >
        {name.substring(0, 20)}
      </text>
    </g>
  );
};
