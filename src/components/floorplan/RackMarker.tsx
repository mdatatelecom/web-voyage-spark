import React, { useState, useRef } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { RackPosition } from '@/hooks/useRackPositions';
import Konva from 'konva';

interface RackMarkerProps {
  position: RackPosition;
  currentZoom: number;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onDragEnd: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onDelete?: () => void;
  onHover?: (screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
  occupancy?: number; // 0-100 percentage
}

export const RackMarker: React.FC<RackMarkerProps> = ({
  position,
  currentZoom,
  isSelected,
  isEditing,
  onClick,
  onDragEnd,
  onResize,
  onDelete,
  onHover,
  onHoverEnd,
  occupancy,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; corner: number } | null>(null);
  
  const baseWidth = position.width || 60;
  const baseHeight = position.height || 100;
  const rackName = position.rack?.name || 'Rack';
  const sizeU = position.rack?.size_u || 42;
  
  // Use calculated occupancy from position if available
  const realOccupancy = occupancy ?? position.occupancy_percent ?? 0;
  
  // Scale factors
  const strokeWidth = Math.max(1, 2 / currentZoom);
  const fontSize = Math.max(8, 11 / currentZoom);
  
  // Colors
  const frameColor = isSelected ? '#2563eb' : '#1e293b';
  const innerFrameColor = isSelected ? 'rgba(59, 130, 246, 0.2)' : '#374151';
  
  // Occupancy bar color
  const getOccupancyColor = (occ: number) => {
    if (occ > 85) return '#ef4444';
    if (occ > 70) return '#eab308';
    return '#22c55e';
  };

  const width = baseWidth;
  const height = baseHeight;
  
  // Server module dimensions
  const serverHeight = (height - 40 / currentZoom) / 4;
  const serverWidth = width - 16 / currentZoom;
  
  // Handle resize start
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>, cornerIndex: number) => {
    e.cancelBubble = true;
    setIsResizing(true);
    setResizeStart({
      x: e.evt.clientX,
      y: e.evt.clientY,
      width: baseWidth,
      height: baseHeight,
      corner: cornerIndex,
    });
  };
  
  // Handle resize move
  const handleResizeMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isResizing || !resizeStart) return;
    
    const deltaX = (e.evt.clientX - resizeStart.x) / currentZoom;
    const deltaY = (e.evt.clientY - resizeStart.y) / currentZoom;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    
    // Determine resize direction based on corner
    if (resizeStart.corner === 1 || resizeStart.corner === 3) {
      // Right corners
      newWidth = Math.max(40, resizeStart.width + deltaX);
    } else {
      // Left corners
      newWidth = Math.max(40, resizeStart.width - deltaX);
    }
    
    if (resizeStart.corner === 2 || resizeStart.corner === 3) {
      // Bottom corners
      newHeight = Math.max(60, resizeStart.height + deltaY);
    } else {
      // Top corners
      newHeight = Math.max(60, resizeStart.height - deltaY);
    }
    
    // Live preview via transform (optional optimization)
    if (groupRef.current) {
      groupRef.current.getLayer()?.batchDraw();
    }
  };
  
  // Handle resize end
  const handleResizeEnd = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isResizing || !resizeStart || !onResize) {
      setIsResizing(false);
      setResizeStart(null);
      return;
    }
    
    const deltaX = (e.evt.clientX - resizeStart.x) / currentZoom;
    const deltaY = (e.evt.clientY - resizeStart.y) / currentZoom;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    
    if (resizeStart.corner === 1 || resizeStart.corner === 3) {
      newWidth = Math.max(40, resizeStart.width + deltaX);
    } else {
      newWidth = Math.max(40, resizeStart.width - deltaX);
    }
    
    if (resizeStart.corner === 2 || resizeStart.corner === 3) {
      newHeight = Math.max(60, resizeStart.height + deltaY);
    } else {
      newHeight = Math.max(60, resizeStart.height - deltaY);
    }
    
    onResize(Math.round(newWidth), Math.round(newHeight));
    setIsResizing(false);
    setResizeStart(null);
  };

  // Handle hover for tooltip
  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (onHover) {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (pointer) {
        // Get canvas position relative to viewport
        const container = stage?.container();
        const rect = container?.getBoundingClientRect();
        if (rect) {
          onHover(rect.left + pointer.x, rect.top + pointer.y);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    onHoverEnd?.();
  };

  // Handle delete
  const handleDeleteClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onDelete?.();
  };

  // Corner positions for resize handles
  const corners = [
    { x: -width / 2, y: -height / 2 - fontSize - 6 / currentZoom }, // top-left
    { x: width / 2, y: -height / 2 - fontSize - 6 / currentZoom }, // top-right
    { x: -width / 2, y: height / 2 + fontSize / 2 }, // bottom-left
    { x: width / 2, y: height / 2 + fontSize / 2 }, // bottom-right
  ];
  
  return (
    <Group
      ref={groupRef}
      x={position.position_x}
      y={position.position_y}
      rotation={position.rotation || 0}
      draggable={isEditing && !isResizing}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
      
      {/* Main rack frame - outer */}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={frameColor}
        stroke={isSelected ? '#3b82f6' : '#0f172a'}
        strokeWidth={strokeWidth * 2}
        cornerRadius={6 / currentZoom}
      />
      
      {/* Inner frame */}
      <Rect
        x={-width / 2 + 4 / currentZoom}
        y={-height / 2 + 4 / currentZoom}
        width={width - 8 / currentZoom}
        height={height - 8 / currentZoom}
        fill={innerFrameColor}
        cornerRadius={4 / currentZoom}
      />
      
      {/* Server/Equipment modules (3 units - styled like image) */}
      {[0, 1, 2].map((i) => {
        const moduleY = -height / 2 + 12 / currentZoom + i * (serverHeight + 4 / currentZoom);
        const moduleX = -serverWidth / 2;
        
        return (
          <Group key={`server-${i}`}>
            {/* Server chassis with silver gradient effect */}
            <Rect
              x={moduleX}
              y={moduleY}
              width={serverWidth}
              height={serverHeight - 4 / currentZoom}
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth={1 / currentZoom}
              cornerRadius={2 / currentZoom}
            />
            
            {/* Server top highlight (3D effect) */}
            <Rect
              x={moduleX}
              y={moduleY}
              width={serverWidth}
              height={4 / currentZoom}
              fill="#cbd5e1"
              cornerRadius={[2 / currentZoom, 2 / currentZoom, 0, 0]}
            />
            
            {/* LEDs on left side */}
            <Circle
              x={moduleX + 8 / currentZoom}
              y={moduleY + serverHeight / 2 - 2 / currentZoom}
              radius={2.5 / currentZoom}
              fill="#22c55e"
              shadowColor="#22c55e"
              shadowBlur={4 / currentZoom}
              shadowOpacity={0.8}
            />
            <Circle
              x={moduleX + 8 / currentZoom}
              y={moduleY + serverHeight / 2 + 4 / currentZoom}
              radius={2 / currentZoom}
              fill={i === 1 ? '#eab308' : '#64748b'}
            />
            
            {/* Ventilation slots (center) */}
            {[0, 1, 2, 3, 4].map((j) => (
              <Rect
                key={`vent-${i}-${j}`}
                x={moduleX + serverWidth / 3 + j * 6 / currentZoom}
                y={moduleY + 6 / currentZoom}
                width={4 / currentZoom}
                height={serverHeight - 14 / currentZoom}
                fill="#1e293b"
                cornerRadius={1 / currentZoom}
              />
            ))}
            
            {/* Display panel on right */}
            <Rect
              x={moduleX + serverWidth - 20 / currentZoom}
              y={moduleY + 6 / currentZoom}
              width={14 / currentZoom}
              height={serverHeight - 14 / currentZoom}
              fill="#3b82f6"
              cornerRadius={2 / currentZoom}
              shadowColor="#3b82f6"
              shadowBlur={3 / currentZoom}
              shadowOpacity={0.5}
            />
          </Group>
        );
      })}
      
      {/* Occupancy bar background */}
      <Rect
        x={-width / 2 + 6 / currentZoom}
        y={height / 2 - 14 / currentZoom}
        width={width - 12 / currentZoom}
        height={6 / currentZoom}
        fill="#1e293b"
        cornerRadius={3 / currentZoom}
      />
      
      {/* Occupancy bar fill */}
      <Rect
        x={-width / 2 + 6 / currentZoom}
        y={height / 2 - 14 / currentZoom}
        width={(width - 12 / currentZoom) * (realOccupancy / 100)}
        height={6 / currentZoom}
        fill={getOccupancyColor(realOccupancy)}
        cornerRadius={3 / currentZoom}
        shadowColor={getOccupancyColor(realOccupancy)}
        shadowBlur={4 / currentZoom}
        shadowOpacity={0.5}
      />
      
      {/* Size and occupancy indicator */}
      <Text
        x={-width / 2}
        y={height / 2 + 4 / currentZoom}
        width={width}
        text={`${sizeU}U • ${realOccupancy}%`}
        fontSize={fontSize * 0.85}
        fill="#94a3b8"
        align="center"
      />
      
      {/* Delete button when selected and editing */}
      {isSelected && isEditing && onDelete && (
        <Group
          x={width / 2 + 8 / currentZoom}
          y={-height / 2 - fontSize - 6 / currentZoom}
          onClick={handleDeleteClick}
          onTap={handleDeleteClick}
        >
          <Circle
            radius={10 / currentZoom}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={1 / currentZoom}
            shadowColor="#000000"
            shadowBlur={4 / currentZoom}
            shadowOpacity={0.3}
          />
          <Text
            x={-4 / currentZoom}
            y={-5 / currentZoom}
            text="×"
            fontSize={14 / currentZoom}
            fill="#ffffff"
            fontStyle="bold"
          />
        </Group>
      )}
      
      {/* Corner resize handles when selected and editing */}
      {isSelected && isEditing && onResize && (
        <>
          {corners.map((corner, i) => (
            <Rect
              key={`handle-${i}`}
              x={corner.x - 5 / currentZoom}
              y={corner.y - 5 / currentZoom}
              width={10 / currentZoom}
              height={10 / currentZoom}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1.5 / currentZoom}
              cornerRadius={2 / currentZoom}
              draggable
              onDragStart={(e) => handleResizeStart(e, i)}
              onDragMove={handleResizeMove}
              onDragEnd={handleResizeEnd}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) {
                  const cursors = ['nw-resize', 'ne-resize', 'sw-resize', 'se-resize'];
                  container.style.cursor = cursors[i];
                }
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) {
                  container.style.cursor = isEditing ? 'move' : 'pointer';
                }
              }}
            />
          ))}
        </>
      )}
    </Group>
  );
};
