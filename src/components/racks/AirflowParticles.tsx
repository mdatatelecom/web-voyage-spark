import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Equipment {
  id: string;
  position_u_start: number;
  position_u_end: number;
  type: string;
}

interface AirflowParticlesProps {
  equipment: Equipment[];
  sizeU: number;
  enabled: boolean;
}

export function AirflowParticles({ equipment, sizeU, enabled }: AirflowParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 300;

  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random position in front of rack (cold air entry)
      pos[i * 3] = (Math.random() - 0.5) * 0.35; // X
      pos[i * 3 + 1] = Math.random() * sizeU * 0.044; // Y (along rack height)
      pos[i * 3 + 2] = 0.45 + Math.random() * 0.1; // Z (front)

      // Start color: cold (blue)
      col[i * 3] = 0.3; // R
      col[i * 3 + 1] = 0.5; // G
      col[i * 3 + 2] = 1.0; // B (cold blue)

      // Variable velocity based on equipment density
      const uPosition = Math.floor((pos[i * 3 + 1] / 0.044) + 1);
      const hasEquipment = equipment.some(
        eq => uPosition >= eq.position_u_start && uPosition <= eq.position_u_end
      );
      vel[i] = hasEquipment ? 0.15 + Math.random() * 0.1 : 0.05 + Math.random() * 0.05;
    }

    return { positions: pos, colors: col, velocities: vel };
  }, [equipment, sizeU, particleCount]);

  useFrame((state, delta) => {
    if (!enabled || !particlesRef.current) return;

    const posAttr = particlesRef.current.geometry.attributes.position;
    const colAttr = particlesRef.current.geometry.attributes.color;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;

      // Move particle from front to back
      posAttr.array[idx + 2] -= delta * velocities[i];

      // Calculate progress (0 = front, 1 = back)
      const progress = Math.max(0, Math.min(1, (0.55 - posAttr.array[idx + 2]) / 1.0));

      // Color transition: blue (cold) -> orange/red (hot)
      colAttr.array[idx] = 0.3 + progress * 0.7; // R increases
      colAttr.array[idx + 1] = 0.5 - progress * 0.3; // G decreases
      colAttr.array[idx + 2] = 1.0 - progress * 0.9; // B decreases

      // Reset particle when it exits the back
      if (posAttr.array[idx + 2] < -0.45) {
        posAttr.array[idx] = (Math.random() - 0.5) * 0.35;
        posAttr.array[idx + 1] = Math.random() * sizeU * 0.044;
        posAttr.array[idx + 2] = 0.45 + Math.random() * 0.1;

        // Reset to cold color
        colAttr.array[idx] = 0.3;
        colAttr.array[idx + 1] = 0.5;
        colAttr.array[idx + 2] = 1.0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
