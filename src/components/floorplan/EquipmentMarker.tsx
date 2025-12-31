import { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { Circle, Group, Text, Line } from 'react-konva';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { FloorPlanEquipmentIcon, EQUIPMENT_TYPE_COLORS } from './equipment-icons';

interface EquipmentMarkerProps {
  position: EquipmentPosition;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  isDragging: boolean;
  isFocused?: boolean;
  editable: boolean;
  currentScale?: number;
  gridSize?: number;
  snapToGrid?: boolean;
  activeConnectionCount?: number;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
  onHover?: (position: EquipmentPosition, screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
}

// Base sizes increased by 15% from original
const SIZE_MAP: Record<string, number> = {
  small: 14,
  medium: 21,
  large: 28,
};

// Min/max scale for icon compensation
const MIN_ICON_SCALE = 0.4;
const MAX_ICON_SCALE = 2.5;

// Hover delay in ms
const HOVER_DELAY = 300;

function EquipmentMarkerComponent({
  position,
  stageWidth,
  stageHeight,
  isSelected,
  isDragging,
  isFocused = false,
  editable,
  currentScale = 1,
  gridSize = 20,
  snapToGrid = false,
  activeConnectionCount = 0,
  onSelect,
  onDragStart,
  onDragEnd,
  onRotationChange,
  onHover,
  onHoverEnd,
}: EquipmentMarkerProps) {
  const equipment = position.equipment;
  // Use custom_icon if set, otherwise fall back to equipment type
  const equipmentType = (position as any).custom_icon || equipment?.type || 'default';
  const status = equipment?.equipment_status || 'active';
  const typeColor = EQUIPMENT_TYPE_COLORS[equipmentType] || '#6b7280';
  
  const baseSize = SIZE_MAP[position.icon_size] || SIZE_MAP.medium;
  
  // Calculate compensated scale to maintain icon visibility at different zoom levels
  const compensatedScale = useMemo(() => {
    const inverseScale = 1 / currentScale;
    return Math.max(MIN_ICON_SCALE, Math.min(MAX_ICON_SCALE, inverseScale));
  }, [currentScale]);

  // Final size considering compensation
  const size = baseSize * compensatedScale;
  
  // Convert relative position (0-1) to actual coordinates
  const x = position.position_x * stageWidth;
  const y = position.position_y * stageHeight;

  // Snap to grid function
  const snapValue = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const displayLabel = position.custom_label || equipment?.name || 'Equipamento';
  const displayIp = equipment?.ip_address || '';

  // Pulsating animation for focus ring
  const [pulseOpacity, setPulseOpacity] = useState(0.8);
  const [pulseRadius, setPulseRadius] = useState(size + 12);

  // Rotation handle state
  const [isRotating, setIsRotating] = useState(false);

  // Hover state for tooltip
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((e: any) => {
    const timeout = setTimeout(() => {
      setIsHovered(true);
      if (onHover) {
        const stage = e.target.getStage();
        const container = stage.container().getBoundingClientRect();
        const pointer = stage.getPointerPosition();
        if (pointer) {
          onHover(position, container.left + pointer.x, container.top + pointer.y);
        }
      }
    }, HOVER_DELAY);
    setHoverTimeout(timeout);
  }, [onHover, position]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsHovered(false);
    if (onHoverEnd) {
      onHoverEnd();
    }
  }, [hoverTimeout, onHoverEnd]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  useEffect(() => {
    if (!isFocused) return;

    let animationFrame: number;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      const progress = (elapsed % 1000) / 1000;
      const pulse = Math.sin(progress * Math.PI * 2);
      
      setPulseOpacity(0.4 + pulse * 0.4);
      setPulseRadius(size + 12 + pulse * 6);
      
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isFocused, size]);

  // Handle rotation drag
  const handleRotationDrag = (e: any) => {
    if (!onRotationChange) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Calculate angle from center to pointer
    const dx = pointer.x - x * currentScale;
    const dy = pointer.y - y * currentScale;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    
    // Snap to 15-degree increments if holding shift
    if (e.evt?.shiftKey) {
      angle = Math.round(angle / 15) * 15;
    }
    
    // Normalize to 0-360
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;
    
    onRotationChange(angle);
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={editable && !isRotating}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        let newX = e.target.x() / stageWidth;
        let newY = e.target.y() / stageHeight;
        
        // Apply snap if enabled
        if (snapToGrid) {
          newX = snapValue(e.target.x()) / stageWidth;
          newY = snapValue(e.target.y()) / stageHeight;
        }
        
        // Clamp values between 0 and 1
        const clampedX = Math.max(0, Math.min(1, newX));
        const clampedY = Math.max(0, Math.min(1, newY));
        onDragEnd(clampedX, clampedY);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main equipment group with rotation */}
      <Group rotation={position.rotation || 0}>
        {/* Pulsating focus ring */}
        {isFocused && (
          <Circle
            radius={pulseRadius}
            fill="transparent"
            stroke="#fbbf24"
            strokeWidth={3}
            opacity={pulseOpacity}
            shadowColor="#fbbf24"
            shadowBlur={15}
            shadowOpacity={0.6}
          />
        )}

        {/* Outer glow when selected */}
        {isSelected && !isFocused && (
          <Circle
            radius={size + 8}
            fill="transparent"
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[4, 4]}
            opacity={0.8}
          />
        )}

        {/* Hover glow */}
        {isHovered && !isSelected && !isFocused && (
          <Circle
            radius={size + 6}
            fill="transparent"
            stroke="#60a5fa"
            strokeWidth={2}
            opacity={0.6}
          />
        )}
        
        {/* White halo for better visibility - increased opacity */}
        <Circle
          radius={size * 1.05}
          fill="rgba(255, 255, 255, 0.6)"
          stroke={typeColor}
          strokeWidth={2}
        />
        
        {/* Transparent background - no black circle */}
        <Circle
          radius={size * 0.9}
          fill="transparent"
          stroke={isDragging ? '#ffffff' : isFocused ? '#fbbf24' : isHovered ? '#60a5fa' : typeColor}
          strokeWidth={isDragging ? 3 : isFocused ? 3 : isHovered ? 3 : 2}
          shadowColor={typeColor}
          shadowBlur={8}
          shadowOpacity={0.4}
          opacity={isDragging ? 0.9 : 1}
        />
        
        {/* Equipment-specific SVG icon - increased 15% (0.75 * 1.15 = 0.86) */}
        <FloorPlanEquipmentIcon
          type={equipmentType}
          size={size * 0.86}
          status={status}
        />
      </Group>
      
      {/* Rotation handle (only when selected and editable) */}
      {isSelected && editable && onRotationChange && (
        <Group>
          {/* Connector line */}
          <Line
            points={[0, 0, 0, -size - 25]}
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[4, 2]}
            opacity={0.7}
          />
          {/* Rotation handle */}
          <Circle
            y={-size - 30}
            radius={10}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragStart={() => setIsRotating(true)}
            onDragMove={handleRotationDrag}
            onDragEnd={() => setIsRotating(false)}
            cursor="grab"
          />
          {/* Rotation icon */}
          <Text
            y={-size - 37}
            x={-5}
            text="↻"
            fontSize={12}
            fill="#ffffff"
          />
        </Group>
      )}
      
      {/* Connection count badge */}
      {activeConnectionCount > 0 && (
        <Group x={size * 0.7} y={-size * 0.7}>
          <Circle
            radius={8 * compensatedScale}
            fill="#22c55e"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
          <Text
            text={String(activeConnectionCount)}
            fontSize={8 * compensatedScale}
            fill="#ffffff"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            offsetX={activeConnectionCount >= 10 ? 5 * compensatedScale : 2.5 * compensatedScale}
            offsetY={4 * compensatedScale}
          />
        </Group>
      )}
      
      {/* Label below marker (not rotated) */}
      <Text
        y={size * 0.9}
        text={displayLabel}
        fontSize={10 * compensatedScale}
        fill="#ffffff"
        align="center"
        offsetX={displayLabel.length * 2.5 * compensatedScale}
        shadowColor="#000000"
        shadowBlur={3}
        shadowOpacity={0.8}
      />
      
      {/* IP address */}
      {displayIp && (
        <Text
          y={size * 0.9 + 12 * compensatedScale}
          text={displayIp}
          fontSize={8 * compensatedScale}
          fill="#94a3b8"
          fontFamily="monospace"
          align="center"
          offsetX={displayIp.length * 2 * compensatedScale}
          shadowColor="#000000"
          shadowBlur={3}
          shadowOpacity={0.8}
        />
      )}
    </Group>
  );
}

export const EquipmentMarker = memo(EquipmentMarkerComponent);
