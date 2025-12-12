import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows, SoftShadows, Html } from '@react-three/drei';
import { useMemo, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { getEquipmentColor, getCableColor } from '@/constants/equipmentColors';
import { AirflowParticles } from './AirflowParticles';
import { Annotation3D } from './Annotation3D';
import { StatusLED } from './StatusLED';
import { DataCenterFloor } from './DataCenterFloor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useActivePortsByRack } from '@/hooks/useActivePortsByRack';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
  mount_side?: string;
  equipment_status?: string;
}

interface Connection {
  id: string;
  cable_type: string;
  equipment_a_id: string;
  equipment_b_id: string;
}

interface Annotation {
  id: string;
  rack_id: string;
  title: string;
  description?: string | null;
  annotation_type: string;
  position_u: number;
  position_side: string | null;
  priority: string | null;
  color?: string | null;
  icon?: string | null;
  due_date?: string | null;
}

interface Rack3DCanvasProps {
  rackId: string;
  sizeU: number;
  equipment: Equipment[];
  connections: Connection[];
  annotations: Annotation[];
  xrayMode: boolean;
  tourActive: boolean;
  tourIndex: number;
  airflowMode: 'off' | 'flow' | 'thermal' | 'both';
  showAnnotations: boolean;
  zoom: number;
  cameraPreset: 'front' | 'rear' | 'left' | 'right' | 'top' | 'iso' | null;
  resetCamera: number;
  onEquipmentClick?: (equipment: Equipment) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
}

// Material configurations
const MATERIAL_CONFIGS: Record<string, { metalness: number; roughness: number }> = {
  server: { metalness: 0.3, roughness: 0.7 },
  switch: { metalness: 0.5, roughness: 0.4 },
  router: { metalness: 0.5, roughness: 0.4 },
  firewall: { metalness: 0.4, roughness: 0.5 },
  storage: { metalness: 0.3, roughness: 0.7 },
  pdu: { metalness: 0.9, roughness: 0.1 },
  ups: { metalness: 0.8, roughness: 0.2 },
  patch_panel: { metalness: 0.6, roughness: 0.5 },
  default: { metalness: 0.4, roughness: 0.6 }
};

// Camera Controller
function CameraController({
  sizeU,
  zoom,
  cameraPreset,
  resetCamera,
  tourActive,
  tourIndex,
  equipment,
}: {
  sizeU: number;
  zoom: number;
  cameraPreset: string | null;
  resetCamera: number;
  tourActive: boolean;
  tourIndex: number;
  equipment: Equipment[];
}) {
  const { camera } = useThree();
  const initialPosition = useRef(new THREE.Vector3(1.5, sizeU * 0.022, 2));
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3(0, sizeU * 0.022, 0));

  // Handle camera presets
  useEffect(() => {
    if (cameraPreset) {
      const centerY = sizeU * 0.022;
      const distance = 2 / zoom;
      
      const positions: Record<string, THREE.Vector3> = {
        front: new THREE.Vector3(0, centerY, distance),
        rear: new THREE.Vector3(0, centerY, -distance),
        left: new THREE.Vector3(-distance, centerY, 0),
        right: new THREE.Vector3(distance, centerY, 0),
        top: new THREE.Vector3(0, centerY + distance, 0.1),
        iso: new THREE.Vector3(distance * 0.7, centerY + distance * 0.5, distance * 0.7),
      };
      
      targetPosition.current = positions[cameraPreset] || initialPosition.current;
      targetLookAt.current = new THREE.Vector3(0, centerY, 0);
    }
  }, [cameraPreset, sizeU, zoom]);

  // Handle reset
  useEffect(() => {
    if (resetCamera > 0) {
      targetPosition.current = initialPosition.current.clone();
      targetLookAt.current = new THREE.Vector3(0, sizeU * 0.022, 0);
    }
  }, [resetCamera, sizeU]);

  // Handle zoom changes
  useEffect(() => {
    const direction = camera.position.clone().normalize();
    const baseDistance = 2;
    targetPosition.current = direction.multiplyScalar(baseDistance / zoom);
  }, [zoom, camera]);

  // Animate camera
  useFrame((state, delta) => {
    if (tourActive && equipment.length > 0) {
      const target = equipment[tourIndex];
      const targetY = ((target.position_u_start - 1) * 0.044) + 0.1;
      const tourPosition = new THREE.Vector3(1.5, targetY, 2);
      camera.position.lerp(tourPosition, delta * 2);
      targetLookAt.current.set(0, targetY, 0);
    } else if (cameraPreset || resetCamera) {
      camera.position.lerp(targetPosition.current, delta * 5);
    }
    
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

// Rack Frame
function RackFrame({ sizeU }: { sizeU: number }) {
  const rackHeight = sizeU * 0.044;
  const rackWidth = 0.482;
  const rackDepth = 0.8;

  return (
    <group castShadow receiveShadow>
      <mesh position={[-rackWidth / 2, rackHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#404040" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[rackWidth / 2, rackHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#404040" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[rackWidth, rackDepth, 0.02]} />
        <meshStandardMaterial color="#303030" metalness={0.85} roughness={0.2} envMapIntensity={1.0} />
      </mesh>
      <mesh position={[0, rackHeight, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[rackWidth, rackDepth, 0.02]} />
        <meshStandardMaterial color="#303030" metalness={0.85} roughness={0.2} envMapIntensity={1.0} />
      </mesh>
    </group>
  );
}

// Cable 3D
function Cable3D({ startY, endY, cableType, xrayMode }: { startY: number; endY: number; cableType: string; xrayMode: boolean }) {
  const curve = useMemo(() => {
    const midY = (startY + endY) / 2;
    const curveOffset = 0.35;
    return new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.25, startY, 0.4),
      new THREE.Vector3(0.25 + curveOffset, startY + (midY - startY) / 2, 0.5),
      new THREE.Vector3(0.25 + curveOffset, endY - (endY - midY) / 2, 0.5),
      new THREE.Vector3(0.25, endY, 0.4)
    );
  }, [startY, endY]);

  const color = getCableColor(cableType);

  return (
    <mesh>
      <tubeGeometry args={[curve, 64, 0.005, 8, false]} />
      <meshStandardMaterial 
        color={color}
        emissive={color}
        emissiveIntensity={xrayMode ? 0.5 : 0.1}
        transparent={xrayMode}
        opacity={xrayMode ? 0.8 : 1}
      />
    </mesh>
  );
}

// Fan Animation
function FanAnimation({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.z += delta * 10;
  });
  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.02, 0.02, 0.005, 8]} />
      <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

// Port Visual
function PortVisual({ position, status }: { position: [number, number, number]; status: 'available' | 'in_use' }) {
  const color = status === 'in_use' ? '#22c55e' : '#64748b';
  return (
    <mesh position={position}>
      <boxGeometry args={[0.008, 0.006, 0.004]} />
      <meshStandardMaterial 
        color={color}
        metalness={0.9}
        roughness={0.1}
        emissive={status === 'in_use' ? color : '#000000'}
        emissiveIntensity={status === 'in_use' ? 0.5 : 0}
      />
    </mesh>
  );
}

// Equipment Block with Rich Tooltip
function EquipmentBlock({
  equipment,
  sizeU,
  onClick,
  xrayMode,
  highlighted,
  activePortCount
}: {
  equipment: Equipment;
  sizeU: number;
  onClick?: () => void;
  xrayMode: boolean;
  highlighted: boolean;
  activePortCount: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize position (handle inverted start/end)
  const posStart = Math.min(equipment.position_u_start, equipment.position_u_end);
  const posEnd = Math.max(equipment.position_u_start, equipment.position_u_end);
  const heightUs = posEnd - posStart + 1;
  const height = heightUs * 0.044;
  const width = 0.44;
  const depth = 0.75;
  const yPosition = ((posStart - 1) * 0.044) + (height / 2);
  const mountSide = equipment.mount_side || 'front';
  const zPosition = mountSide === 'rear' ? -0.3 : 0;
  const color = getEquipmentColor(equipment.type);
  const emissive = (hovered || highlighted) ? color : '#000000';
  const emissiveIntensity = (hovered || highlighted) ? 0.4 : 0;
  const materialConfig = MATERIAL_CONFIGS[equipment.type] || MATERIAL_CONFIGS.default;
  const hasFans = ['server', 'switch', 'router', 'storage'].includes(equipment.type);
  const portCount = equipment.type === 'switch' ? 24 : equipment.type === 'router' ? 8 : 0;

  return (
    <group position={[0, yPosition, zPosition]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={materialConfig.metalness}
          roughness={materialConfig.roughness}
          transparent={xrayMode}
          opacity={xrayMode ? 0.3 : 1}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Status LEDs */}
      {!xrayMode && (
        <>
          <StatusLED position={[width / 2 - 0.02, height / 2 - 0.01, depth / 2 + 0.001]} status="online" />
          <StatusLED position={[width / 2 - 0.05, height / 2 - 0.01, depth / 2 + 0.001]} status="warning" size={0.006} />
        </>
      )}

      {/* Fans */}
      {hasFans && !xrayMode && (
        <>
          <FanAnimation position={[-width / 4, 0, -depth / 2 - 0.005]} />
          <FanAnimation position={[width / 4, 0, -depth / 2 - 0.005]} />
        </>
      )}

      {/* Ports - use real active port data */}
      {portCount > 0 && !xrayMode && (
        <group>
          {Array.from({ length: Math.min(portCount, 12) }).map((_, i) => {
            const xPos = -width / 2 + 0.05 + (i * 0.035);
            // Use real active port count to determine which ports are active
            const status = i < activePortCount ? 'in_use' : 'available';
            return <PortVisual key={i} position={[xPos, -height / 2 + 0.01, depth / 2 + 0.001]} status={status} />;
          })}
        </group>
      )}

      {/* Equipment label */}
      {!xrayMode && (
        <>
          <Text position={[0, 0, depth / 2 + 0.001]} fontSize={0.03} color="white" anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
            {equipment.name}
          </Text>
          <Text position={[0, -0.02, depth / 2 + 0.001]} fontSize={0.02} color="#cccccc" anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
            {equipment.type.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </>
      )}

      {/* Rich HTML Tooltip */}
      {showTooltip && (
        <Html position={[width / 2 + 0.1, height / 2, depth / 2]} center>
          <div className="bg-popover border rounded-lg shadow-xl p-3 min-w-[200px] animate-in fade-in zoom-in-95">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm">{equipment.name}</h4>
                <Badge variant="outline" className="text-xs">{heightUs}U</Badge>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">Tipo:</span> {equipment.type.replace(/_/g, ' ')}</p>
                <p><span className="font-medium text-foreground">Posição:</span> U{equipment.position_u_start}-U{equipment.position_u_end}</p>
                <p><span className="font-medium text-foreground">Montagem:</span> {mountSide === 'rear' ? 'Traseira' : 'Frontal'}</p>
                {equipment.manufacturer && (
                  <p><span className="font-medium text-foreground">Fabricante:</span> {equipment.manufacturer}</p>
                )}
                {equipment.model && (
                  <p><span className="font-medium text-foreground">Modelo:</span> {equipment.model}</p>
                )}
                {activePortCount > 0 && (
                  <p className="text-green-500"><span className="font-medium">🔌 Portas ativas:</span> {activePortCount}</p>
                )}
              </div>
              <Button size="sm" className="w-full text-xs h-7" onClick={onClick}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Ver Detalhes
              </Button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// U Labels
function ULabels({ sizeU }: { sizeU: number }) {
  const labels = useMemo(() => {
    const result = [];
    for (let i = 1; i <= sizeU; i++) {
      const yPos = (i - 1) * 0.044 + 0.022;
      result.push(
        <Text key={`label-left-${i}`} position={[-0.27, yPos, 0]} fontSize={0.015} color="#888888" anchorX="center" anchorY="middle">
          {i}
        </Text>
      );
      result.push(
        <Text key={`label-right-${i}`} position={[0.27, yPos, 0]} fontSize={0.015} color="#888888" anchorX="center" anchorY="middle">
          {i}
        </Text>
      );
    }
    return result;
  }, [sizeU]);
  return <group>{labels}</group>;
}

// Main Canvas Component
export default function Rack3DCanvas({
  rackId,
  sizeU,
  equipment,
  connections,
  annotations,
  xrayMode,
  tourActive,
  tourIndex,
  airflowMode,
  showAnnotations,
  zoom,
  cameraPreset,
  resetCamera,
  onEquipmentClick,
  onAnnotationClick,
}: Rack3DCanvasProps) {
  // Get active ports for this rack in realtime
  const { getActivePortIdsForEquipment } = useActivePortsByRack(rackId);

  return (
    <Canvas
      camera={{ position: [1.5, sizeU * 0.022, 2], fov: 50 }}
      shadows
      gl={{ 
        toneMapping: THREE.ACESFilmicToneMapping, 
        toneMappingExposure: 1.2
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      className="w-full h-full"
    >
      {/* Camera Controller */}
      <CameraController
        sizeU={sizeU}
        zoom={zoom}
        cameraPreset={cameraPreset}
        resetCamera={resetCamera}
        tourActive={tourActive}
        tourIndex={tourIndex}
        equipment={equipment}
      />

      {/* Environment */}
      <Environment preset="warehouse" environmentIntensity={0.8} />
      <SoftShadows size={40} samples={16} focus={0.5} />
      <ContactShadows position={[0, -0.05, 0]} opacity={0.4} scale={10} blur={2} far={4} />

      {/* Lighting */}
      <ambientLight intensity={xrayMode ? 0.3 : 0.2} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={xrayMode ? 0.8 : 0.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <pointLight position={[-3, 3, 3]} intensity={0.3} color="#ffffff" />
      <pointLight position={[3, 3, -3]} intensity={0.3} color="#ffffff" />

      {/* Rack */}
      <RackFrame sizeU={sizeU} />
      <ULabels sizeU={sizeU} />

      {/* Equipment */}
      {equipment.map((eq) => {
        const activePortIds = getActivePortIdsForEquipment(eq.id);
        return (
          <EquipmentBlock
            key={eq.id}
            equipment={eq}
            sizeU={sizeU}
            onClick={() => onEquipmentClick?.(eq)}
            xrayMode={xrayMode}
            highlighted={tourActive && equipment[tourIndex]?.id === eq.id}
            activePortCount={activePortIds.length}
          />
        );
      })}

      {/* Cables */}
      {connections.map(conn => {
        const equipA = equipment.find(e => e.id === conn.equipment_a_id);
        const equipB = equipment.find(e => e.id === conn.equipment_b_id);
        if (!equipA || !equipB) return null;
        const startY = ((equipA.position_u_start - 1) * 0.044) + 0.022;
        const endY = ((equipB.position_u_start - 1) * 0.044) + 0.022;
        return <Cable3D key={conn.id} startY={startY} endY={endY} cableType={conn.cable_type} xrayMode={xrayMode} />;
      })}

      {/* Floor */}
      <DataCenterFloor size={10} />

      {/* Airflow */}
      {(airflowMode === 'flow' || airflowMode === 'both') && (
        <AirflowParticles equipment={equipment} sizeU={sizeU} enabled={true} />
      )}

      {/* Annotations */}
      {showAnnotations && annotations.map(annotation => (
        <Annotation3D
          key={annotation.id}
          annotation={annotation}
          sizeU={sizeU}
          onClick={() => onAnnotationClick?.(annotation)}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={!tourActive}
        minDistance={0.5}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
