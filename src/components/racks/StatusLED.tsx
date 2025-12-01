import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

interface StatusLEDProps {
  position: [number, number, number];
  status: 'online' | 'offline' | 'warning';
  size?: number;
}

export function StatusLED({ position, status, size = 0.008 }: StatusLEDProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [intensity, setIntensity] = useState(1);
  
  // Pulsating animation
  useFrame((state) => {
    if (meshRef.current && status === 'online') {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      setIntensity(pulse);
    }
  });
  
  const colors = {
    online: '#22c55e',
    offline: '#ef4444',
    warning: '#eab308'
  };
  
  const emissiveIntensity = status === 'online' ? intensity * 2 : status === 'warning' ? 1.5 : 0.5;
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={colors[status]}
        emissive={colors[status]}
        emissiveIntensity={emissiveIntensity}
        metalness={0.1}
        roughness={0.2}
      />
    </mesh>
  );
}
