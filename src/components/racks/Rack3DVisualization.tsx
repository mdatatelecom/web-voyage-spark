import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useMemo, useState } from 'react';
import * as THREE from 'three';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
}

interface Rack3DVisualizationProps {
  rackId: string;
  sizeU: number;
  equipment: Equipment[];
  onEquipmentClick?: (equipment: Equipment) => void;
}

// Equipment colors by type
const EQUIPMENT_COLORS: Record<string, string> = {
  switch: '#3b82f6',
  router: '#10b981',
  server: '#f97316',
  patch_panel: '#6b7280',
  patch_panel_fiber: '#6b7280',
  firewall: '#ef4444',
  storage: '#ec4899',
  pdu: '#8b5cf6',
  ups: '#eab308',
  load_balancer: '#14b8a6',
  waf: '#f59e0b',
  access_point: '#06b6d4',
  dvr: '#84cc16',
  nvr: '#84cc16',
  pabx: '#a855f7',
  voip_gateway: '#a855f7',
  modem: '#22c55e',
  olt: '#0ea5e9',
  onu: '#0ea5e9',
  kvm: '#6366f1',
  console_server: '#6366f1',
  other: '#9ca3af',
};

// Rack Frame Component
function RackFrame({ sizeU }: { sizeU: number }) {
  const rackHeight = sizeU * 0.044; // 44mm per U in meters
  const rackWidth = 0.482; // Standard 19" rack width
  const rackDepth = 0.8; // 800mm depth

  return (
    <group>
      {/* Left rail */}
      <mesh position={[-rackWidth / 2, rackHeight / 2, 0]}>
        <boxGeometry args={[0.02, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Right rail */}
      <mesh position={[rackWidth / 2, rackHeight / 2, 0]}>
        <boxGeometry args={[0.02, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Base */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[rackWidth, rackDepth, 0.02]} />
        <meshStandardMaterial color="#303030" metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Top */}
      <mesh position={[0, rackHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[rackWidth, rackDepth, 0.02]} />
        <meshStandardMaterial color="#303030" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Equipment Block Component
function EquipmentBlock({
  equipment,
  sizeU,
  onClick,
}: {
  equipment: Equipment;
  sizeU: number;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const heightUs = equipment.position_u_end - equipment.position_u_start + 1;
  const height = heightUs * 0.044; // 44mm per U
  const width = 0.44; // Slightly less than rack width for visibility
  const depth = 0.75; // Depth of equipment
  
  // Calculate Y position (from bottom)
  const yPosition = ((equipment.position_u_start - 1) * 0.044) + (height / 2);
  
  const color = EQUIPMENT_COLORS[equipment.type] || EQUIPMENT_COLORS.other;
  const emissive = hovered ? color : '#000000';
  const emissiveIntensity = hovered ? 0.3 : 0;

  return (
    <group position={[0, yPosition, 0]}>
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* Equipment label */}
      <Text
        position={[0, 0, depth / 2 + 0.001]}
        fontSize={0.03}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 0.9}
      >
        {equipment.name}
      </Text>
      
      {/* Type label */}
      <Text
        position={[0, -0.02, depth / 2 + 0.001]}
        fontSize={0.02}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 0.9}
      >
        {equipment.type.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </group>
  );
}

// U Labels Component
function ULabels({ sizeU }: { sizeU: number }) {
  const labels = useMemo(() => {
    const result = [];
    for (let i = 1; i <= sizeU; i++) {
      const yPos = (i - 1) * 0.044 + 0.022; // Center of each U
      result.push(
        <Text
          key={`label-left-${i}`}
          position={[-0.27, yPos, 0]}
          fontSize={0.015}
          color="#888888"
          anchorX="center"
          anchorY="middle"
        >
          {i}
        </Text>
      );
      result.push(
        <Text
          key={`label-right-${i}`}
          position={[0.27, yPos, 0]}
          fontSize={0.015}
          color="#888888"
          anchorX="center"
          anchorY="middle"
        >
          {i}
        </Text>
      );
    }
    return result;
  }, [sizeU]);

  return <group>{labels}</group>;
}

// Main Component
export function Rack3DVisualization({
  rackId,
  sizeU,
  equipment,
  onEquipmentClick,
}: Rack3DVisualizationProps) {
  return (
    <div className="w-full h-[600px] bg-background rounded-lg border">
      <Canvas
        camera={{ position: [1.5, sizeU * 0.022, 2], fov: 50 }}
        shadows
      >
        {/* Lights */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, 5]} intensity={0.3} />
        <pointLight position={[5, 5, -5]} intensity={0.3} />
        
        {/* Rack */}
        <RackFrame sizeU={sizeU} />
        
        {/* U Labels */}
        <ULabels sizeU={sizeU} />
        
        {/* Equipment */}
        {equipment.map((eq) => (
          <EquipmentBlock
            key={eq.id}
            equipment={eq}
            sizeU={sizeU}
            onClick={() => onEquipmentClick?.(eq)}
          />
        ))}
        
        {/* Grid floor */}
        <gridHelper args={[3, 20, '#333333', '#222222']} position={[0, -0.05, 0]} />
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
