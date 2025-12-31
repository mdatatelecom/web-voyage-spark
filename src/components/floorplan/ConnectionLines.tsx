import { memo, useMemo } from 'react';
import { Line, Group, Circle, Text } from 'react-konva';
import { FloorPlanConnection } from '@/hooks/useFloorPlanConnections';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';

interface ConnectionLinesProps {
  connections: FloorPlanConnection[];
  positions: EquipmentPosition[];
  stageWidth: number;
  stageHeight: number;
  imageBounds: { x: number; y: number; width: number; height: number };
  currentScale?: number;
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
  currentScale = 1,
}: ConnectionLinesProps) {
  // Create a map of equipment_id to position for quick lookup
  const positionMap = new Map(positions.map(p => [p.equipment_id, p]));
  
  // Separate connections into full (both endpoints on plan) and partial (only one endpoint)
  const { fullConnections, partialConnections } = useMemo(() => {
    const full: Array<{ conn: FloorPlanConnection; posA: EquipmentPosition; posB: EquipmentPosition }> = [];
    const partial: Array<{ conn: FloorPlanConnection; pos: EquipmentPosition; isA: boolean }> = [];
    
    connections.forEach(conn => {
      const posA = positionMap.get(conn.equipment_a_id);
      const posB = positionMap.get(conn.equipment_b_id);
      
      if (posA && posB) {
        full.push({ conn, posA, posB });
      } else if (posA) {
        partial.push({ conn, pos: posA, isA: true });
      } else if (posB) {
        partial.push({ conn, pos: posB, isA: false });
      }
    });
    
    return { fullConnections: full, partialConnections: partial };
  }, [connections, positionMap]);

  const compensatedScale = Math.max(0.4, Math.min(2.5, 1 / currentScale));

  return (
    <Group>
      {/* Full connections - line between both points */}
      {fullConnections.map(({ conn, posA, posB }) => {
        const x1 = imageBounds.x + posA.position_x * imageBounds.width;
        const y1 = imageBounds.y + posA.position_y * imageBounds.height;
        const x2 = imageBounds.x + posB.position_x * imageBounds.width;
        const y2 = imageBounds.y + posB.position_y * imageBounds.height;

        const color = conn.cable_color || CABLE_COLORS[conn.cable_type] || CABLE_COLORS.other;
        const style = STATUS_STYLES[conn.status] || STATUS_STYLES.active;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLength = 8 * compensatedScale;

        return (
          <Group key={conn.id}>
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
            <Group x={midX} y={midY}>
              <Circle
                radius={12 * compensatedScale}
                fill="rgba(0, 0, 0, 0.7)"
                stroke={color}
                strokeWidth={1}
              />
              <Circle
                radius={4 * compensatedScale}
                fill={color}
                shadowColor={color}
                shadowBlur={6}
                shadowOpacity={0.8}
              />
            </Group>
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

      {/* Partial connections - indicator showing connection to external equipment */}
      {partialConnections.map(({ conn, pos, isA }) => {
        const x = imageBounds.x + pos.position_x * imageBounds.width;
        const y = imageBounds.y + pos.position_y * imageBounds.height;
        
        // External equipment name
        const externalName = isA ? conn.equipment_b_name : conn.equipment_a_name;
        
        const color = conn.cable_color || CABLE_COLORS[conn.cable_type] || CABLE_COLORS.other;
        
        // Draw a short dashed line going outward with external indicator
        const lineLength = 30 * compensatedScale;
        const angle = Math.PI / 4; // 45 degrees outward
        
        const endX = x + lineLength * Math.cos(angle);
        const endY = y - lineLength * Math.sin(angle);

        return (
          <Group key={`${conn.id}-partial`}>
            {/* Dashed line indicating external connection */}
            <Line
              points={[x, y, endX, endY]}
              stroke={color}
              strokeWidth={2}
              dash={[4, 4]}
              opacity={0.7}
              lineCap="round"
            />
            {/* External indicator circle */}
            <Circle
              x={endX}
              y={endY}
              radius={8 * compensatedScale}
              fill="rgba(0, 0, 0, 0.8)"
              stroke={color}
              strokeWidth={1.5}
            />
            {/* Arrow icon inside circle (→) */}
            <Text
              x={endX - 4 * compensatedScale}
              y={endY - 5 * compensatedScale}
              text="→"
              fontSize={10 * compensatedScale}
              fill={color}
              fontStyle="bold"
            />
            {/* Tooltip with external equipment name */}
            <Group x={endX + 12 * compensatedScale} y={endY - 8 * compensatedScale}>
              <Text
                text={externalName}
                fontSize={9 * compensatedScale}
                fill="#ffffff"
                padding={2}
              />
            </Group>
          </Group>
        );
      })}
    </Group>
  );
}

export const ConnectionLines = memo(ConnectionLinesComponent);
