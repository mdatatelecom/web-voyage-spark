import { ServerPattern } from './equipment-patterns/ServerPattern';
import { SwitchPattern } from './equipment-patterns/SwitchPattern';
import { StoragePattern } from './equipment-patterns/StoragePattern';
import { PatchPanelPattern } from './equipment-patterns/PatchPanelPattern';
import { PDUPattern } from './equipment-patterns/PDUPattern';
import { GenericPattern } from './equipment-patterns/GenericPattern';

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
        />
      );
    
    case 'switch':
    case 'router':
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
        />
      );
  }
};
