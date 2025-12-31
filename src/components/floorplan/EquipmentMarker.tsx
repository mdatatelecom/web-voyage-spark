import { memo, useEffect, useState, useMemo } from 'react';
import { Circle, Group, Text, Line } from 'react-konva';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { FloorPlanEquipmentIcon } from './equipment-icons';

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
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
}

// Base sizes reduced by 70%
const SIZE_MAP: Record<string, number> = {
  small: 12,
  medium: 18,
  large: 24,
};

// Min/max scale for icon compensation
const MIN_ICON_SCALE = 0.4;
const MAX_ICON_SCALE = 2.5;

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
  onSelect,
  onDragStart,
  onDragEnd,
  onRotationChange,
}: EquipmentMarkerProps) {
  const equipment = position.equipment;
  const equipmentType = equipment?.type || 'default';
  const status = equipment?.equipment_status || 'active';
  
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
        
        {/* White halo for visibility */}
        <Circle
          radius={size * 0.95}
          fill="rgba(255, 255, 255, 0.15)"
          stroke="#ffffff"
          strokeWidth={1}
        />
        
        {/* Background circle */}
        <Circle
          radius={size * 0.8}
          fill="#1f2937"
          stroke={isDragging ? '#ffffff' : isFocused ? '#fbbf24' : '#ffffff'}
          strokeWidth={isDragging ? 3 : isFocused ? 3 : 2}
          shadowColor="#000000"
          shadowBlur={isDragging ? 12 : 8}
          shadowOpacity={0.5}
          opacity={isDragging ? 0.9 : 1}
        />
        
        {/* Equipment-specific SVG icon */}
        <FloorPlanEquipmentIcon
          type={equipmentType}
          size={size * 0.6}
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
