interface Equipment {
  id: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
}

interface RackMiniVisualizationProps {
  sizeU: number;
  equipment: Equipment[];
}

const getColorByType = (type: string) => {
  const colors: Record<string, string> = {
    switch: '#3b82f6',
    router: '#10b981',
    server: '#f97316',
    patch_panel: '#6b7280',
    firewall: '#ef4444',
  };
  return colors[type] || '#9ca3af';
};

export const RackMiniVisualization = ({ sizeU, equipment }: RackMiniVisualizationProps) => {
  const height = 150; // Fixed height for mini visualization
  const width = 80;
  const uHeight = height / sizeU;

  return (
    <svg width={width} height={height} className="border border-border rounded">
      <rect x="0" y="0" width={width} height={height} fill="hsl(var(--card))" />
      
      {/* Render equipment */}
      {equipment.map((eq) => {
        const startY = ((sizeU - eq.position_u_end) * uHeight);
        const equipmentHeight = ((eq.position_u_end - eq.position_u_start + 1) * uHeight);
        
        return (
          <rect
            key={eq.id}
            x="5"
            y={startY}
            width={width - 10}
            height={equipmentHeight}
            fill={getColorByType(eq.type)}
            rx="2"
          />
        );
      })}
    </svg>
  );
};
