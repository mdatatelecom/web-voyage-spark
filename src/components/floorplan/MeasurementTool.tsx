import { Group, Line, Circle, Text, Rect } from 'react-konva';

interface MeasurementPoint {
  x: number;
  y: number;
}

interface MeasurementToolProps {
  startPoint: MeasurementPoint | null;
  endPoint: MeasurementPoint | null;
  tempEndPoint?: MeasurementPoint | null;
  scale: number; // pixels per meter (user defined)
  currentZoom: number;
}

export function MeasurementTool({
  startPoint,
  endPoint,
  tempEndPoint,
  scale = 100,
  currentZoom = 1,
}: MeasurementToolProps) {
  if (!startPoint) return null;

  const activeEndPoint = endPoint || tempEndPoint;
  if (!activeEndPoint) {
    // Only show start point marker
    const markerSize = 8 / currentZoom;
    return (
      <Group>
        <Circle
          x={startPoint.x}
          y={startPoint.y}
          radius={markerSize}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={2 / currentZoom}
        />
      </Group>
    );
  }

  // Calculate distance in pixels
  const dx = activeEndPoint.x - startPoint.x;
  const dy = activeEndPoint.y - startPoint.y;
  const distancePixels = Math.sqrt(dx * dx + dy * dy);
  
  // Convert to meters
  const distanceMeters = distancePixels / scale;
  
  // Calculate midpoint for label
  const midX = (startPoint.x + activeEndPoint.x) / 2;
  const midY = (startPoint.y + activeEndPoint.y) / 2;
  
  // Calculate angle for perpendicular label offset
  const angle = Math.atan2(dy, dx);
  const perpOffset = 20 / currentZoom;
  const labelX = midX + Math.cos(angle + Math.PI / 2) * perpOffset;
  const labelY = midY + Math.sin(angle + Math.PI / 2) * perpOffset;
  
  // Dynamic sizes based on zoom
  const markerSize = 8 / currentZoom;
  const strokeWidth = 2 / currentZoom;
  const fontSize = 12 / currentZoom;
  const dashSize = 6 / currentZoom;

  const displayDistance = distanceMeters >= 1 
    ? `${distanceMeters.toFixed(2)} m`
    : `${(distanceMeters * 100).toFixed(1)} cm`;

  return (
    <Group>
      {/* Measurement line */}
      <Line
        points={[startPoint.x, startPoint.y, activeEndPoint.x, activeEndPoint.y]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
        dash={[dashSize, dashSize / 2]}
      />
      
      {/* Start point marker */}
      <Circle
        x={startPoint.x}
        y={startPoint.y}
        radius={markerSize}
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth={strokeWidth}
      />
      
      {/* End point marker */}
      <Circle
        x={activeEndPoint.x}
        y={activeEndPoint.y}
        radius={markerSize}
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth={strokeWidth}
      />
      
      {/* Distance label background */}
      <Rect
        x={labelX - (displayDistance.length * fontSize * 0.3)}
        y={labelY - fontSize * 0.7}
        width={displayDistance.length * fontSize * 0.6 + fontSize}
        height={fontSize * 1.4}
        fill="rgba(0, 0, 0, 0.8)"
        cornerRadius={4 / currentZoom}
      />
      
      {/* Distance label */}
      <Text
        x={labelX}
        y={labelY}
        text={displayDistance}
        fontSize={fontSize}
        fill="#ffffff"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        offsetX={displayDistance.length * fontSize * 0.25}
        offsetY={fontSize * 0.4}
      />
    </Group>
  );
}
