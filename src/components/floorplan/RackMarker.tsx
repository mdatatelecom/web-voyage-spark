import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { RackPosition } from '@/hooks/useRackPositions';

interface RackMarkerProps {
  position: RackPosition;
  currentZoom: number;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onDragEnd: (x: number, y: number) => void;
  occupancy?: number; // 0-100 percentage
}

export const RackMarker: React.FC<RackMarkerProps> = ({
  position,
  currentZoom,
  isSelected,
  isEditing,
  onClick,
  onDragEnd,
  occupancy = 50,
}) => {
  const baseSize = Math.max(position.width || 60, position.height || 100);
  const size = baseSize;
  const rackName = position.rack?.name || 'Rack';
  const sizeU = position.rack?.size_u || 42;
  
  // Scale factors
  const strokeWidth = Math.max(1, 2 / currentZoom);
  const fontSize = Math.max(8, 11 / currentZoom);
  
  // Colors
  const frameColor = isSelected ? '#2563eb' : '#334155';
  const bodyColor = isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.9)';
  const railColor = '#1e293b';
  const serverColor = '#475569';
  const ledColor = '#22c55e';
  
  // Occupancy bar color
  const getOccupancyColor = (occ: number) => {
    if (occ > 85) return '#ef4444';
    if (occ > 70) return '#eab308';
    return '#22c55e';
  };

  const width = size * 0.8;
  const height = size * 0.9;
  
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
      {/* Selection glow */}
      {isSelected && (
        <Rect
          x={-width / 2 - 6 / currentZoom}
          y={-height / 2 - fontSize - 12 / currentZoom}
          width={width + 12 / currentZoom}
          height={height + fontSize + 24 / currentZoom}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={3 / currentZoom}
          cornerRadius={8 / currentZoom}
          shadowColor="#3b82f6"
          shadowBlur={15 / currentZoom}
          shadowOpacity={0.6}
        />
      )}
      
      {/* Header with rack name */}
      <Rect
        x={-width / 2}
        y={-height / 2 - fontSize - 6 / currentZoom}
        width={width}
        height={fontSize + 6 / currentZoom}
        fill={isSelected ? '#2563eb' : '#1e293b'}
        cornerRadius={[4 / currentZoom, 4 / currentZoom, 0, 0]}
      />
      <Text
        x={-width / 2}
        y={-height / 2 - fontSize - 3 / currentZoom}
        width={width}
        text={rackName}
        fontSize={fontSize}
        fill="#ffffff"
        align="center"
        fontStyle="bold"
      />
      
      {/* Main rack frame */}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={bodyColor}
        stroke={frameColor}
        strokeWidth={strokeWidth * 1.5}
        cornerRadius={4 / currentZoom}
      />
      
      {/* Side mounting rails (left) */}
      <Rect
        x={-width / 2 + 4 / currentZoom}
        y={-height / 2 + 8 / currentZoom}
        width={6 / currentZoom}
        height={height - 16 / currentZoom}
        fill={railColor}
        cornerRadius={1 / currentZoom}
      />
      
      {/* Side mounting rails (right) */}
      <Rect
        x={width / 2 - 10 / currentZoom}
        y={-height / 2 + 8 / currentZoom}
        width={6 / currentZoom}
        height={height - 16 / currentZoom}
        fill={railColor}
        cornerRadius={1 / currentZoom}
      />
      
      {/* Ventilation slots at top */}
      {[-0.2, 0, 0.2].map((offset, i) => (
        <Line
          key={`vent-${i}`}
          points={[
            offset * width,
            -height / 2 + 4 / currentZoom,
            offset * width,
            -height / 2 + 8 / currentZoom,
          ]}
          stroke="#64748b"
          strokeWidth={3 / currentZoom}
          lineCap="round"
        />
      ))}
      
      {/* Server/Equipment modules (4 units) */}
      {[0, 1, 2, 3].map((i) => {
        const moduleHeight = (height - 40 / currentZoom) / 5;
        const moduleY = -height / 2 + 15 / currentZoom + i * moduleHeight;
        const moduleWidth = width - 28 / currentZoom;
        
        return (
          <Group key={`server-${i}`}>
            {/* Server chassis */}
            <Rect
              x={-moduleWidth / 2}
              y={moduleY}
              width={moduleWidth}
              height={moduleHeight - 4 / currentZoom}
              fill={serverColor}
              stroke="#334155"
              strokeWidth={1 / currentZoom}
              cornerRadius={2 / currentZoom}
            />
            
            {/* Front panel details (horizontal lines) */}
            <Line
              points={[
                -moduleWidth / 2 + 8 / currentZoom,
                moduleY + moduleHeight / 2 - 2 / currentZoom,
                moduleWidth / 4,
                moduleY + moduleHeight / 2 - 2 / currentZoom,
              ]}
              stroke="#64748b"
              strokeWidth={1 / currentZoom}
            />
            <Line
              points={[
                -moduleWidth / 2 + 8 / currentZoom,
                moduleY + moduleHeight / 2 + 2 / currentZoom,
                moduleWidth / 4,
                moduleY + moduleHeight / 2 + 2 / currentZoom,
              ]}
              stroke="#64748b"
              strokeWidth={1 / currentZoom}
            />
            
            {/* Status LED */}
            <Circle
              x={moduleWidth / 2 - 8 / currentZoom}
              y={moduleY + moduleHeight / 2}
              radius={3 / currentZoom}
              fill={ledColor}
              shadowColor={ledColor}
              shadowBlur={4 / currentZoom}
              shadowOpacity={0.8}
            />
          </Group>
        );
      })}
      
      {/* Occupancy bar background */}
      <Rect
        x={-width / 2 + 4 / currentZoom}
        y={height / 2 - 10 / currentZoom}
        width={width - 8 / currentZoom}
        height={6 / currentZoom}
        fill="#1e293b"
        cornerRadius={3 / currentZoom}
      />
      
      {/* Occupancy bar fill */}
      <Rect
        x={-width / 2 + 4 / currentZoom}
        y={height / 2 - 10 / currentZoom}
        width={(width - 8 / currentZoom) * (occupancy / 100)}
        height={6 / currentZoom}
        fill={getOccupancyColor(occupancy)}
        cornerRadius={3 / currentZoom}
        shadowColor={getOccupancyColor(occupancy)}
        shadowBlur={4 / currentZoom}
        shadowOpacity={0.5}
      />
      
      {/* Size indicator (U) */}
      <Text
        x={-width / 2}
        y={height / 2 + 4 / currentZoom}
        width={width}
        text={`${sizeU}U`}
        fontSize={fontSize * 0.85}
        fill="#94a3b8"
        align="center"
      />
      
      {/* Corner resize handles when selected and editing */}
      {isSelected && isEditing && (
        <>
          {[
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
            { x: -width / 2, y: height / 2 },
            { x: width / 2, y: height / 2 },
          ].map((corner, i) => (
            <Rect
              key={`handle-${i}`}
              x={corner.x - 4 / currentZoom}
              y={corner.y - 4 / currentZoom}
              width={8 / currentZoom}
              height={8 / currentZoom}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1 / currentZoom}
              cornerRadius={2 / currentZoom}
            />
          ))}
        </>
      )}
    </Group>
  );
};
