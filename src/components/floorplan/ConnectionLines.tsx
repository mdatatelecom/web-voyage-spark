import { memo } from 'react';
import { Line, Group, Text, Circle } from 'react-konva';
import { FloorPlanConnection } from '@/hooks/useFloorPlanConnections';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';

interface ConnectionLinesProps {
  connections: FloorPlanConnection[];
  positions: EquipmentPosition[];
  stageWidth: number;
  stageHeight: number;
  imageBounds: { x: number; y: number; width: number; height: number };
}

const CABLE_COLORS: Record<string, string> = {
  utp_cat5e: '#22c55e',
  utp_cat6: '#3b82f6',
  utp_cat6a: '#8b5cf6',
  fiber_om3: '#f97316',
  fiber_om4: '#ec4899',
  fiber_os2: '#eab308',
  dac: '#6b7280',
  other: '#94a3b8',
};

const STATUS_STYLES: Record<string, { dash: number[]; opacity: number }> = {
  active: { dash: [], opacity: 0.8 },
  inactive: { dash: [10, 5], opacity: 0.4 },
  testing: { dash: [5, 5], opacity: 0.6 },
  faulty: { dash: [3, 3], opacity: 0.8 },
  reserved: { dash: [15, 5], opacity: 0.5 },
};

function ConnectionLinesComponent({
  connections,
  positions,
  stageWidth,
  stageHeight,
  imageBounds,
}: ConnectionLinesProps) {
  // Create a map of equipment_id to position for quick lookup
  const positionMap = new Map(positions.map(p => [p.equipment_id, p]));

  return (
    <Group>
      {connections.map(conn => {
        const posA = positionMap.get(conn.equipment_a_id);
        const posB = positionMap.get(conn.equipment_b_id);

        if (!posA || !posB) return null;

        // Calculate actual coordinates
        const x1 = imageBounds.x + posA.position_x * imageBounds.width;
        const y1 = imageBounds.y + posA.position_y * imageBounds.height;
        const x2 = imageBounds.x + posB.position_x * imageBounds.width;
        const y2 = imageBounds.y + posB.position_y * imageBounds.height;

        const color = conn.cable_color || CABLE_COLORS[conn.cable_type] || CABLE_COLORS.other;
        const style = STATUS_STYLES[conn.status] || STATUS_STYLES.active;

        // Calculate midpoint for label
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Calculate angle for line
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLength = 8;

        return (
          <Group key={conn.id}>
            {/* Main connection line */}
            <Line
              points={[x1, y1, x2, y2]}
              stroke={color}
              strokeWidth={2}
              dash={style.dash}
              opacity={style.opacity}
              lineCap="round"
              lineJoin="round"
              shadowColor={color}
              shadowBlur={4}
              shadowOpacity={0.3}
            />

            {/* Connection code label at midpoint */}
            <Group x={midX} y={midY}>
              {/* Background for label */}
              <Circle
                radius={12}
                fill="rgba(0, 0, 0, 0.7)"
                stroke={color}
                strokeWidth={1}
              />
              {/* Connection indicator dot */}
              <Circle
                radius={4}
                fill={color}
                shadowColor={color}
                shadowBlur={6}
                shadowOpacity={0.8}
              />
            </Group>

            {/* Arrow at end point */}
            <Line
              points={[
                x2 - arrowLength * Math.cos(angle - Math.PI / 6),
                y2 - arrowLength * Math.sin(angle - Math.PI / 6),
                x2,
                y2,
                x2 - arrowLength * Math.cos(angle + Math.PI / 6),
                y2 - arrowLength * Math.sin(angle + Math.PI / 6),
              ]}
              stroke={color}
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
              opacity={style.opacity}
            />
          </Group>
        );
      })}
    </Group>
  );
}

export const ConnectionLines = memo(ConnectionLinesComponent);
