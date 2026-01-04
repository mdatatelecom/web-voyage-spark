import React, { useRef } from 'react';
import { Group, Text, Circle, Rect, Line } from 'react-konva';
import { RackPosition } from '@/hooks/useRackPositions';
import Konva from 'konva';
import { getEquipmentColor } from '@/constants/equipmentColors';

// Same size constants as EquipmentMarker for consistency (reduced by 50%)
const SIZE_MAP: Record<string, number> = {
  small: 7,
  medium: 10.5,
  large: 14,
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
  iconScale?: number; // Global scale multiplier
}

export const RackMarker: React.FC<RackMarkerProps> = ({
  position,
  currentZoom,
  isSelected,
  isEditing,
  onClick,
  onDragEnd,
  onDelete,
  onHover,
  onHoverEnd,
  onContextMenu,
  onRotate,
  occupancy,
  iconSize = 'medium',
  iconColor,
  iconScale = 1,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  
  // Use calculated occupancy from position if available
  const realOccupancy = occupancy ?? position.occupancy_percent ?? 0;
  
  // Icon size calculation (same as EquipmentMarker) with global scale
  const baseIconSize = SIZE_MAP[iconSize] * iconScale;
  const compensatedScale = Math.max(MIN_ICON_SCALE, Math.min(MAX_ICON_SCALE, 1 / currentZoom));
  const iconRadius = baseIconSize * compensatedScale;
  
  // Colors from design system
  const rackColor = iconColor || RACK_DEFAULT_COLOR;
  const primaryColor = isSelected ? RACK_SELECTED_COLOR : rackColor;
  const secondaryColor = isSelected ? '#93c5fd' : '#60a5fa';

  // Handle hover for tooltip
  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (onHover) {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (pointer) {
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

  // Occupancy color
  const getOccupancyColor = (occ: number) => {
    if (occ > 85) return '#ef4444';
    if (occ > 70) return '#eab308';
    return '#22c55e';
  };

  // Rack icon inner dimensions
  const rackInnerWidth = iconRadius * 0.6;
  const rackInnerHeight = iconRadius * 1.2;
  const shelfCount = 5;
  const shelfSpacing = rackInnerHeight / (shelfCount + 1);
  const railWidth = 2 / currentZoom;

  return (
    <Group
      ref={groupRef}
      x={position.position_x}
      y={position.position_y}
      rotation={position.rotation || 0}
      draggable={isEditing}
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
      {/* Selection glow - circular */}
      {isSelected && (
        <Circle
          x={0}
          y={0}
          radius={iconRadius + 6 / currentZoom}
          fill="transparent"
          stroke={primaryColor}
          strokeWidth={2.5 / currentZoom}
          shadowColor={primaryColor}
          shadowBlur={12 / currentZoom}
          shadowOpacity={0.6}
        />
      )}
      
      {/* Outer circle border */}
      <Circle
        x={0}
        y={0}
        radius={iconRadius}
        fill="transparent"
        stroke={primaryColor}
        strokeWidth={2 / currentZoom}
      />
      
      {/* Inner circle with white background */}
      <Circle
        x={0}
        y={0}
        radius={iconRadius - 4 / currentZoom}
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
      
      {/* Horizontal shelves with LED indicators */}
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

      
      {/* Action buttons when selected and editing */}
      {isSelected && isEditing && (
        <>
          {/* Delete button */}
          {onDelete && (
            <Group
              x={iconRadius + 4 / currentZoom}
              y={-iconRadius - 4 / currentZoom}
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
              x={iconRadius + 4 / currentZoom}
              y={iconRadius + 4 / currentZoom}
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
    </Group>
  );
};
