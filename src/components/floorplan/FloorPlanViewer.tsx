import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import { EquipmentMarker } from './EquipmentMarker';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { FloorPlan } from '@/hooks/useFloorPlans';

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  positions: EquipmentPosition[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onAddClick?: (x: number, y: number) => void;
  editable?: boolean;
  addMode?: boolean;
}

export function FloorPlanViewer({
  floorPlan,
  positions,
  selectedId,
  onSelect,
  onPositionChange,
  onAddClick,
  editable = false,
  addMode = false,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  const [image] = useImage(floorPlan.file_url, 'anonymous');

  // Calculate stage dimensions based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate image dimensions to fit container while maintaining aspect ratio
  const getImageDimensions = useCallback(() => {
    if (!image) return { width: dimensions.width, height: dimensions.height, x: 0, y: 0 };

    const containerRatio = dimensions.width / dimensions.height;
    const imageRatio = image.width / image.height;

    let width, height, x, y;

    if (imageRatio > containerRatio) {
      // Image is wider than container
      width = dimensions.width;
      height = dimensions.width / imageRatio;
      x = 0;
      y = (dimensions.height - height) / 2;
    } else {
      // Image is taller than container
      height = dimensions.height;
      width = dimensions.height * imageRatio;
      x = (dimensions.width - width) / 2;
      y = 0;
    }

    return { width, height, x, y };
  }, [image, dimensions]);

  const imageDims = getImageDimensions();

  // Handle zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Handle stage click (for adding equipment)
  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage() || 
                          e.target.name() === 'background' ||
                          e.target.name() === 'floor-plan-image';
    
    if (clickedOnEmpty) {
      if (addMode && onAddClick) {
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        
        // Convert click position to relative coordinates (0-1) based on image bounds
        const relX = (pointer.x / scale - position.x / scale - imageDims.x) / imageDims.width;
        const relY = (pointer.y / scale - position.y / scale - imageDims.y) / imageDims.height;
        
        // Only add if within image bounds
        if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
          onAddClick(relX, relY);
        }
      } else {
        onSelect(null);
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-muted/30 ${addMode ? 'cursor-crosshair' : 'cursor-grab'}`}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={!addMode}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragEnd={(e) => {
          setPosition({ x: e.target.x(), y: e.target.y() });
        }}
      >
        <Layer>
          {/* Background */}
          <Rect
            name="background"
            width={dimensions.width * 3}
            height={dimensions.height * 3}
            x={-dimensions.width}
            y={-dimensions.height}
            fill="#1a1a2e"
          />
          
          {/* Floor Plan Image */}
          {image && (
            <KonvaImage
              name="floor-plan-image"
              image={image}
              x={imageDims.x}
              y={imageDims.y}
              width={imageDims.width}
              height={imageDims.height}
            />
          )}
          
          {/* Equipment Markers */}
          {positions.map(pos => (
            <EquipmentMarker
              key={pos.id}
              position={{
                ...pos,
                // Adjust position to be relative to image bounds
                position_x: imageDims.x / dimensions.width + (pos.position_x * imageDims.width) / dimensions.width,
                position_y: imageDims.y / dimensions.height + (pos.position_y * imageDims.height) / dimensions.height,
              }}
              stageWidth={dimensions.width}
              stageHeight={dimensions.height}
              isSelected={selectedId === pos.id}
              isDragging={draggingId === pos.id}
              editable={editable}
              onSelect={() => onSelect(pos.id)}
              onDragStart={() => setDraggingId(pos.id)}
              onDragEnd={(x, y) => {
                setDraggingId(null);
                // Convert back to relative coordinates within image
                const newX = (x * dimensions.width - imageDims.x) / imageDims.width;
                const newY = (y * dimensions.height - imageDims.y) / imageDims.height;
                if (onPositionChange) {
                  onPositionChange(pos.id, newX, newY);
                }
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
