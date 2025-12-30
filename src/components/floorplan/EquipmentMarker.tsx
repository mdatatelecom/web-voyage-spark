import { memo } from 'react';
import { Circle, Group, Text } from 'react-konva';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';

interface EquipmentMarkerProps {
  position: EquipmentPosition;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  isDragging: boolean;
  editable: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

const EQUIPMENT_ICONS: Record<string, { color: string; emoji: string }> = {
  ip_camera: { color: '#22c55e', emoji: '📹' },
  nvr: { color: '#3b82f6', emoji: '🖥️' },
  dvr: { color: '#3b82f6', emoji: '📼' },
  switch: { color: '#8b5cf6', emoji: '🔀' },
  switch_poe: { color: '#8b5cf6', emoji: '⚡' },
  access_point: { color: '#f59e0b', emoji: '📡' },
  router: { color: '#06b6d4', emoji: '🌐' },
  firewall: { color: '#ef4444', emoji: '🛡️' },
  server: { color: '#64748b', emoji: '🖧' },
  pdu: { color: '#f97316', emoji: '⚡' },
  ups: { color: '#84cc16', emoji: '🔋' },
  environment_sensor: { color: '#14b8a6', emoji: '🌡️' },
  default: { color: '#6b7280', emoji: '📦' },
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  online: '#22c55e',
  offline: '#ef4444',
  inactive: '#ef4444',
  warning: '#eab308',
  maintenance: '#3b82f6',
  planned: '#8b5cf6',
};

const SIZE_MAP: Record<string, number> = {
  small: 16,
  medium: 24,
  large: 32,
};

function EquipmentMarkerComponent({
  position,
  stageWidth,
  stageHeight,
  isSelected,
  isDragging,
  editable,
  onSelect,
  onDragStart,
  onDragEnd,
}: EquipmentMarkerProps) {
  const equipment = position.equipment;
  const equipmentType = equipment?.type || 'default';
  const config = EQUIPMENT_ICONS[equipmentType] || EQUIPMENT_ICONS.default;
  const status = equipment?.equipment_status || 'active';
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.active;
  
  const size = SIZE_MAP[position.icon_size] || SIZE_MAP.medium;
  
  // Convert relative position (0-1) to actual coordinates
  const x = position.position_x * stageWidth;
  const y = position.position_y * stageHeight;

  const displayLabel = position.custom_label || equipment?.name || 'Equipamento';
  const displayIp = equipment?.ip_address || '';

  return (
    <Group
      x={x}
      y={y}
      draggable={editable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        const newX = e.target.x() / stageWidth;
        const newY = e.target.y() / stageHeight;
        // Clamp values between 0 and 1
        const clampedX = Math.max(0, Math.min(1, newX));
        const clampedY = Math.max(0, Math.min(1, newY));
        onDragEnd(clampedX, clampedY);
      }}
      rotation={position.rotation}
    >
      {/* Outer glow when selected */}
      {isSelected && (
        <Circle
          radius={size + 8}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 4]}
          opacity={0.8}
        />
      )}
      
      {/* Main circle */}
      <Circle
        radius={size}
        fill={config.color}
        stroke={isDragging ? '#ffffff' : statusColor}
        strokeWidth={isDragging ? 3 : 2}
        shadowColor="#000000"
        shadowBlur={isDragging ? 10 : 5}
        shadowOpacity={0.3}
        opacity={isDragging ? 0.8 : 1}
      />
      
      {/* Status LED indicator */}
      <Circle
        x={size * 0.7}
        y={-size * 0.7}
        radius={5}
        fill={statusColor}
        stroke="#ffffff"
        strokeWidth={1}
        shadowColor={statusColor}
        shadowBlur={4}
        shadowOpacity={0.5}
      />
      
      {/* Equipment type emoji */}
      <Text
        text={config.emoji}
        fontSize={size * 0.8}
        align="center"
        verticalAlign="middle"
        offsetX={size * 0.4}
        offsetY={size * 0.4}
      />
      
      {/* Label below marker */}
      <Text
        y={size + 4}
        text={displayLabel}
        fontSize={10}
        fill="#ffffff"
        align="center"
        offsetX={displayLabel.length * 2.5}
        shadowColor="#000000"
        shadowBlur={3}
        shadowOpacity={0.8}
      />
      
      {/* IP address */}
      {displayIp && (
        <Text
          y={size + 16}
          text={displayIp}
          fontSize={8}
          fill="#94a3b8"
          fontFamily="monospace"
          align="center"
          offsetX={displayIp.length * 2}
          shadowColor="#000000"
          shadowBlur={3}
          shadowOpacity={0.8}
        />
      )}
    </Group>
  );
}

export const EquipmentMarker = memo(EquipmentMarkerComponent);
