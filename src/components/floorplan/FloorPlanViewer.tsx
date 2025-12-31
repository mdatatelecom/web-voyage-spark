import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Line, Group } from 'react-konva';
import useImage from 'use-image';
import { EquipmentMarker } from './EquipmentMarker';
import { ConnectionLines } from './ConnectionLines';
import { MeasurementTool } from './MeasurementTool';
import { ScaleIndicator } from './ScaleIndicator';
import { RackMarker } from './RackMarker';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { FloorPlan } from '@/hooks/useFloorPlans';
import { RackPosition } from '@/hooks/useRackPositions';
import { useFloorPlanConnections } from '@/hooks/useFloorPlanConnections';

interface MeasurementPoint {
  x: number;
  y: number;
}

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  positions: EquipmentPosition[];
  selectedId: string | null;
  focusedId?: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onRotationChange?: (id: string, rotation: number) => void;
  onAddClick?: (x: number, y: number) => void;
  editable?: boolean;
  addMode?: boolean;
  showConnections?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  measureMode?: boolean;
  measureScale?: number;
  scaleRatio?: number; // architectural scale ratio (e.g., 100 for 1:100)
  calibrationMode?: boolean;
  onCalibrationClick?: (x: number, y: number) => void;
  onHover?: (position: EquipmentPosition, screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
  // Rack positioning
  rackPositions?: RackPosition[];
  selectedRackId?: string | null;
  onRackSelect?: (id: string | null) => void;
  onRackPositionChange?: (id: string, x: number, y: number) => void;
  onRackResize?: (id: string, width: number, height: number) => void;
  onRackDelete?: (id: string) => void;
  onRackHover?: (position: RackPosition, screenX: number, screenY: number) => void;
  onRackHoverEnd?: () => void;
  onRackContextMenu?: (position: RackPosition, screenX: number, screenY: number) => void;
  onRackRotate?: (id: string, rotation: number) => void;
}

export interface FloorPlanViewerRef {
  getStage: () => any;
  getScale: () => number;
  setZoom: (zoom: number) => void;
  fitToView: () => void;
  resetView: () => void;
  undoLastMeasurePoint: () => void;
  clearMeasurement: () => void;
  getMeasurePointsCount: () => number;
  getMeasurePoints: () => MeasurementPoint[];
  isPolygonClosed: () => boolean;
  setMeasurePointsExternal: (points: MeasurementPoint[], closed: boolean) => void;
}

export const FloorPlanViewer = forwardRef<FloorPlanViewerRef, FloorPlanViewerProps>(({
  floorPlan,
  positions,
  selectedId,
  focusedId,
  onSelect,
  onPositionChange,
  onRotationChange,
  onAddClick,
  editable = false,
  addMode = false,
  showConnections = true,
  showGrid = false,
  gridSize = 20,
  snapToGrid = false,
  measureMode = false,
  measureScale = 100,
  scaleRatio = 100,
  calibrationMode = false,
  onCalibrationClick,
  onHover,
  onHoverEnd,
  rackPositions = [],
  selectedRackId,
  onRackSelect,
  onRackPositionChange,
  onRackResize,
  onRackDelete,
  onRackHover,
  onRackHoverEnd,
  onRackContextMenu,
  onRackRotate,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Measurement state - array of points for multi-point measurement
  const [measurePoints, setMeasurePoints] = useState<MeasurementPoint[]>([]);
  const [tempMeasurePoint, setTempMeasurePoint] = useState<MeasurementPoint | null>(null);
  const [isPolygonClosedState, setIsPolygonClosedState] = useState(false);
  
  const [image] = useImage(floorPlan.file_url, 'anonymous');
  
  // Fetch connections between positioned equipment
  const { data: connections } = useFloorPlanConnections(positions);
  
  // Calculate connection counts per equipment
  const connectionCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!connections) return map;
    
    connections.forEach(conn => {
      if (conn.equipment_a_id) {
        map.set(conn.equipment_a_id, (map.get(conn.equipment_a_id) || 0) + 1);
      }
      if (conn.equipment_b_id) {
        map.set(conn.equipment_b_id, (map.get(conn.equipment_b_id) || 0) + 1);
      }
    });
    return map;
  }, [connections]);
  
  // LocalStorage key for persisting view state
  const storageKey = `floorplan-view-${floorPlan.id}`;
  
  // Load saved view state on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { scale: savedScale, posX, posY } = JSON.parse(saved);
        setScale(savedScale);
        setPosition({ x: posX, y: posY });
      } catch (e) {
        console.error('Error loading saved view state:', e);
      }
    }
    setIsInitialized(true);
  }, [storageKey]);
  
  // Save view state with debounce
  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({
        scale,
        posX: position.x,
        posY: position.y,
      }));
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [scale, position, storageKey, isInitialized]);

  // Expose stage ref and scale to parent
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getScale: () => scale,
    setZoom: (zoom: number) => {
      const clampedZoom = Math.max(0.25, Math.min(5, zoom));
      setScale(clampedZoom);
    },
    fitToView: () => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    },
    resetView: () => {
      localStorage.removeItem(storageKey);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    },
    undoLastMeasurePoint: () => {
      setMeasurePoints(prev => prev.slice(0, -1));
      setIsPolygonClosedState(false);
    },
    clearMeasurement: () => {
      setMeasurePoints([]);
      setTempMeasurePoint(null);
      setIsPolygonClosedState(false);
    },
    getMeasurePointsCount: () => measurePoints.length,
    getMeasurePoints: () => measurePoints,
    isPolygonClosed: () => isPolygonClosedState,
    setMeasurePointsExternal: (points: MeasurementPoint[], closed: boolean) => {
      setMeasurePoints(points);
      setIsPolygonClosedState(closed);
    },
  }));

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

  // Generate grid lines
  const renderGrid = useCallback(() => {
    if (!showGrid) return null;
    
    const lines: JSX.Element[] = [];
    const gridColor = '#4b5563';
    const gridOpacity = 0.3;
    
    // Vertical lines
    for (let x = imageDims.x; x <= imageDims.x + imageDims.width; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, imageDims.y, x, imageDims.y + imageDims.height]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={gridOpacity}
        />
      );
    }
    
    // Horizontal lines
    for (let y = imageDims.y; y <= imageDims.y + imageDims.height; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[imageDims.x, y, imageDims.x + imageDims.width, y]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={gridOpacity}
        />
      );
    }
    
    return <Group>{lines}</Group>;
  }, [showGrid, gridSize, imageDims]);

  // Center on focused equipment with animation
  useEffect(() => {
    if (!focusedId || isAnimating) return;

    const focusedPosition = positions.find(p => p.id === focusedId);
    if (!focusedPosition) return;

    // Calculate the actual position of the equipment on the stage
    const posX = imageDims.x + focusedPosition.position_x * imageDims.width;
    const posY = imageDims.y + focusedPosition.position_y * imageDims.height;

    // Target scale and position to center the equipment
    const targetScale = 1.8;
    const targetX = dimensions.width / 2 - posX * targetScale;
    const targetY = dimensions.height / 2 - posY * targetScale;

    // Animate to target
    setIsAnimating(true);
    const startScale = scale;
    const startX = position.x;
    const startY = position.y;
    const duration = 500; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      setScale(startScale + (targetScale - startScale) * eased);
      setPosition({
        x: startX + (targetX - startX) * eased,
        y: startY + (targetY - startY) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [focusedId]);

  // Clear measurement when mode changes
  useEffect(() => {
    if (!measureMode) {
      setMeasurePoints([]);
      setTempMeasurePoint(null);
    }
  }, [measureMode]);

  // Handle zoom with extended range
  const handleWheel = (e: any) => {
    if (isAnimating) return;
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
    // Extended zoom range: 25% to 500%
    const clampedScale = Math.max(0.25, Math.min(5, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Handle stage click (for adding equipment or measurement or calibration)
  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Get actual position on canvas
    const actualX = (pointer.x - position.x) / scale;
    const actualY = (pointer.y - position.y) / scale;
    
    // In calibration mode, pass click to parent
    if (calibrationMode && onCalibrationClick) {
      onCalibrationClick(actualX, actualY);
      return;
    }
    
    // In measure mode, ALWAYS add a point regardless of what was clicked
    if (measureMode) {
      // Check if clicking near the first point to close polygon
      if (measurePoints.length >= 3 && !isPolygonClosedState) {
        const firstPoint = measurePoints[0];
        const distToFirst = Math.sqrt(
          Math.pow(actualX - firstPoint.x, 2) + 
          Math.pow(actualY - firstPoint.y, 2)
        );
        const closeThreshold = 20 / scale; // 20 pixels adjusted for zoom
        
        if (distToFirst < closeThreshold) {
          setIsPolygonClosedState(true);
          setTempMeasurePoint(null);
          return; // Close polygon, don't add new point
        }
      }
      
      // If polygon is not closed, add the point
      if (!isPolygonClosedState) {
        setMeasurePoints(prev => [...prev, { x: actualX, y: actualY }]);
        setTempMeasurePoint(null);
      }
      return;
    }
    
    const clickedOnEmpty = e.target === e.target.getStage() || 
                          e.target.name() === 'background' ||
                          e.target.name() === 'floor-plan-image' ||
                          e.target.name() === 'grid-line';
    
    if (clickedOnEmpty) {
      if (addMode && onAddClick) {
        // Convert click position to relative coordinates (0-1) based on image bounds
        let relX = (actualX - imageDims.x) / imageDims.width;
        let relY = (actualY - imageDims.y) / imageDims.height;
        
        // Apply snap if enabled
        if (snapToGrid) {
          const absX = imageDims.x + relX * imageDims.width;
          const absY = imageDims.y + relY * imageDims.height;
          const snappedX = Math.round(absX / gridSize) * gridSize;
          const snappedY = Math.round(absY / gridSize) * gridSize;
          relX = (snappedX - imageDims.x) / imageDims.width;
          relY = (snappedY - imageDims.y) / imageDims.height;
        }
        
        // Only add if within image bounds
        if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
          onAddClick(relX, relY);
        }
      } else {
        onSelect(null);
      }
    }
  };

  // Handle mouse move for temp measurement line
  const handleMouseMove = useCallback((e: any) => {
    if (!measureMode || measurePoints.length === 0 || isPolygonClosedState) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (pointer) {
      const actualX = (pointer.x - position.x) / scale;
      const actualY = (pointer.y - position.y) / scale;
      setTempMeasurePoint({ x: actualX, y: actualY });
    }
  }, [measureMode, measurePoints.length, position, scale, isPolygonClosedState]);

  const cursorStyle = calibrationMode ? 'cursor-crosshair' : measureMode ? 'cursor-crosshair' : addMode ? 'cursor-crosshair' : 'cursor-grab';
  
  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-muted/30 ${cursorStyle}`}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={!addMode && !measureMode && !calibrationMode && !isAnimating}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
        onDragEnd={(e) => {
          setPosition({ x: e.target.x(), y: e.target.y() });
        }}
      >
        <Layer>
        {/* Background - lighter for better icon visibility */}
          <Rect
            name="background"
            width={dimensions.width * 3}
            height={dimensions.height * 3}
            x={-dimensions.width}
            y={-dimensions.height}
            fill="#374151"
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
          
          {/* Alignment Grid */}
          {renderGrid()}
          
          {/* Connection Lines (rendered behind markers) */}
          {showConnections && connections && connections.length > 0 && (
            <ConnectionLines
              connections={connections}
              positions={positions}
              stageWidth={dimensions.width}
              stageHeight={dimensions.height}
              imageBounds={imageDims}
              currentScale={scale}
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
              isFocused={focusedId === pos.id}
              isDragging={draggingId === pos.id}
              editable={editable}
              currentScale={scale}
              gridSize={gridSize}
              snapToGrid={snapToGrid}
              activeConnectionCount={connectionCountMap.get(pos.equipment_id) || 0}
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
              onRotationChange={onRotationChange ? (rotation) => onRotationChange(pos.id, rotation) : undefined}
              onHover={onHover}
              onHoverEnd={onHoverEnd}
            />
          ))}
          
          {/* Rack Markers */}
          {rackPositions.map(pos => (
            <RackMarker
              key={pos.id}
              position={{
                ...pos,
                position_x: imageDims.x + (pos.position_x / 100) * imageDims.width,
                position_y: imageDims.y + (pos.position_y / 100) * imageDims.height,
              }}
              currentZoom={scale}
              isSelected={selectedRackId === pos.id}
              isEditing={editable}
              occupancy={pos.occupancy_percent}
              onClick={() => onRackSelect?.(pos.id)}
              onDragEnd={(x, y) => {
                const relX = ((x - imageDims.x) / imageDims.width) * 100;
                const relY = ((y - imageDims.y) / imageDims.height) * 100;
                onRackPositionChange?.(pos.id, relX, relY);
              }}
              onResize={(width, height) => onRackResize?.(pos.id, width, height)}
              onDelete={() => onRackDelete?.(pos.id)}
              onHover={(screenX, screenY) => onRackHover?.(pos, screenX, screenY)}
              onHoverEnd={onRackHoverEnd}
              onContextMenu={(screenX, screenY) => onRackContextMenu?.(pos, screenX, screenY)}
              onRotate={(rotation) => onRackRotate?.(pos.id, rotation)}
            />
          ))}
          
          {/* Measurement Tool */}
          {measureMode && (
            <MeasurementTool
              points={measurePoints}
              tempEndPoint={tempMeasurePoint}
              scale={measureScale}
              currentZoom={scale}
              isClosed={isPolygonClosedState}
            />
          )}
          
          {/* Scale Indicator */}
          {measureMode && (
            <ScaleIndicator
              measureScale={measureScale}
              currentZoom={scale}
              containerWidth={dimensions.width}
              containerHeight={dimensions.height}
              position={position}
              scale={scale}
              scaleRatio={scaleRatio}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
});