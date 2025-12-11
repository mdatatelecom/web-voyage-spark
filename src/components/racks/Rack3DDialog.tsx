import { Suspense, lazy, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Box } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRackAnnotations } from '@/hooks/useRackAnnotations';
import { Rack3DToolbar } from './Rack3DToolbar';
import { Rack3DPanel } from './Rack3DPanel';
import { AnnotationDialog } from './AnnotationDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Lazy load the heavy 3D canvas component
const Rack3DCanvas = lazy(() => import('./Rack3DCanvas'));

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

interface Rack3DDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rackId: string;
  rackName: string;
  sizeU: number;
  equipment: Equipment[];
  onEquipmentClick?: (equipment: Equipment) => void;
}

export function Rack3DDialog({
  open,
  onOpenChange,
  rackId,
  rackName,
  sizeU,
  equipment,
  onEquipmentClick,
}: Rack3DDialogProps) {
  const [xrayMode, setXrayMode] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [airflowMode, setAirflowMode] = useState<'off' | 'flow' | 'thermal' | 'both'>('off');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<any>(undefined);
  const [deleteAnnotationId, setDeleteAnnotationId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [cameraPreset, setCameraPreset] = useState<'front' | 'rear' | 'left' | 'right' | 'top' | 'iso' | null>(null);
  const [resetCamera, setResetCamera] = useState(0);

  // Annotations hook
  const {
    annotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    isCreating,
    isUpdating,
    isDeleting
  } = useRackAnnotations(rackId);

  // Fetch connections
  const { data: connections } = useQuery({
    queryKey: ['rack-connections', rackId],
    queryFn: async () => {
      const equipmentIds = equipment.map(e => e.id);
      if (equipmentIds.length === 0) return [];
      
      const { data: ports } = await supabase
        .from('ports')
        .select('id, equipment_id')
        .in('equipment_id', equipmentIds);
      
      if (!ports) return [];
      
      const portIds = ports.map(p => p.id);
      
      const { data, error } = await supabase
        .from('connections')
        .select('id, cable_type, port_a_id, port_b_id')
        .or(`port_a_id.in.(${portIds.join(',')}),port_b_id.in.(${portIds.join(',')})`)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const portToEquipment = new Map(ports.map(p => [p.id, p.equipment_id]));
      
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
        );
    },
    enabled: open && equipment.length > 0
  });

  // Calculate measurements
  const measurements = useMemo(() => {
    const occupiedUs = equipment.reduce((total, eq) => {
      return total + (eq.position_u_end - eq.position_u_start + 1);
    }, 0);
    
    const availableUs = sizeU - occupiedUs;
    const occupancyPercentage = (occupiedUs / sizeU) * 100;
    const rackHeightM = sizeU * 0.044;
    const estimatedWeightKg = equipment.length * 15;
    
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

  // Tour logic
  const handleTourToggle = useCallback(() => {
    if (tourActive) {
      setTourActive(false);
      setTourIndex(0);
    } else if (equipment.length > 0) {
      setTourIndex(0);
      setTourActive(true);
    }
  }, [tourActive, equipment.length]);

  useEffect(() => {
    if (tourActive && equipment.length > 0) {
      const timer = setInterval(() => {
        setTourIndex(prev => {
          if (prev >= equipment.length - 1) {
            setTourActive(false);
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [tourActive, equipment.length]);

  // Annotation handlers
  const handleAnnotationSave = useCallback((annotation: any) => {
    if (editingAnnotation?.id) {
      updateAnnotation({ ...annotation, id: editingAnnotation.id });
    } else {
      createAnnotation(annotation);
    }
    setAnnotationDialogOpen(false);
    setEditingAnnotation(undefined);
  }, [editingAnnotation, createAnnotation, updateAnnotation]);

  const handleAnnotationEdit = useCallback((annotation: any) => {
    setEditingAnnotation(annotation);
    setAnnotationDialogOpen(true);
  }, []);

  const handleAnnotationDelete = useCallback(() => {
    if (deleteAnnotationId) {
      deleteAnnotation(deleteAnnotationId);
      setDeleteAnnotationId(null);
    }
  }, [deleteAnnotationId, deleteAnnotation]);

  const handleCameraPreset = useCallback((preset: 'front' | 'rear' | 'left' | 'right' | 'top' | 'iso') => {
    setCameraPreset(preset);
    setTimeout(() => setCameraPreset(null), 100);
  }, []);

  const handleResetCamera = useCallback(() => {
    setResetCamera(prev => prev + 1);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTourActive(false);
      setTourIndex(0);
      setXrayMode(false);
      setAirflowMode('off');
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                {rackName} ({sizeU}U) - Visualização 3D
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 flex flex-col bg-neutral-950">
              <div className="flex-1 relative">
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Skeleton className="w-32 h-32 rounded-full mx-auto" />
                      <p className="text-muted-foreground">Carregando visualização 3D...</p>
                    </div>
                  </div>
                }>
                  <Rack3DCanvas
                    rackId={rackId}
                    sizeU={sizeU}
                    equipment={equipment}
                    connections={connections || []}
                    annotations={annotations || []}
                    xrayMode={xrayMode}
                    tourActive={tourActive}
                    tourIndex={tourIndex}
                    airflowMode={airflowMode}
                    showAnnotations={showAnnotations}
                    zoom={zoom}
                    cameraPreset={cameraPreset}
                    resetCamera={resetCamera}
                    onEquipmentClick={onEquipmentClick}
                    onAnnotationClick={handleAnnotationEdit}
                  />
                </Suspense>
              </div>

              {/* Toolbar */}
              <TooltipProvider>
                <Rack3DToolbar
                  xrayMode={xrayMode}
                  onXrayToggle={() => setXrayMode(!xrayMode)}
                  tourActive={tourActive}
                  onTourToggle={handleTourToggle}
                  tourDisabled={equipment.length === 0}
                  airflowMode={airflowMode}
                  onAirflowChange={setAirflowMode}
                  showAnnotations={showAnnotations}
                  onAnnotationsToggle={() => setShowAnnotations(!showAnnotations)}
                  onNewAnnotation={() => {
                    setEditingAnnotation(undefined);
                    setAnnotationDialogOpen(true);
                  }}
                  onCameraPreset={handleCameraPreset}
                  onResetCamera={handleResetCamera}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  panelOpen={panelOpen}
                  onPanelToggle={() => setPanelOpen(!panelOpen)}
                />
              </TooltipProvider>
            </div>

            {/* Side Panel */}
            <Rack3DPanel
              isOpen={panelOpen}
              sizeU={sizeU}
              equipment={equipment}
              annotations={annotations || []}
              measurements={measurements}
              connections={connections?.length || 0}
              tourActive={tourActive}
              tourIndex={tourIndex}
              onAnnotationEdit={handleAnnotationEdit}
              onAnnotationDelete={(id) => setDeleteAnnotationId(id)}
              onEquipmentClick={onEquipmentClick}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Annotation Dialog */}
      <AnnotationDialog
        open={annotationDialogOpen}
        onOpenChange={(open) => {
          setAnnotationDialogOpen(open);
          if (!open) setEditingAnnotation(undefined);
        }}
        rackId={rackId}
        maxU={sizeU}
        annotation={editingAnnotation}
        onSave={handleAnnotationSave}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAnnotationId} onOpenChange={(open) => !open && setDeleteAnnotationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnnotationDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
