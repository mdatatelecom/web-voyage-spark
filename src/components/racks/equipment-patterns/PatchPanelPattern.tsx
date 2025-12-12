interface PatchPanelPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  isFiber?: boolean;
  isHovered: boolean;
}

export const PatchPanelPattern = ({ x, y, width, height, name, isFiber, isHovered }: PatchPanelPatternProps) => {
  const portCount = Math.min(48, Math.floor((width - 40) / 10));
  const portRows = height > 18 ? 2 : 1;
  const portsPerRow = Math.ceil(portCount / portRows);
  
  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#525252" : "url(#patchPanelGradient)"}
        stroke="#000"
        strokeWidth="1"
        rx="2"
      />
      
      {/* Metal bezel */}
      <rect
        x={x + 2}
        y={y + 1}
        width={width - 4}
        height={height - 2}
        fill="none"
        stroke="#555"
        strokeWidth="0.5"
        rx="1"
      />
      
      {/* Left label area */}
      <rect
        x={x + 4}
        y={y + 2}
        width={25}
        height={height - 4}
        fill="#333"
        rx="1"
      />
      <text
        x={x + 16}
        y={y + height / 2 + 2}
        fill="#888"
        fontSize="5"
        textAnchor="middle"
        transform={`rotate(-90, ${x + 16}, ${y + height / 2})`}
      >
        {isFiber ? "FIBER" : "UTP"}
      </text>
      
      {/* Port area */}
      {Array.from({ length: portRows }).map((_, rowIndex) => (
        <g key={rowIndex}>
          {Array.from({ length: portsPerRow }).map((_, portIndex) => {
            const portX = x + 35 + portIndex * 10;
            const portY = y + 3 + rowIndex * ((height - 6) / portRows);
            const portHeight = (height - 6) / portRows - 1;
            
            // Alternate colors for visual grouping (every 6 ports)
            const groupIndex = Math.floor(portIndex / 6);
            const portColor = isFiber 
              ? (groupIndex % 2 === 0 ? "#22c55e" : "#3b82f6")
              : "#2d2d2d";
            
            return (
              <g key={portIndex}>
                {/* Port housing */}
                <rect
                  x={portX}
                  y={portY}
                  width={8}
                  height={portHeight}
                  fill={portColor}
                  stroke="#444"
                  strokeWidth="0.3"
                  rx={isFiber ? 1 : 0.5}
                />
                
                {/* Port interior */}
                {!isFiber && (
                  <rect
                    x={portX + 1.5}
                    y={portY + 1.5}
                    width={5}
                    height={portHeight - 3}
                    fill="#1a1a1a"
                    rx="0.5"
                  />
                )}
                
                {/* Fiber LC connector style */}
                {isFiber && (
                  <>
                    <circle cx={portX + 2.5} cy={portY + portHeight / 2} r={1.5} fill="#1a1a1a" />
                    <circle cx={portX + 5.5} cy={portY + portHeight / 2} r={1.5} fill="#1a1a1a" />
                  </>
                )}
                
                {/* Port number label */}
                {portIndex % 6 === 0 && (
                  <text
                    x={portX + 4}
                    y={portY + portHeight + 5}
                    fill="#666"
                    fontSize="4"
                    textAnchor="middle"
                  >
                    {portIndex + 1}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
      
      {/* Right label area */}
      <rect
        x={x + width - 30}
        y={y + 2}
        width={26}
        height={height - 4}
        fill="#333"
        rx="1"
      />
      <text
        x={x + width - 17}
        y={y + height / 2 + 2}
        fill="#888"
        fontSize="6"
        textAnchor="middle"
      >
        {portCount}P
      </text>
      
      {/* Panel name */}
      <text
        x={x + width / 2}
        y={y + height - 1}
        fill="#aaa"
        fontSize="5"
        textAnchor="middle"
      >
        {name.substring(0, 25)}
      </text>
    </g>
  );
};
