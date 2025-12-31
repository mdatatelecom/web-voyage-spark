import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { RackPosition } from '@/hooks/useRackPositions';

interface RackMarkerProps {
  position: RackPosition;
  currentZoom: number;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onDragEnd: (x: number, y: number) => void;
}

export const RackMarker: React.FC<RackMarkerProps> = ({
  position,
  currentZoom,
  isSelected,
  isEditing,
  onClick,
  onDragEnd,
}) => {
  const width = position.width || 60;
  const height = position.height || 100;
  const rackName = position.rack?.name || 'Rack';
  const sizeU = position.rack?.size_u || 42;
  
  // Scale factors for visual elements
  const strokeWidth = Math.max(1, 2 / currentZoom);
  const fontSize = Math.max(8, 12 / currentZoom);
  const padding = 4 / currentZoom;
  
  // Colors
  const fillColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 116, 139, 0.2)';
  const strokeColor = isSelected ? '#3b82f6' : '#64748b';
  
  return (
    <Group
      x={position.position_x}
      y={position.position_y}
      rotation={position.rotation || 0}
      draggable={isEditing}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      style={{ cursor: isEditing ? 'move' : 'pointer' }}
    >
      {/* Main rack body */}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        cornerRadius={4 / currentZoom}
      />
      
      {/* Rack grid lines (simulating U slots) */}
      {Array.from({ length: Math.min(sizeU, 10) }).map((_, i) => (
        <Line
          key={i}
          points={[
            -width / 2 + padding,
            -height / 2 + (height / 10) * (i + 1),
            width / 2 - padding,
            -height / 2 + (height / 10) * (i + 1),
          ]}
          stroke={strokeColor}
          strokeWidth={0.5 / currentZoom}
          opacity={0.3}
        />
      ))}
      
      {/* Rack name label */}
      <Rect
        x={-width / 2}
        y={-height / 2 - fontSize - padding * 2}
        width={width}
        height={fontSize + padding * 2}
        fill={strokeColor}
        cornerRadius={[4 / currentZoom, 4 / currentZoom, 0, 0]}
      />
      <Text
        x={-width / 2}
        y={-height / 2 - fontSize - padding}
        width={width}
        text={rackName}
        fontSize={fontSize}
        fill="#ffffff"
        align="center"
        fontStyle="bold"
      />
      
      {/* Size indicator */}
      <Text
        x={-width / 2}
        y={height / 2 - fontSize - padding}
        width={width}
        text={`${sizeU}U`}
        fontSize={fontSize * 0.9}
        fill={strokeColor}
        align="center"
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <>
          {/* Corner handles */}
          {[
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
            { x: -width / 2, y: height / 2 },
            { x: width / 2, y: height / 2 },
          ].map((corner, i) => (
            <Rect
              key={i}
              x={corner.x - 4 / currentZoom}
              y={corner.y - 4 / currentZoom}
              width={8 / currentZoom}
              height={8 / currentZoom}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1 / currentZoom}
            />
          ))}
        </>
      )}
    </Group>
  );
};
