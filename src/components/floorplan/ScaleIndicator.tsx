import { Group, Line, Rect, Text } from 'react-konva';

interface ScaleIndicatorProps {
  measureScale: number; // pixels per meter
  currentZoom: number;
  containerWidth: number;
  containerHeight: number;
  position: { x: number; y: number };
  scale: number;
  scaleRatio?: number; // architectural scale ratio (e.g., 100 for 1:100)
}

export const ScaleIndicator = ({
  measureScale,
  currentZoom,
  containerWidth,
  containerHeight,
  position,
  scale,
  scaleRatio = 100,
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
  const smallFontSize = 10 / scale;
  const strokeWidth = 2 / scale;
  const padding = 8 / scale;
  
  // Format display text
  const distanceText = displayMeters >= 1 
    ? `${displayMeters} m` 
    : `${displayMeters * 100} cm`;
  
  const scaleText = `Escala 1:${scaleRatio}`;

  return (
    <Group x={stageX} y={stageY}>
      {/* Background */}
      <Rect
        x={-padding}
        y={-fontSize - smallFontSize - padding * 3}
        width={barWidth / scale + padding * 2}
        height={barHeight + fontSize + smallFontSize + padding * 4}
        fill="rgba(0, 0, 0, 0.75)"
        cornerRadius={4 / scale}
      />
      
      {/* Scale ratio text (1:100) */}
      <Text
        text={scaleText}
        x={0}
        y={-fontSize - smallFontSize - padding * 2}
        width={barWidth / scale}
        fontSize={smallFontSize}
        fill="#94a3b8"
        align="center"
      />
      
      {/* Distance text */}
      <Text
        text={distanceText}
        x={0}
        y={-fontSize - padding}
        width={barWidth / scale}
        fontSize={fontSize}
        fill="#ffffff"
        align="center"
        fontStyle="bold"
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
    </Group>
  );
};
