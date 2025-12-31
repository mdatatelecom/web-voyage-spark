import { memo } from 'react';
import { Group, Circle, Rect, Line, Arc, Path, Text } from 'react-konva';

interface FloorPlanEquipmentIconProps {
  type: string;
  size: number;
  status?: string;
}

// Colors by equipment type
const TYPE_COLORS: Record<string, string> = {
  ip_camera: '#22c55e',
  nvr: '#3b82f6',
  dvr: '#3b82f6',
  switch: '#8b5cf6',
  switch_poe: '#a855f7',
  access_point: '#f59e0b',
  router: '#06b6d4',
  firewall: '#ef4444',
  server: '#64748b',
  pdu: '#f97316',
  pdu_smart: '#f97316',
  ups: '#84cc16',
  environment_sensor: '#14b8a6',
  patch_panel: '#78716c',
  patch_panel_fiber: '#c084fc',
  media_converter: '#ec4899',
  kvm: '#6366f1',
  console_server: '#6366f1',
  pabx: '#0ea5e9',
  voip_gateway: '#0ea5e9',
  modem: '#64748b',
  olt: '#a3e635',
  onu: '#a3e635',
  storage: '#f59e0b',
  load_balancer: '#10b981',
  waf: '#ef4444',
  default: '#6b7280',
};

// Status LED colors
const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  online: '#22c55e',
  offline: '#ef4444',
  inactive: '#ef4444',
  warning: '#eab308',
  maintenance: '#3b82f6',
  planned: '#8b5cf6',
};

const getTypeColor = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.default;
const getStatusColor = (status?: string) => STATUS_COLORS[status || 'active'] || STATUS_COLORS.active;

// Camera Icon
const CameraIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Camera body */}
    <Rect
      x={-size * 0.4}
      y={-size * 0.3}
      width={size * 0.8}
      height={size * 0.6}
      fill={color}
      cornerRadius={size * 0.1}
    />
    {/* Lens */}
    <Circle
      x={0}
      y={0}
      radius={size * 0.2}
      fill="#1a1a2e"
      stroke="#ffffff"
      strokeWidth={1}
    />
    <Circle
      x={0}
      y={0}
      radius={size * 0.08}
      fill="#ffffff"
    />
    {/* IR LED indicator */}
    <Circle
      x={size * 0.25}
      y={-size * 0.15}
      radius={size * 0.05}
      fill="#ef4444"
    />
  </Group>
));

// NVR/DVR Icon
const RecorderIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.45}
      y={-size * 0.3}
      width={size * 0.9}
      height={size * 0.6}
      fill={color}
      cornerRadius={size * 0.08}
    />
    {/* HDD slots */}
    {[-0.25, 0, 0.25].map((offset, i) => (
      <Rect
        key={i}
        x={-size * 0.35 + i * size * 0.25}
        y={-size * 0.15}
        width={size * 0.18}
        height={size * 0.3}
        fill="#1a1a2e"
        cornerRadius={size * 0.03}
      />
    ))}
    {/* REC indicator */}
    <Circle
      x={size * 0.3}
      y={-size * 0.18}
      radius={size * 0.06}
      fill="#ef4444"
    />
  </Group>
));

// Switch Icon
const SwitchIcon = memo(({ size, color, isPoe }: { size: number; color: string; isPoe?: boolean }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.5}
      y={-size * 0.25}
      width={size}
      height={size * 0.5}
      fill={color}
      cornerRadius={size * 0.05}
    />
    {/* Ports */}
    {[-0.35, -0.15, 0.05, 0.25].map((offset, i) => (
      <Rect
        key={i}
        x={-size * 0.4 + i * size * 0.22}
        y={-size * 0.1}
        width={size * 0.15}
        height={size * 0.2}
        fill="#1a1a2e"
        cornerRadius={size * 0.02}
      />
    ))}
    {/* PoE indicator */}
    {isPoe && (
      <Text
        x={-size * 0.15}
        y={size * 0.12}
        text="⚡"
        fontSize={size * 0.2}
        fill="#fbbf24"
      />
    )}
  </Group>
));

// Access Point Icon
const AccessPointIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Body */}
    <Circle
      radius={size * 0.35}
      fill={color}
    />
    {/* Signal waves */}
    {[0.5, 0.65, 0.8].map((radius, i) => (
      <Arc
        key={i}
        angle={120}
        rotation={-60}
        innerRadius={size * radius}
        outerRadius={size * radius + 2}
        fill="#ffffff"
        opacity={0.8 - i * 0.2}
      />
    ))}
    {/* Center dot */}
    <Circle
      radius={size * 0.1}
      fill="#ffffff"
    />
  </Group>
));

// Router Icon
const RouterIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.45}
      y={-size * 0.25}
      width={size * 0.9}
      height={size * 0.5}
      fill={color}
      cornerRadius={size * 0.08}
    />
    {/* Globe symbol */}
    <Circle
      radius={size * 0.15}
      stroke="#ffffff"
      strokeWidth={1.5}
    />
    <Line
      points={[-size * 0.15, 0, size * 0.15, 0]}
      stroke="#ffffff"
      strokeWidth={1}
    />
    <Arc
      angle={180}
      rotation={-90}
      innerRadius={size * 0.08}
      outerRadius={size * 0.08 + 1}
      fill="#ffffff"
    />
    {/* Antennas */}
    <Line
      points={[-size * 0.35, -size * 0.25, -size * 0.35, -size * 0.45]}
      stroke="#ffffff"
      strokeWidth={2}
    />
    <Line
      points={[size * 0.35, -size * 0.25, size * 0.35, -size * 0.45]}
      stroke="#ffffff"
      strokeWidth={2}
    />
  </Group>
));

// Firewall Icon
const FirewallIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Shield shape */}
    <Line
      points={[
        0, -size * 0.4,
        size * 0.35, -size * 0.2,
        size * 0.35, size * 0.1,
        0, size * 0.4,
        -size * 0.35, size * 0.1,
        -size * 0.35, -size * 0.2,
      ]}
      closed
      fill={color}
      stroke="#ffffff"
      strokeWidth={1}
    />
    {/* Lock icon */}
    <Rect
      x={-size * 0.12}
      y={-size * 0.05}
      width={size * 0.24}
      height={size * 0.2}
      fill="#ffffff"
      cornerRadius={size * 0.03}
    />
    <Arc
      y={-size * 0.08}
      angle={180}
      rotation={-90}
      innerRadius={size * 0.08}
      outerRadius={size * 0.1}
      fill="#ffffff"
    />
  </Group>
));

// Server Icon
const ServerIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.35}
      y={-size * 0.4}
      width={size * 0.7}
      height={size * 0.8}
      fill={color}
      cornerRadius={size * 0.05}
    />
    {/* Vents/slots */}
    {[-0.25, -0.05, 0.15].map((offset, i) => (
      <Group key={i}>
        <Rect
          x={-size * 0.25}
          y={-size * 0.35 + i * size * 0.25}
          width={size * 0.5}
          height={size * 0.15}
          fill="#1a1a2e"
          cornerRadius={size * 0.02}
        />
        {/* Status LED */}
        <Circle
          x={size * 0.2}
          y={-size * 0.28 + i * size * 0.25}
          radius={size * 0.04}
          fill={i === 0 ? '#22c55e' : '#3b82f6'}
        />
      </Group>
    ))}
  </Group>
));

// PDU/UPS Icon
const PowerIcon = memo(({ size, color, isUps }: { size: number; color: string; isUps?: boolean }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.3}
      y={-size * 0.4}
      width={size * 0.6}
      height={size * 0.8}
      fill={color}
      cornerRadius={size * 0.05}
    />
    {isUps ? (
      /* Battery symbol */
      <Group>
        <Rect
          x={-size * 0.15}
          y={-size * 0.25}
          width={size * 0.3}
          height={size * 0.45}
          stroke="#ffffff"
          strokeWidth={2}
          cornerRadius={size * 0.03}
        />
        <Rect
          x={-size * 0.07}
          y={-size * 0.3}
          width={size * 0.14}
          height={size * 0.05}
          fill="#ffffff"
        />
        {/* Charge level */}
        <Rect
          x={-size * 0.12}
          y={-size * 0.1}
          width={size * 0.24}
          height={size * 0.25}
          fill="#22c55e"
          cornerRadius={size * 0.02}
        />
      </Group>
    ) : (
      /* Outlets */
      <>
        {[-0.15, 0.1].map((offset, i) => (
          <Group key={i}>
            <Rect
              x={-size * 0.12}
              y={-size * 0.25 + i * size * 0.3}
              width={size * 0.24}
              height={size * 0.18}
              fill="#1a1a2e"
              cornerRadius={size * 0.02}
            />
          </Group>
        ))}
      </>
    )}
  </Group>
));

// Sensor Icon
const SensorIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Thermometer body */}
    <Rect
      x={-size * 0.1}
      y={-size * 0.35}
      width={size * 0.2}
      height={size * 0.5}
      fill={color}
      cornerRadius={size * 0.1}
    />
    {/* Bulb */}
    <Circle
      y={size * 0.25}
      radius={size * 0.2}
      fill={color}
    />
    {/* Mercury */}
    <Circle
      y={size * 0.25}
      radius={size * 0.12}
      fill="#ef4444"
    />
    <Rect
      x={-size * 0.05}
      y={-size * 0.2}
      width={size * 0.1}
      height={size * 0.35}
      fill="#ef4444"
    />
  </Group>
));

// Patch Panel Icon
const PatchPanelIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    {/* Body */}
    <Rect
      x={-size * 0.5}
      y={-size * 0.2}
      width={size}
      height={size * 0.4}
      fill={color}
      cornerRadius={size * 0.03}
    />
    {/* Ports grid */}
    {[-0.38, -0.2, -0.02, 0.16, 0.34].map((offset, i) => (
      <Rect
        key={i}
        x={-size * 0.42 + i * size * 0.18}
        y={-size * 0.1}
        width={size * 0.12}
        height={size * 0.2}
        fill="#1a1a2e"
        cornerRadius={size * 0.02}
      />
    ))}
  </Group>
));

// Generic/Default Icon
const GenericIcon = memo(({ size, color }: { size: number; color: string }) => (
  <Group>
    <Rect
      x={-size * 0.35}
      y={-size * 0.35}
      width={size * 0.7}
      height={size * 0.7}
      fill={color}
      cornerRadius={size * 0.1}
    />
    <Text
      x={-size * 0.15}
      y={-size * 0.15}
      text="?"
      fontSize={size * 0.4}
      fill="#ffffff"
      fontStyle="bold"
    />
  </Group>
));

// Main component
function FloorPlanEquipmentIconComponent({ type, size, status }: FloorPlanEquipmentIconProps) {
  const color = getTypeColor(type);
  const statusColor = getStatusColor(status);
  
  const renderIcon = () => {
    switch (type) {
      case 'ip_camera':
        return <CameraIcon size={size} color={color} />;
      case 'nvr':
      case 'dvr':
        return <RecorderIcon size={size} color={color} />;
      case 'switch':
        return <SwitchIcon size={size} color={color} />;
      case 'switch_poe':
        return <SwitchIcon size={size} color={color} isPoe />;
      case 'access_point':
        return <AccessPointIcon size={size} color={color} />;
      case 'router':
      case 'modem':
        return <RouterIcon size={size} color={color} />;
      case 'firewall':
      case 'waf':
        return <FirewallIcon size={size} color={color} />;
      case 'server':
      case 'storage':
      case 'load_balancer':
        return <ServerIcon size={size} color={color} />;
      case 'pdu':
      case 'pdu_smart':
        return <PowerIcon size={size} color={color} />;
      case 'ups':
        return <PowerIcon size={size} color={color} isUps />;
      case 'environment_sensor':
      case 'rack_monitor':
        return <SensorIcon size={size} color={color} />;
      case 'patch_panel':
      case 'patch_panel_fiber':
        return <PatchPanelIcon size={size} color={color} />;
      case 'kvm':
      case 'console_server':
      case 'pabx':
      case 'voip_gateway':
      case 'olt':
      case 'onu':
      case 'media_converter':
      case 'media_converter_chassis':
        return <SwitchIcon size={size} color={color} />;
      default:
        return <GenericIcon size={size} color={color} />;
    }
  };

  return (
    <Group>
      {renderIcon()}
      {/* Status LED */}
      <Circle
        x={size * 0.35}
        y={-size * 0.35}
        radius={size * 0.12}
        fill={statusColor}
        stroke="#ffffff"
        strokeWidth={1}
        shadowColor={statusColor}
        shadowBlur={4}
        shadowOpacity={0.6}
      />
    </Group>
  );
}

export const FloorPlanEquipmentIcon = memo(FloorPlanEquipmentIconComponent);
