import { Group, Line, Circle, Text, Rect } from 'react-konva';

interface MeasurementPoint {
  x: number;
  y: number;
}

interface MeasurementToolProps {
  points: MeasurementPoint[];
  tempEndPoint?: MeasurementPoint | null;
  scale: number; // pixels per meter (user defined)
  currentZoom: number;
}

export function MeasurementTool({
  points,
  tempEndPoint,
  scale = 100,
  currentZoom = 1,
}: MeasurementToolProps) {
  if (points.length === 0) return null;

  // Dynamic sizes based on zoom
  const markerSize = 8 / currentZoom;
  const strokeWidth = 2 / currentZoom;
  const fontSize = 12 / currentZoom;
  const dashSize = 6 / currentZoom;

  // Calculate total distance
  let totalDistanceMeters = 0;
  const segments: { start: MeasurementPoint; end: MeasurementPoint; distance: number }[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    const distanceMeters = distancePixels / scale;
    totalDistanceMeters += distanceMeters;
    segments.push({ start, end, distance: distanceMeters });
  }

  // If there's a temp point, add it as the last segment
  const lastPoint = points[points.length - 1];
  let tempSegment: { start: MeasurementPoint; end: MeasurementPoint; distance: number } | null = null;
  
  if (tempEndPoint && points.length > 0) {
    const dx = tempEndPoint.x - lastPoint.x;
    const dy = tempEndPoint.y - lastPoint.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    const distanceMeters = distancePixels / scale;
    tempSegment = { start: lastPoint, end: tempEndPoint, distance: distanceMeters };
  }

  const formatDistance = (meters: number) => {
    if (meters >= 1) {
      return `${meters.toFixed(2)} m`;
    }
    return `${(meters * 100).toFixed(1)} cm`;
  };

  const renderSegment = (
    segment: { start: MeasurementPoint; end: MeasurementPoint; distance: number },
    index: number,
    isTemp: boolean = false
  ) => {
    const { start, end, distance } = segment;
    
    // Calculate midpoint for label
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Calculate angle for perpendicular label offset
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const perpOffset = 20 / currentZoom;
    const labelX = midX + Math.cos(angle + Math.PI / 2) * perpOffset;
    const labelY = midY + Math.sin(angle + Math.PI / 2) * perpOffset;
    
    const displayDistance = formatDistance(distance);

    return (
      <Group key={`segment-${index}`}>
        {/* Segment line */}
        <Line
          points={[start.x, start.y, end.x, end.y]}
          stroke={isTemp ? '#f97316' : '#ef4444'}
          strokeWidth={strokeWidth}
          dash={[dashSize, dashSize / 2]}
          opacity={isTemp ? 0.7 : 1}
        />
        
        {/* Distance label background */}
        <Rect
          x={labelX - (displayDistance.length * fontSize * 0.3)}
          y={labelY - fontSize * 0.7}
          width={displayDistance.length * fontSize * 0.6 + fontSize}
          height={fontSize * 1.4}
          fill={isTemp ? 'rgba(249, 115, 22, 0.9)' : 'rgba(0, 0, 0, 0.8)'}
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
  };

  // Calculate total with temp segment
  const totalWithTemp = tempSegment 
    ? totalDistanceMeters + tempSegment.distance 
    : totalDistanceMeters;

  return (
    <Group>
      {/* Render all confirmed segments */}
      {segments.map((segment, index) => renderSegment(segment, index))}
      
      {/* Render temp segment if exists */}
      {tempSegment && renderSegment(tempSegment, segments.length, true)}
      
      {/* Render all point markers */}
      {points.map((point, index) => (
        <Group key={`point-${index}`}>
          <Circle
            x={point.x}
            y={point.y}
            radius={markerSize}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={strokeWidth}
          />
          {/* Point number label */}
          {points.length > 1 && (
            <Text
              x={point.x}
              y={point.y}
              text={String(index + 1)}
              fontSize={fontSize * 0.8}
              fill="#ffffff"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              offsetX={fontSize * 0.2}
              offsetY={fontSize * 0.35}
            />
          )}
        </Group>
      ))}
      
      {/* Temp end point marker */}
      {tempEndPoint && (
        <Circle
          x={tempEndPoint.x}
          y={tempEndPoint.y}
          radius={markerSize}
          fill="#f97316"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          opacity={0.7}
        />
      )}
      
      {/* Total distance badge (show when 2+ points) */}
      {(points.length >= 2 || tempSegment) && (
        <Group>
          {/* Position at top-center of the measurement area */}
          {(() => {
            // Find bounding box of all points
            const allPoints = [...points];
            if (tempEndPoint) allPoints.push(tempEndPoint);
            
            const minY = Math.min(...allPoints.map(p => p.y));
            const avgX = allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
            
            const badgeY = minY - 40 / currentZoom;
            const badgeX = avgX;
            
            const totalText = `Total: ${formatDistance(totalWithTemp)}`;
            const badgeWidth = totalText.length * fontSize * 0.6 + fontSize * 1.5;
            const badgeHeight = fontSize * 2;
            
            return (
              <>
                <Rect
                  x={badgeX - badgeWidth / 2}
                  y={badgeY - badgeHeight / 2}
                  width={badgeWidth}
                  height={badgeHeight}
                  fill="rgba(34, 197, 94, 0.95)"
                  cornerRadius={6 / currentZoom}
                  stroke="#ffffff"
                  strokeWidth={1 / currentZoom}
                />
                <Text
                  x={badgeX}
                  y={badgeY}
                  text={totalText}
                  fontSize={fontSize * 1.1}
                  fill="#ffffff"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  offsetX={totalText.length * fontSize * 0.28}
                  offsetY={fontSize * 0.5}
                />
              </>
            );
          })()}
        </Group>
      )}
    </Group>
  );
}
