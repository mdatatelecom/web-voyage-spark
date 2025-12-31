import { Group, Line, Rect, Text } from 'react-konva';

interface ScaleIndicatorProps {
  measureScale: number; // pixels per meter
  currentZoom: number;
  containerWidth: number;
  containerHeight: number;
  position: { x: number; y: number };
  scale: number;
}

export const ScaleIndicator = ({
  measureScale,
  currentZoom,
  containerWidth,
  containerHeight,
  position,
  scale,
}: ScaleIndicatorProps) => {
  // Calculate target bar width in screen pixels (aim for ~100-150px)
  const targetBarWidth = 120;
  
  // Calculate how many meters the bar represents at current zoom
  const pixelsPerMeterAtZoom = measureScale * currentZoom;
  const metersForTargetWidth = targetBarWidth / pixelsPerMeterAtZoom;
  
  // Round to nice values
  const niceValues = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let displayMeters = niceValues.find(v => v >= metersForTargetWidth) || metersForTargetWidth;
  
  // Calculate actual bar width based on nice meter value
  const barWidth = displayMeters * pixelsPerMeterAtZoom;
  
  // Position in screen space (bottom-left, fixed relative to viewport)
  const screenX = 20;
  const screenY = containerHeight - 40;
  
  // Convert screen position to stage position (accounting for pan and zoom)
  const stageX = (screenX - position.x) / scale;
  const stageY = (screenY - position.y) / scale;
  
  const barHeight = 8 / scale;
  const fontSize = 12 / scale;
  const strokeWidth = 2 / scale;
  const padding = 8 / scale;
  
  // Format display text
  const displayText = displayMeters >= 1 
    ? `${displayMeters} m` 
    : `${displayMeters * 100} cm`;

  return (
    <Group x={stageX} y={stageY}>
      {/* Background */}
      <Rect
        x={-padding}
        y={-fontSize - padding * 2}
        width={barWidth / scale + padding * 2}
        height={barHeight + fontSize + padding * 3}
        fill="rgba(0, 0, 0, 0.7)"
        cornerRadius={4 / scale}
      />
      
      {/* Main bar */}
      <Line
        points={[0, 0, barWidth / scale, 0]}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
      />
      
      {/* Left cap */}
      <Line
        points={[0, -barHeight / 2, 0, barHeight / 2]}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
      />
      
      {/* Right cap */}
      <Line
        points={[barWidth / scale, -barHeight / 2, barWidth / scale, barHeight / 2]}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
      />
      
      {/* Text label */}
      <Text
        text={displayText}
        x={0}
        y={-fontSize - padding}
        width={barWidth / scale}
        fontSize={fontSize}
        fill="#ffffff"
        align="center"
        fontStyle="bold"
      />
    </Group>
  );
};
