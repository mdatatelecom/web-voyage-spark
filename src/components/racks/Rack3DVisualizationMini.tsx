import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Badge } from '@/components/ui/badge';
import { getEquipmentColor } from '@/constants/equipmentColors';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
}

interface Rack {
  id: string;
  name: string;
  size_u: number;
  equipment?: Equipment[];
}

interface Rack3DVisualizationMiniProps {
  rack: Rack;
}

function RackFrame({ sizeU }: { sizeU: number }) {
  const height = sizeU * 0.044;
  
  return (
    <group>
      {/* Front posts */}
      <mesh position={[-0.2, height / 2, 0.2]}>
        <boxGeometry args={[0.02, height, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.2, height / 2, 0.2]}>
        <boxGeometry args={[0.02, height, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Back posts */}
      <mesh position={[-0.2, height / 2, -0.2]}>
        <boxGeometry args={[0.02, height, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.2, height / 2, -0.2]}>
        <boxGeometry args={[0.02, height, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function EquipmentBlock({ equipment }: { equipment: Equipment }) {
  const uHeight = 0.044;
  const height = (equipment.position_u_end - equipment.position_u_start + 1) * uHeight;
  const yPosition = ((equipment.position_u_start - 1) * uHeight) + (height / 2);
  const color = getEquipmentColor(equipment.type);

  return (
    <mesh position={[0, yPosition, 0]}>
      <boxGeometry args={[0.38, height - 0.005, 0.35]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

export function Rack3DVisualizationMini({ rack }: Rack3DVisualizationMiniProps) {
  const equipment = rack.equipment || [];

  return (
    <div className="relative">
      <Badge className="absolute top-2 left-2 z-10">{rack.name}</Badge>
      <div className="w-full h-[300px] bg-muted rounded-lg">
        <Canvas
          camera={{ position: [1, 0.5, 1.2], fov: 50 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          
          <RackFrame sizeU={rack.size_u} />
          
          {equipment.map((eq) => (
            <EquipmentBlock key={eq.id} equipment={eq} />
          ))}
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 4}
          />
        </Canvas>
      </div>
    </div>
  );
}
