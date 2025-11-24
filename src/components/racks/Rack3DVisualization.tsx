import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Eye, EyeOff, Wind, Flame } from 'lucide-react';
import { getEquipmentColor, getCableColor } from '@/constants/equipmentColors';
import { AirflowParticles } from './AirflowParticles';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
  mount_side?: string;
}

interface Rack3DVisualizationProps {
  rackId: string;
  sizeU: number;
  equipment: Equipment[];
  onEquipmentClick?: (equipment: Equipment) => void;
}

interface Connection {
  id: string;
  cable_type: string;
  equipment_a_id: string;
  equipment_b_id: string;
}

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

// Cable 3D Component with Bezier Curves
function Cable3D({
  startY,
  endY,
  cableType,
  xrayMode
}: {
  startY: number;
  endY: number;
  cableType: string;
  xrayMode: boolean;
}) {
  const curve = useMemo(() => {
    const midY = (startY + endY) / 2;
    const curveOffset = 0.35; // Curve out of the rack
    
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

// Equipment Block Component with X-ray support and rear mounting
function EquipmentBlock({
  equipment,
  sizeU,
  onClick,
  xrayMode,
  highlighted
}: {
  equipment: Equipment;
  sizeU: number;
  onClick?: () => void;
  xrayMode: boolean;
  highlighted: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  
  const heightUs = equipment.position_u_end - equipment.position_u_start + 1;
  const height = heightUs * 0.044; // 44mm per U
  const width = 0.44; // Slightly less than rack width for visibility
  const depth = 0.75; // Depth of equipment
  
  // Calculate Y position (from bottom)
  const yPosition = ((equipment.position_u_start - 1) * 0.044) + (height / 2);
  
  // Calculate Z position based on mount_side
  const mountSide = equipment.mount_side || 'front';
  const zPosition = mountSide === 'rear' ? -0.3 : 0;
  
  const color = getEquipmentColor(equipment.type);
  const emissive = (hovered || highlighted) ? color : '#000000';
  const emissiveIntensity = (hovered || highlighted) ? 0.4 : 0;

  return (
    <group position={[0, yPosition, zPosition]}>
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
          transparent={xrayMode}
          opacity={xrayMode ? 0.3 : 1}
        />
      </mesh>
      
      {/* Mount side indicator badge */}
      {mountSide === 'rear' && !xrayMode && (
        <mesh position={[0.18, height / 2 - 0.015, depth / 2 + 0.001]}>
          <planeGeometry args={[0.05, 0.02]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      )}
      
      {/* Equipment label */}
      {!xrayMode && (
        <>
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
        </>
      )}
      
      {/* Tooltip on hover */}
      {hovered && (
        <Text
          position={[0, height / 2 + 0.05, 0]}
          fontSize={0.025}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.002}
          outlineColor="#000000"
        >
          {`U${equipment.position_u_start}-U${equipment.position_u_end} (${heightUs}U)\n${mountSide === 'rear' ? '🔴 Traseira' : '🔵 Frontal'}\n${equipment.manufacturer || ''} ${equipment.model || ''}`}
        </Text>
      )}
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

// Camera Tour Controller
function CameraTourController({
  tourActive,
  tourIndex,
  equipment,
  onTourEnd
}: {
  tourActive: boolean;
  tourIndex: number;
  equipment: Equipment[];
  onTourEnd: () => void;
}) {
  const timeInPosition = useRef(0);
  const POSITION_DURATION = 3; // 3 seconds per equipment

  useFrame((state, delta) => {
    if (tourActive && equipment.length > 0) {
      const target = equipment[tourIndex];
      const targetY = ((target.position_u_start - 1) * 0.044) + 0.1;
      
      // Smooth camera movement
      const targetPos = new THREE.Vector3(1.5, targetY, 2);
      state.camera.position.lerp(targetPos, delta * 2);
      state.camera.lookAt(0, targetY, 0);
      
      // Track time in position
      timeInPosition.current += delta;
      
      // Move to next after duration
      if (timeInPosition.current >= POSITION_DURATION) {
        timeInPosition.current = 0;
        if (tourIndex >= equipment.length - 1) {
          onTourEnd();
        }
      }
    }
  });

  return null;
}

// Main Component
export function Rack3DVisualization({
  rackId,
  sizeU,
  equipment,
  onEquipmentClick,
}: Rack3DVisualizationProps) {
  const [xrayMode, setXrayMode] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [airflowMode, setAirflowMode] = useState<'off' | 'flow' | 'thermal' | 'both'>('off');

  // Fetch connections for this rack's equipment
  const { data: connections } = useQuery({
    queryKey: ['rack-connections', rackId],
    queryFn: async () => {
      const equipmentIds = equipment.map(e => e.id);
      if (equipmentIds.length === 0) return [];
      
      // Get all ports for this rack's equipment
      const { data: ports } = await supabase
        .from('ports')
        .select('id, equipment_id')
        .in('equipment_id', equipmentIds);
      
      if (!ports) return [];
      
      const portIds = ports.map(p => p.id);
      
      // Get connections involving these ports
      const { data, error } = await supabase
        .from('connections')
        .select('id, cable_type, port_a_id, port_b_id')
        .or(`port_a_id.in.(${portIds.join(',')}),port_b_id.in.(${portIds.join(',')})`)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Map ports to equipment
      const portToEquipment = new Map(ports.map(p => [p.id, p.equipment_id]));
      
      // Filter connections within this rack only
      return data
        .map(conn => ({
          id: conn.id,
          cable_type: conn.cable_type,
          equipment_a_id: portToEquipment.get(conn.port_a_id),
          equipment_b_id: portToEquipment.get(conn.port_b_id)
        }))
        .filter(c => 
          c.equipment_a_id && 
          c.equipment_b_id && 
          equipmentIds.includes(c.equipment_a_id) && 
          equipmentIds.includes(c.equipment_b_id)
        ) as Connection[];
    }
  });

  // Calculate measurements
  const measurements = useMemo(() => {
    const occupiedUs = equipment.reduce((total, eq) => {
      return total + (eq.position_u_end - eq.position_u_start + 1);
    }, 0);
    
    const availableUs = sizeU - occupiedUs;
    const occupancyPercentage = (occupiedUs / sizeU) * 100;
    const rackHeightM = sizeU * 0.044;
    const estimatedWeightKg = equipment.length * 15; // Rough estimate
    
    // Find available U ranges
    const occupiedPositions = new Set<number>();
    equipment.forEach(eq => {
      for (let u = eq.position_u_start; u <= eq.position_u_end; u++) {
        occupiedPositions.add(u);
      }
    });
    
    const availableRanges: string[] = [];
    let rangeStart: number | null = null;
    
    for (let u = 1; u <= sizeU; u++) {
      if (!occupiedPositions.has(u)) {
        if (rangeStart === null) rangeStart = u;
      } else {
        if (rangeStart !== null) {
          availableRanges.push(
            rangeStart === u - 1 ? `U${rangeStart}` : `U${rangeStart}-U${u - 1}`
          );
          rangeStart = null;
        }
      }
    }
    
    if (rangeStart !== null) {
      availableRanges.push(
        rangeStart === sizeU ? `U${rangeStart}` : `U${rangeStart}-U${sizeU}`
      );
    }
    
    return {
      occupiedUs,
      availableUs,
      occupancyPercentage,
      rackHeightM,
      estimatedWeightKg,
      availableRanges
    };
  }, [equipment, sizeU]);

  const handleTourStart = useCallback(() => {
    if (equipment.length === 0) return;
    setTourIndex(0);
    setTourActive(true);
  }, [equipment.length]);

  const handleTourEnd = useCallback(() => {
    setTourActive(false);
    setTourIndex(0);
  }, []);

  useEffect(() => {
    if (tourActive && equipment.length > 0) {
      const timer = setInterval(() => {
        setTourIndex(prev => {
          if (prev >= equipment.length - 1) {
            handleTourEnd();
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
      
      return () => clearInterval(timer);
    }
  }, [tourActive, equipment.length, handleTourEnd]);

  return (
    <div className="flex gap-4">
      {/* 3D Canvas */}
      <div className="flex-1 h-[600px] bg-background rounded-lg border relative">
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button
            variant={xrayMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setXrayMode(!xrayMode)}
          >
            {xrayMode ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Raio-X
          </Button>
          <Button
            variant={tourActive ? 'destructive' : 'outline'}
            size="sm"
            onClick={tourActive ? handleTourEnd : handleTourStart}
            disabled={equipment.length === 0}
          >
            {tourActive ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Tour
          </Button>
          
          {/* Airflow Controls */}
          <div className="flex flex-col gap-1 mt-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Simulação</p>
            <Button
              variant={airflowMode === 'flow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAirflowMode(airflowMode === 'flow' ? 'off' : 'flow')}
            >
              <Wind className="w-4 h-4 mr-2" />
              Airflow
            </Button>
            <Button
              variant={airflowMode === 'thermal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAirflowMode(airflowMode === 'thermal' ? 'off' : 'thermal')}
            >
              <Flame className="w-4 h-4 mr-2" />
              Térmico
            </Button>
          </div>
        </div>

        <Canvas
          camera={{ position: [1.5, sizeU * 0.022, 2], fov: 50 }}
          shadows
        >
          {/* Lights */}
          <ambientLight intensity={xrayMode ? 0.6 : 0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={xrayMode ? 1.2 : 0.8}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, 5, 5]} intensity={xrayMode ? 0.5 : 0.3} />
          <pointLight position={[5, 5, -5]} intensity={xrayMode ? 0.5 : 0.3} />
          
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
              xrayMode={xrayMode}
              highlighted={tourActive && equipment[tourIndex]?.id === eq.id}
            />
          ))}
          
          {/* Cables */}
          {connections?.map(conn => {
            const equipA = equipment.find(e => e.id === conn.equipment_a_id);
            const equipB = equipment.find(e => e.id === conn.equipment_b_id);
            
            if (!equipA || !equipB) return null;
            
            const startY = ((equipA.position_u_start - 1) * 0.044) + 0.022;
            const endY = ((equipB.position_u_start - 1) * 0.044) + 0.022;
            
            return (
              <Cable3D
                key={conn.id}
                startY={startY}
                endY={endY}
                cableType={conn.cable_type}
                xrayMode={xrayMode}
              />
            );
          })}
          
          {/* Grid floor */}
          <gridHelper args={[3, 20, '#333333', '#222222']} position={[0, -0.05, 0]} />
          
          {/* Airflow Particles */}
          {(airflowMode === 'flow' || airflowMode === 'both') && (
            <AirflowParticles
              equipment={equipment}
              sizeU={sizeU}
              enabled={true}
            />
          )}
          
          {/* Camera Tour Controller */}
          {tourActive && (
            <CameraTourController
              tourActive={tourActive}
              tourIndex={tourIndex}
              equipment={equipment}
              onTourEnd={handleTourEnd}
            />
          )}
          
          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={!tourActive}
            minDistance={1}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>

      {/* Measurements Panel */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-base">📊 Medições em Tempo Real</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Ocupação do Rack</span>
              <Badge variant={measurements.occupancyPercentage > 80 ? 'destructive' : 'secondary'}>
                {Math.round(measurements.occupancyPercentage)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {measurements.occupiedUs}U ocupados de {sizeU}U totais
            </p>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">Espaço Disponível</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {measurements.availableUs}U livres
              </p>
              {measurements.availableRanges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {measurements.availableRanges.map((range, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {range}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">Dimensões Físicas</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Altura: {measurements.rackHeightM.toFixed(2)}m ({sizeU}U × 44mm)</p>
              <p>Largura: 0.482m (19")</p>
              <p>Profundidade: 0.8m</p>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">Equipamentos</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{equipment.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conexões:</span>
                <span className="font-medium">{connections?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso estimado:</span>
                <span className="font-medium">~{measurements.estimatedWeightKg}kg</span>
              </div>
            </div>
          </div>

          {tourActive && (
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2">🎬 Tour em Progresso</p>
              <p className="text-xs text-muted-foreground">
                Equipamento {tourIndex + 1} de {equipment.length}
              </p>
              {equipment[tourIndex] && (
                <Badge className="mt-2 w-full justify-center">
                  {equipment[tourIndex].name}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
