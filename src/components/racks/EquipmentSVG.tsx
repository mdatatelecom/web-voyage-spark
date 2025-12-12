import { ServerPattern } from './equipment-patterns/ServerPattern';
import { SwitchPattern } from './equipment-patterns/SwitchPattern';
import { StoragePattern } from './equipment-patterns/StoragePattern';
import { PatchPanelPattern } from './equipment-patterns/PatchPanelPattern';
import { PDUPattern } from './equipment-patterns/PDUPattern';
import { GenericPattern } from './equipment-patterns/GenericPattern';
import { FirewallPattern } from './equipment-patterns/FirewallPattern';
import { UPSPattern } from './equipment-patterns/UPSPattern';
import { RouterPattern } from './equipment-patterns/RouterPattern';
import { NVRPattern } from './equipment-patterns/NVRPattern';
import { AccessPointPattern } from './equipment-patterns/AccessPointPattern';
import { KVMPattern } from './equipment-patterns/KVMPattern';
import { TelecomPattern } from './equipment-patterns/TelecomPattern';
import { EnvironmentalPattern } from './equipment-patterns/EnvironmentalPattern';
import { MediaConverterPattern } from './equipment-patterns/MediaConverterPattern';
import { PoEDevicePattern } from './equipment-patterns/PoEDevicePattern';
import { IPCameraPattern } from './equipment-patterns/IPCameraPattern';

interface EquipmentSVGProps {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  model?: string;
  isHovered: boolean;
  status?: string;
  activePortIds?: string[];
}

export const EquipmentSVG = ({
  type,
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
}: EquipmentSVGProps) => {
  // Route to appropriate pattern based on equipment type
  switch (type) {
    case 'server':
      return (
        <ServerPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    case 'switch':
      return (
        <SwitchPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          isPoe={false}
          status={status}
        />
      );
    
    case 'switch_poe':
      return (
        <SwitchPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          isPoe={true}
          status={status}
        />
      );
    
    case 'router':
      return (
        <RouterPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    case 'firewall':
      return (
        <FirewallPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          subtype="firewall"
        />
      );
    
    case 'waf':
      return (
        <FirewallPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          subtype="waf"
        />
      );
    
    case 'load_balancer':
      return (
        <FirewallPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          subtype="load_balancer"
        />
      );
    
    case 'storage':
      return (
        <StoragePattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    case 'patch_panel':
      return (
        <PatchPanelPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          isHovered={isHovered}
          isFiber={false}
        />
      );
    
    case 'patch_panel_fiber':
      return (
        <PatchPanelPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          isHovered={isHovered}
          isFiber={true}
        />
      );
    
    case 'pdu':
      return (
        <PDUPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          isSmart={false}
          status={status}
        />
      );
    
    case 'pdu_smart':
      return (
        <PDUPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          isSmart={true}
          status={status}
        />
      );
    
    case 'ups':
      return (
        <UPSPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    case 'dvr':
      return (
        <NVRPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isNVR={false}
        />
      );
    
    case 'nvr':
      return (
        <NVRPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isNVR={true}
        />
      );
    
    case 'access_point':
      return (
        <AccessPointPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    case 'kvm':
      return (
        <KVMPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isConsoleServer={false}
        />
      );
    
    case 'console_server':
      return (
        <KVMPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isConsoleServer={true}
        />
      );
    
    case 'pabx':
    case 'voip_gateway':
    case 'modem':
    case 'olt':
    case 'onu':
    case 'dslam':
    case 'msan':
      return (
        <TelecomPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          subtype={type as 'pabx' | 'voip_gateway' | 'modem' | 'olt' | 'onu' | 'dslam' | 'msan'}
        />
      );
    
    case 'environment_sensor':
    case 'rack_monitor':
      return (
        <EnvironmentalPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          subtype={type as 'environment_sensor' | 'rack_monitor'}
        />
      );
    
    case 'media_converter':
      return (
        <MediaConverterPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isChassis={false}
        />
      );
    
    case 'media_converter_chassis':
      return (
        <MediaConverterPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isChassis={true}
        />
      );
    
    case 'poe_injector':
      return (
        <PoEDevicePattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isSplitter={false}
        />
      );
    
    case 'poe_splitter':
      return (
        <PoEDevicePattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
          isSplitter={true}
        />
      );
    
    case 'ip_camera':
      return (
        <IPCameraPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
    
    // Cable organizers - simple representation
    case 'cable_organizer_horizontal':
    case 'brush_panel':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={isHovered ? "#475569" : "#334155"}
            stroke="#1e293b"
            strokeWidth="1"
            rx="1"
          />
          {/* Brush/fingers pattern */}
          {Array.from({ length: Math.floor(width / 8) }).map((_, i) => (
            <rect
              key={i}
              x={x + 4 + i * 8}
              y={y + 2}
              width={4}
              height={height - 4}
              fill="#1e293b"
              rx="1"
            />
          ))}
        </g>
      );
    
    case 'cable_organizer_vertical':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={isHovered ? "#374151" : "#1f2937"}
            stroke="#111827"
            strokeWidth="1"
            rx="2"
            fillOpacity="0.8"
          />
          <text
            x={x + width / 2}
            y={y + height / 2 + 3}
            fill="#6b7280"
            fontSize="7"
            textAnchor="middle"
          >
            VCM
          </text>
        </g>
      );
    
    case 'fixed_shelf':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={isHovered ? "#57534e" : "#44403c"}
            stroke="#292524"
            strokeWidth="1"
            rx="1"
          />
          {/* Shelf perforations */}
          {Array.from({ length: Math.floor(width / 20) }).map((_, i) => (
            <circle
              key={i}
              cx={x + 15 + i * 20}
              cy={y + height / 2}
              r={3}
              fill="#292524"
            />
          ))}
        </g>
      );
    
    default:
      return (
        <GenericPattern
          x={x}
          y={y}
          width={width}
          height={height}
          name={name}
          type={type}
          manufacturer={manufacturer}
          isHovered={isHovered}
          status={status}
        />
      );
  }
};
