import * as THREE from 'three';
import { useMemo } from 'react';

interface DataCenterFloorProps {
  size?: number;
}

export function DataCenterFloor({ size = 10 }: DataCenterFloorProps) {
  // Create perforated raised floor pattern texture
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Base floor color
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, 512, 512);
      
      // Grid pattern
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      
      // Tile grid (600mm tiles)
      const tileSize = 512 / 8;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tileSize, 0);
        ctx.lineTo(i * tileSize, 512);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * tileSize);
        ctx.lineTo(512, i * tileSize);
        ctx.stroke();
      }
      
      // Perforation holes
      ctx.fillStyle = '#1a1a1a';
      const holeRadius = 3;
      const holeSpacing = 20;
      
      for (let x = holeSpacing; x < 512; x += holeSpacing) {
        for (let y = holeSpacing; y < 512; y += holeSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
  }, []);
  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={floorTexture}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}
