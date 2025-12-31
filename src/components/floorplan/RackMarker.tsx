import React, { useState, useRef } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { RackPosition } from '@/hooks/useRackPositions';
import Konva from 'konva';
import { getEquipmentColor } from '@/constants/equipmentColors';

// Same size constants as EquipmentMarker for consistency
const SIZE_MAP: Record<string, number> = {
  small: 14,
  medium: 21,
  large: 28,
};

const MIN_ICON_SCALE = 0.4;
const MAX_ICON_SCALE = 2.5;

// Default rack color from design system
const RACK_DEFAULT_COLOR = getEquipmentColor('rack');
const RACK_SELECTED_COLOR = '#2563eb';

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
  onContextMenu?: (screenX: number, screenY: number) => void;
  onRotate?: (rotation: number) => void;
  occupancy?: number; // 0-100 percentage
  iconSize?: 'small' | 'medium' | 'large';
  iconColor?: string; // Optional custom color
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
  onContextMenu,
  onRotate,
  occupancy,
  iconSize = 'medium',
  iconColor,
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
  
  // Icon size calculation (same as EquipmentMarker)
  const baseIconSize = SIZE_MAP[iconSize];
  const compensatedScale = Math.max(MIN_ICON_SCALE, Math.min(MAX_ICON_SCALE, 1 / currentZoom));
  const iconRadius = baseIconSize * compensatedScale;
  
  // Colors from design system
  const rackColor = iconColor || RACK_DEFAULT_COLOR;
  const primaryColor = isSelected ? RACK_SELECTED_COLOR : rackColor;
  const secondaryColor = isSelected ? '#93c5fd' : '#60a5fa';
  
  // Scale factors
  const strokeWidth = Math.max(1, 2 / currentZoom);
  const fontSize = Math.max(8, 11 / currentZoom);
  
  // Occupancy bar color
  const getOccupancyColor = (occ: number) => {
    if (occ > 85) return '#ef4444';
    if (occ > 70) return '#eab308';
    return '#22c55e';
  };

  const width = baseWidth;
  const height = baseHeight;
  
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

  // Handle context menu (right click)
  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (onContextMenu) {
      const stage = e.target.getStage();
      const container = stage?.container();
      const rect = container?.getBoundingClientRect();
      const pointer = stage?.getPointerPosition();
      if (rect && pointer) {
        onContextMenu(rect.left + pointer.x, rect.top + pointer.y);
      }
    }
  };

  // Handle rotate button click
  const handleRotateClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (onRotate) {
      const newRotation = ((position.rotation || 0) + 90) % 360;
      onRotate(newRotation);
    }
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
      onContextMenu={handleContextMenu}
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
          stroke={primaryColor}
          strokeWidth={3 / currentZoom}
          cornerRadius={8 / currentZoom}
          shadowColor={primaryColor}
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
        fill={isSelected ? RACK_SELECTED_COLOR : '#1e293b'}
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
      
      {/* Circular rack icon */}
      {(() => {
        // Use iconRadius for consistent size with equipment markers
        const radius = iconRadius;
        const rackInnerWidth = radius * 0.6;
        const rackInnerHeight = radius * 1.2;
        const shelfCount = 5;
        const shelfSpacing = rackInnerHeight / (shelfCount + 1);
        const railWidth = 2 / currentZoom;
        
        return (
          <Group>
            {/* Outer circle border */}
            <Circle
              x={0}
              y={0}
              radius={radius}
              fill="transparent"
              stroke={primaryColor}
              strokeWidth={2 / currentZoom}
            />
            
            {/* Inner circle with white background */}
            <Circle
              x={0}
              y={0}
              radius={radius - 4 / currentZoom}
              fill={isSelected ? '#eff6ff' : '#ffffff'}
              stroke={secondaryColor}
              strokeWidth={1.5 / currentZoom}
            />
            
            {/* Left vertical rail */}
            <Rect
              x={-rackInnerWidth / 2}
              y={-rackInnerHeight / 2}
              width={railWidth}
              height={rackInnerHeight}
              fill={primaryColor}
              cornerRadius={1 / currentZoom}
            />
            
            {/* Right vertical rail */}
            <Rect
              x={rackInnerWidth / 2 - railWidth}
              y={-rackInnerHeight / 2}
              width={railWidth}
              height={rackInnerHeight}
              fill={primaryColor}
              cornerRadius={1 / currentZoom}
            />
            
            {/* Horizontal shelves with indicators */}
            {[...Array(shelfCount)].map((_, i) => {
              const shelfY = -rackInnerHeight / 2 + shelfSpacing * (i + 1);
              const shelfHeight = 4 / currentZoom;
              
              return (
                <Group key={`shelf-${i}`}>
                  {/* Shelf bar */}
                  <Rect
                    x={-rackInnerWidth / 2 + railWidth}
                    y={shelfY - shelfHeight / 2}
                    width={rackInnerWidth - railWidth * 2}
                    height={shelfHeight}
                    fill={primaryColor}
                    cornerRadius={1 / currentZoom}
                  />
                  
                  {/* LED indicators on shelf */}
                  {[0, 1, 2].map((j) => {
                    const indicatorX = -rackInnerWidth / 4 + j * (rackInnerWidth / 4);
                    return (
                      <Circle
                        key={`led-${i}-${j}`}
                        x={indicatorX}
                        y={shelfY}
                        radius={1.5 / currentZoom}
                        fill={secondaryColor}
                      />
                    );
                  })}
                </Group>
              );
            })}
          </Group>
        );
      })()}
      
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
      
      {/* Action buttons when selected and editing */}
      {isSelected && isEditing && (
        <>
          {/* Delete button */}
          {onDelete && (
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
          
          {/* Rotate button */}
          {onRotate && (
            <Group
              x={width / 2 + 30 / currentZoom}
              y={-height / 2 - fontSize - 6 / currentZoom}
              onClick={handleRotateClick}
              onTap={handleRotateClick}
            >
              <Circle
                radius={10 / currentZoom}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={1 / currentZoom}
                shadowColor="#000000"
                shadowBlur={4 / currentZoom}
                shadowOpacity={0.3}
              />
              {/* Rotation arrow icon */}
              <Line
                points={[
                  -4 / currentZoom, 0,
                  4 / currentZoom, 0,
                  2 / currentZoom, -3 / currentZoom,
                ]}
                stroke="#ffffff"
                strokeWidth={1.5 / currentZoom}
                lineCap="round"
                lineJoin="round"
              />
              <Line
                points={[
                  4 / currentZoom, 0,
                  2 / currentZoom, 3 / currentZoom,
                ]}
                stroke="#ffffff"
                strokeWidth={1.5 / currentZoom}
                lineCap="round"
              />
            </Group>
          )}
        </>
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
