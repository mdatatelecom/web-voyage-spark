import { Html } from '@react-three/drei';
import { useState } from 'react';

interface RackAnnotation {
  id: string;
  rack_id: string;
  position_u: number;
  position_side: string;
  title: string;
  description?: string;
  annotation_type: string;
  priority: string;
  due_date?: string;
  color?: string;
  icon?: string;
}

interface Annotation3DProps {
  annotation: RackAnnotation;
  sizeU: number;
  onClick?: () => void;
}

const iconByType: Record<string, string> = {
  attention: '⚠️',
  maintenance: '🔧',
  note: '📝',
  warning: '🚨',
  info: 'ℹ️'
};

const colorByPriority: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6'
};

export function Annotation3D({ annotation, sizeU, onClick }: Annotation3DProps) {
  const [hovered, setHovered] = useState(false);
  
  // Calculate Y position based on U position
  const yPosition = (annotation.position_u - 1) * 0.044 + 0.022;
  
  // Calculate X position based on side (left/right)
  const xPosition = annotation.position_side === 'left' ? -0.35 : 
                    annotation.position_side === 'right' ? 0.35 : 0;
  
  // Calculate Z position based on side (front/rear)
  const zPosition = annotation.position_side === 'rear' ? -0.5 : 0.5;
  
  const markerColor = annotation.color || colorByPriority[annotation.priority] || colorByPriority.medium;
  
  return (
    <group position={[xPosition, yPosition, zPosition]}>
      {/* 3D Marker (pulsing sphere) */}
      <mesh 
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.3 : 1}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={hovered ? 0.8 : 0.5}
          toneMapped={false}
        />
      </mesh>
      
      {/* Connector line */}
      <mesh position={[xPosition > 0 ? -0.06 : 0.06, 0, 0]}>
        <boxGeometry args={[0.12, 0.003, 0.003]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.6} />
      </mesh>
      
      {/* HTML Overlay Label */}
      <Html
        position={[xPosition > 0 ? -0.18 : 0.18, 0.03, 0]}
        className="pointer-events-auto"
        distanceFactor={1.5}
        style={{
          transition: 'all 0.2s',
          pointerEvents: 'auto'
        }}
      >
        <div 
          className="bg-background/95 backdrop-blur-sm border-2 rounded-lg p-2 shadow-xl min-w-[160px] max-w-[220px] cursor-pointer hover:scale-105 transition-transform"
          style={{ borderColor: markerColor }}
          onClick={onClick}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              {iconByType[annotation.annotation_type] || iconByType.info}
            </span>
            <span className="font-semibold text-sm truncate">{annotation.title}</span>
          </div>
          {annotation.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
              {annotation.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">U{annotation.position_u}</span>
            {annotation.due_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>📅</span>
                <span>{new Date(annotation.due_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}