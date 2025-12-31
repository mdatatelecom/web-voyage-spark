import { Group, Line, Circle, Text, Rect, Arc } from 'react-konva';

interface MeasurementPoint {
  x: number;
  y: number;
}

interface MeasurementToolProps {
  points: MeasurementPoint[];
  tempEndPoint?: MeasurementPoint | null;
  scale: number; // pixels per meter (user defined)
  currentZoom: number;
  isClosed?: boolean;
  showAngles?: boolean;
}

// Calculate polygon area using Shoelace formula
const calculatePolygonArea = (points: MeasurementPoint[], scale: number): number => {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  area = Math.abs(area) / 2;
  // Convert from pixels² to meters²
  return area / (scale * scale);
};

// Calculate angle between two vectors (in degrees)
const calculateAngle = (
  p1: MeasurementPoint,
  vertex: MeasurementPoint,
  p2: MeasurementPoint
): { angle: number; startAngle: number } => {
  // Vectors from vertex to each point
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  
  // Angles of vectors (in radians, from positive x-axis)
  const angle1 = Math.atan2(v1.y, v1.x);
  const angle2 = Math.atan2(v2.y, v2.x);
  
  // Calculate the angle difference
  let angleDiff = angle2 - angle1;
  
  // Normalize to [0, 2π]
  if (angleDiff < 0) angleDiff += 2 * Math.PI;
  
  // Convert to degrees
  const angleDegrees = angleDiff * (180 / Math.PI);
  
  // Start angle for the arc (in degrees, Konva uses degrees)
  const startAngleDegrees = angle1 * (180 / Math.PI);
  
  return { angle: angleDegrees, startAngle: startAngleDegrees };
};

export function MeasurementTool({
  points,
  tempEndPoint,
  scale = 100,
  currentZoom = 1,
  isClosed = false,
  showAngles = true,
}: MeasurementToolProps) {
  if (points.length === 0) return null;

  // Dynamic sizes based on zoom
  const markerSize = 8 / currentZoom;
  const strokeWidth = 2 / currentZoom;
  const fontSize = 12 / currentZoom;
  const dashSize = 6 / currentZoom;

  // Calculate total distance including closing segment if closed
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

  // Add closing segment if polygon is closed
  if (isClosed && points.length >= 3) {
    const start = points[points.length - 1];
    const end = points[0];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    const distanceMeters = distancePixels / scale;
    totalDistanceMeters += distanceMeters;
    segments.push({ start, end, distance: distanceMeters });
  }

  // If there's a temp point and not closed, add it as the last segment
  const lastPoint = points[points.length - 1];
  let tempSegment: { start: MeasurementPoint; end: MeasurementPoint; distance: number } | null = null;
  
  if (tempEndPoint && points.length > 0 && !isClosed) {
    const dx = tempEndPoint.x - lastPoint.x;
    const dy = tempEndPoint.y - lastPoint.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    const distanceMeters = distancePixels / scale;
    tempSegment = { start: lastPoint, end: tempEndPoint, distance: distanceMeters };
  }

  // Calculate area if closed
  const areaMeters = isClosed ? calculatePolygonArea(points, scale) : 0;

  const formatDistance = (meters: number) => {
    if (meters >= 1) {
      return `${meters.toFixed(2)} m`;
    }
    return `${(meters * 100).toFixed(1)} cm`;
  };

  const formatArea = (sqMeters: number) => {
    if (sqMeters >= 1) {
      return `${sqMeters.toFixed(2)} m²`;
    }
    return `${(sqMeters * 10000).toFixed(1)} cm²`;
  };

  // Check if cursor is near first point (for close indicator)
  const isNearFirstPoint = tempEndPoint && points.length >= 3 && !isClosed && (() => {
    const firstPoint = points[0];
    const dist = Math.sqrt(
      Math.pow(tempEndPoint.x - firstPoint.x, 2) + 
      Math.pow(tempEndPoint.y - firstPoint.y, 2)
    );
    return dist < 20 / currentZoom;
  })();

  const renderSegment = (
    segment: { start: MeasurementPoint; end: MeasurementPoint; distance: number },
    index: number,
    isTemp: boolean = false,
    isClosingSegment: boolean = false
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

    const lineColor = isClosingSegment ? '#22c55e' : isTemp ? '#f97316' : '#ef4444';
    const bgColor = isClosingSegment ? 'rgba(34, 197, 94, 0.9)' : isTemp ? 'rgba(249, 115, 22, 0.9)' : 'rgba(0, 0, 0, 0.8)';

    return (
      <Group key={`segment-${index}`}>
        {/* Segment line */}
        <Line
          points={[start.x, start.y, end.x, end.y]}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          dash={isClosingSegment ? undefined : [dashSize, dashSize / 2]}
          opacity={isTemp ? 0.7 : 1}
        />
        
        {/* Distance label background */}
        <Rect
          x={labelX - (displayDistance.length * fontSize * 0.3)}
          y={labelY - fontSize * 0.7}
          width={displayDistance.length * fontSize * 0.6 + fontSize}
          height={fontSize * 1.4}
          fill={bgColor}
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
      {segments.map((segment, index) => 
        renderSegment(segment, index, false, isClosed && index === segments.length - 1)
      )}
      
      {/* Render temp segment if exists */}
      {tempSegment && renderSegment(tempSegment, segments.length, true)}
      
      {/* Render all point markers */}
      {points.map((point, index) => (
        <Group key={`point-${index}`}>
          <Circle
            x={point.x}
            y={point.y}
            radius={index === 0 && isNearFirstPoint ? markerSize * 1.5 : markerSize}
            fill={index === 0 ? '#22c55e' : '#ef4444'}
            stroke="#ffffff"
            strokeWidth={strokeWidth}
            opacity={index === 0 && isNearFirstPoint ? 1 : 1}
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
      
      {/* "Close polygon" hint when near first point */}
      {isNearFirstPoint && (
        <Group>
          <Rect
            x={points[0].x - 50 / currentZoom}
            y={points[0].y - 35 / currentZoom}
            width={100 / currentZoom}
            height={20 / currentZoom}
            fill="rgba(34, 197, 94, 0.95)"
            cornerRadius={4 / currentZoom}
          />
          <Text
            x={points[0].x}
            y={points[0].y - 25 / currentZoom}
            text="Clique para fechar"
            fontSize={fontSize * 0.9}
            fill="#ffffff"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            offsetX={fontSize * 4}
          />
        </Group>
      )}
      
      {/* Angle indicators at vertices */}
      {showAngles && points.length >= 3 && (() => {
        const angleElements: JSX.Element[] = [];
        const numPoints = isClosed ? points.length : points.length;
        
        for (let i = 1; i < numPoints - (isClosed ? 0 : 1); i++) {
          const prevIndex = i - 1;
          const nextIndex = isClosed && i === points.length - 1 ? 0 : i + 1;
          
          // Skip if we don't have valid next point
          if (nextIndex >= points.length && !isClosed) continue;
          
          const prev = points[prevIndex];
          const vertex = points[i];
          const next = points[nextIndex];
          
          const { angle, startAngle } = calculateAngle(prev, vertex, next);
          const arcRadius = 25 / currentZoom;
          
          // Only show interior angle (the smaller one if > 180)
          const displayAngle = angle > 180 ? 360 - angle : angle;
          const adjustedStartAngle = angle > 180 ? startAngle + angle : startAngle;
          const arcAngle = angle > 180 ? 360 - angle : angle;
          
          angleElements.push(
            <Group key={`angle-${i}`}>
              {/* Angle arc */}
              <Arc
                x={vertex.x}
                y={vertex.y}
                innerRadius={0}
                outerRadius={arcRadius}
                angle={arcAngle}
                rotation={adjustedStartAngle}
                fill="rgba(59, 130, 246, 0.25)"
                stroke="#3b82f6"
                strokeWidth={1.5 / currentZoom}
              />
              {/* Angle label */}
              <Group>
                {(() => {
                  // Position label at the middle of the arc
                  const midAngleRad = (adjustedStartAngle + arcAngle / 2) * (Math.PI / 180);
                  const labelRadius = arcRadius + 15 / currentZoom;
                  const labelX = vertex.x + Math.cos(midAngleRad) * labelRadius;
                  const labelY = vertex.y + Math.sin(midAngleRad) * labelRadius;
                  const angleText = `${displayAngle.toFixed(1)}°`;
                  
                  return (
                    <>
                      <Rect
                        x={labelX - (angleText.length * fontSize * 0.3)}
                        y={labelY - fontSize * 0.6}
                        width={angleText.length * fontSize * 0.6 + fontSize * 0.5}
                        height={fontSize * 1.2}
                        fill="rgba(59, 130, 246, 0.9)"
                        cornerRadius={3 / currentZoom}
                      />
                      <Text
                        x={labelX}
                        y={labelY}
                        text={angleText}
                        fontSize={fontSize * 0.85}
                        fill="#ffffff"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        offsetX={angleText.length * fontSize * 0.22}
                        offsetY={fontSize * 0.35}
                      />
                    </>
                  );
                })()}
              </Group>
            </Group>
          );
        }
        
        // Handle first angle for closed polygon
        if (isClosed) {
          const prev = points[points.length - 1];
          const vertex = points[0];
          const next = points[1];
          
          const { angle, startAngle } = calculateAngle(prev, vertex, next);
          const arcRadius = 25 / currentZoom;
          const displayAngle = angle > 180 ? 360 - angle : angle;
          const adjustedStartAngle = angle > 180 ? startAngle + angle : startAngle;
          const arcAngle = angle > 180 ? 360 - angle : angle;
          
          angleElements.push(
            <Group key="angle-first">
              <Arc
                x={vertex.x}
                y={vertex.y}
                innerRadius={0}
                outerRadius={arcRadius}
                angle={arcAngle}
                rotation={adjustedStartAngle}
                fill="rgba(34, 197, 94, 0.25)"
                stroke="#22c55e"
                strokeWidth={1.5 / currentZoom}
              />
              <Group>
                {(() => {
                  const midAngleRad = (adjustedStartAngle + arcAngle / 2) * (Math.PI / 180);
                  const labelRadius = arcRadius + 15 / currentZoom;
                  const labelX = vertex.x + Math.cos(midAngleRad) * labelRadius;
                  const labelY = vertex.y + Math.sin(midAngleRad) * labelRadius;
                  const angleText = `${displayAngle.toFixed(1)}°`;
                  
                  return (
                    <>
                      <Rect
                        x={labelX - (angleText.length * fontSize * 0.3)}
                        y={labelY - fontSize * 0.6}
                        width={angleText.length * fontSize * 0.6 + fontSize * 0.5}
                        height={fontSize * 1.2}
                        fill="rgba(34, 197, 94, 0.9)"
                        cornerRadius={3 / currentZoom}
                      />
                      <Text
                        x={labelX}
                        y={labelY}
                        text={angleText}
                        fontSize={fontSize * 0.85}
                        fill="#ffffff"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        offsetX={angleText.length * fontSize * 0.22}
                        offsetY={fontSize * 0.35}
                      />
                    </>
                  );
                })()}
              </Group>
            </Group>
          );
        }
        
        return angleElements;
      })()}
      
      {/* Temp end point marker */}
      {tempEndPoint && !isClosed && (
        <Circle
          x={tempEndPoint.x}
          y={tempEndPoint.y}
          radius={markerSize}
          fill={isNearFirstPoint ? '#22c55e' : '#f97316'}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          opacity={0.7}
        />
      )}
      
      {/* Total distance/perimeter badge (show when 2+ points) */}
      {(points.length >= 2 || tempSegment) && (
        <Group>
          {/* Position at top-center of the measurement area */}
          {(() => {
            // Find bounding box of all points
            const allPoints = [...points];
            if (tempEndPoint && !isClosed) allPoints.push(tempEndPoint);
            
            const minY = Math.min(...allPoints.map(p => p.y));
            const avgX = allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
            
            const badgeY = minY - 40 / currentZoom;
            const badgeX = avgX;
            
            const label = isClosed ? 'Perímetro' : 'Total';
            const totalText = `${label}: ${formatDistance(totalWithTemp)}`;
            const areaText = isClosed ? `Área: ${formatArea(areaMeters)}` : '';
            const pointsText = `${points.length} pontos`;
            
            const fullText = isClosed 
              ? `${totalText} | ${areaText}`
              : `${totalText} | ${pointsText}`;
            
            const badgeWidth = fullText.length * fontSize * 0.5 + fontSize * 2;
            const badgeHeight = fontSize * 2;
            
            return (
              <>
                <Rect
                  x={badgeX - badgeWidth / 2}
                  y={badgeY - badgeHeight / 2}
                  width={badgeWidth}
                  height={badgeHeight}
                  fill={isClosed ? "rgba(34, 197, 94, 0.95)" : "rgba(34, 197, 94, 0.95)"}
                  cornerRadius={6 / currentZoom}
                  stroke="#ffffff"
                  strokeWidth={1 / currentZoom}
                />
                <Text
                  x={badgeX}
                  y={badgeY}
                  text={fullText}
                  fontSize={fontSize * 1.1}
                  fill="#ffffff"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  offsetX={fullText.length * fontSize * 0.25}
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
