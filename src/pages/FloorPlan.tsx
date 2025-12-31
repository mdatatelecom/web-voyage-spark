import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTerminology } from '@/constants/locationTypes';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  Hand, 
  Plus, 
  Edit3, 
  Eye,
  ArrowLeft,
  FileImage,
  RefreshCw,
  GitCompare,
  Cable,
  Grid3X3,
  Magnet,
  RotateCcw,
  RotateCw,
  RotateCcwSquare,
  Trash2,
  Search,
  X,
  Ruler,
  Maximize2,
  Minimize2,
  Undo2,
  Save,
  History,
  Trash2 as TrashIcon,
  Settings2,
  Server
} from 'lucide-react';
import { EquipmentTooltip } from '@/components/floorplan/EquipmentTooltip';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { useEquipmentPositions, EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { useRackPositions } from '@/hooks/useRackPositions';
import { useRacks } from '@/hooks/useRacks';
import { useUserRole } from '@/hooks/useUserRole';
import { FloorPlanViewer, FloorPlanViewerRef } from '@/components/floorplan/FloorPlanViewer';
import { FloorPlanUpload } from '@/components/floorplan/FloorPlanUpload';
import { AddEquipmentDialog } from '@/components/floorplan/AddEquipmentDialog';
import { AddRackDialog } from '@/components/floorplan/AddRackDialog';
import { EquipmentSidebar } from '@/components/floorplan/EquipmentSidebar';
import { PlanVersionSelector } from '@/components/floorplan/PlanVersionSelector';
import { ExportFloorPlanButton } from '@/components/floorplan/ExportFloorPlanButton';
import { ExportMeasurementButton } from '@/components/floorplan/ExportMeasurementButton';
import { FloorPlanComparison } from '@/components/floorplan/FloorPlanComparison';
import { ICON_OPTIONS, EQUIPMENT_TYPE_LABELS } from '@/components/floorplan/equipment-icons';
import { useMeasurements, MeasurementPoint, Measurement } from '@/hooks/useMeasurements';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScaleConfigDialog } from '@/components/floorplan/ScaleConfigDialog';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type ViewMode = 'view' | 'edit' | 'add';

export default function FloorPlan() {
  const { floorId } = useParams<{ floorId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isTechnician } = useUserRole();
  const canEdit = isAdmin || isTechnician;
  
  const viewerRef = useRef<FloorPlanViewerRef>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [focusedPositionId, setFocusedPositionId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  
  // Grid and alignment states
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
// Measurement states
  const [measureMode, setMeasureMode] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [measurePoints, setMeasurePoints] = useState<MeasurementPoint[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  
  // Scale configuration (architectural scale)
  const [scaleRatio, setScaleRatio] = useState(100); // 1:100
  const [pixelsPerCm, setPixelsPerCm] = useState(10); // pixels per cm in the drawing
  const [scaleConfigOpen, setScaleConfigOpen] = useState(false);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [calibrationDistance, setCalibrationDistance] = useState<number | undefined>();
  
  // Calculate measureScale from architectural scale settings
  const measureScale = useMemo(() => {
    // measureScale = pixels per meter
    // 1cm in drawing = scaleRatio cm in real life
    // So: pixelsPerCm pixels = scaleRatio cm in real life
    // For 1 meter (100 cm) real: 100/scaleRatio * pixelsPerCm pixels
    return (pixelsPerCm * 100) / scaleRatio;
  }, [pixelsPerCm, scaleRatio]);
  
  // Save measurement dialog state
  const [saveMeasurementOpen, setSaveMeasurementOpen] = useState(false);
  const [measurementName, setMeasurementName] = useState('');
  const [measurementDescription, setMeasurementDescription] = useState('');
  const [measurementCategory, setMeasurementCategory] = useState('geral');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  
  // Hover tooltip state
  const [hoveredPosition, setHoveredPosition] = useState<EquipmentPosition | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch floor info with building type for terminology
  const { data: floor } = useQuery({
    queryKey: ['floor', floorId],
    queryFn: async () => {
      if (!floorId) return null;
      const { data, error } = await supabase
        .from('floors')
        .select(`
          *,
          building:buildings(id, name, building_type)
        `)
        .eq('id', floorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!floorId,
  });

  // Get terminology based on building type
  const terminology = getTerminology(floor?.building?.building_type);

  const { 
    activeFloorPlan, 
    floorPlans, 
    isLoading, 
    deleteFloorPlan, 
    setActiveFloorPlan,
    renameFloorPlan,
    updateFloorPlanScale
  } = useFloorPlans(floorId);

  // Determine which plan to show
  const currentPlan = selectedPlanId 
    ? floorPlans?.find(p => p.id === selectedPlanId) || activeFloorPlan
    : activeFloorPlan;

  // Rack positions hook
  const {
    rackPositions,
    addRackPosition,
    updateRackPosition,
    deleteRackPosition,
    isAdding: isAddingRack
  } = useRackPositions(currentPlan?.id);

  // Get racks for selection dialog
  const { racks } = useRacks();

  // Rack dialog state
  const [addRackDialogOpen, setAddRackDialogOpen] = useState(false);
  const [rackClickPosition, setRackClickPosition] = useState<{ x: number; y: number } | null>(null);

  // Load scale from current plan
  useEffect(() => {
    if (currentPlan?.scale_ratio) {
      setScaleRatio(currentPlan.scale_ratio);
    }
    if (currentPlan?.pixels_per_cm) {
      setPixelsPerCm(currentPlan.pixels_per_cm);
    }
  }, [currentPlan?.id, currentPlan?.scale_ratio, currentPlan?.pixels_per_cm]);

  const {
    positions, 
    updatePosition, 
    deletePosition,
    isLoading: positionsLoading 
  } = useEquipmentPositions(currentPlan?.id);

  // Measurements hook
  const {
    measurements,
    saveMeasurement,
    isSaving,
    deleteMeasurement
  } = useMeasurements(currentPlan?.id);

  // Update selectedPlanId when activeFloorPlan changes
  useEffect(() => {
    if (activeFloorPlan && !selectedPlanId) {
      setSelectedPlanId(activeFloorPlan.id);
    }
  }, [activeFloorPlan, selectedPlanId]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !positions) return [];
    
    const query = searchQuery.toLowerCase();
    return positions.filter(pos => {
      const equipment = pos.equipment;
      const name = (pos.custom_label || equipment?.name || '').toLowerCase();
      const ip = (equipment?.ip_address || '').toLowerCase();
      const model = (equipment?.model || '').toLowerCase();
      const type = (equipment?.type || '').toLowerCase();
      const typeLabel = (EQUIPMENT_TYPE_LABELS[equipment?.type || ''] || '').toLowerCase();
      
      return name.includes(query) || 
             ip.includes(query) || 
             model.includes(query) || 
             type.includes(query) ||
             typeLabel.includes(query);
    }).slice(0, 5);
  }, [searchQuery, positions]);

  // Handle search result selection
  const handleSearchSelect = useCallback((position: EquipmentPosition) => {
    setSelectedPositionId(position.id);
    setFocusedPositionId(position.id);
    setSearchQuery('');
    setSearchOpen(false);
    setTimeout(() => setFocusedPositionId(null), 3000);
  }, []);

  // Keyboard shortcut for search (Ctrl+F / Cmd+F), measurement (M), fullscreen (F), and undo (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Ctrl+Z to undo last measurement point
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (measureMode && viewerRef.current?.getMeasurePointsCount() > 0) {
          e.preventDefault();
          viewerRef.current?.undoLastMeasurePoint();
        }
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setMeasureMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
      if (e.key === 'm' || e.key === 'M') {
        if (!searchOpen && document.activeElement?.tagName !== 'INPUT') {
          setMeasureMode(prev => !prev);
        }
      }
      // F key for fullscreen toggle
      if ((e.key === 'f' || e.key === 'F') && !(e.ctrlKey || e.metaKey)) {
        if (!searchOpen && document.activeElement?.tagName !== 'INPUT') {
          toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, measureMode]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update measure points when they change
  useEffect(() => {
    if (viewerRef.current) {
      setMeasurePoints(viewerRef.current.getMeasurePoints());
    }
  }, [measureMode]);

  // Poll for measure points updates
  useEffect(() => {
    if (!measureMode) {
      setMeasurePoints([]);
      setIsPolygonClosed(false);
      return;
    }
    
    const interval = setInterval(() => {
      if (viewerRef.current) {
        setMeasurePoints(viewerRef.current.getMeasurePoints());
        setIsPolygonClosed(viewerRef.current.isPolygonClosed());
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [measureMode]);

  // Calculate total distance and area for saving
  const calculateTotalDistance = useCallback((points: MeasurementPoint[], closed: boolean) => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      total += Math.sqrt(dx * dx + dy * dy) / measureScale;
    }
    if (closed && points.length >= 3) {
      const dx = points[0].x - points[points.length - 1].x;
      const dy = points[0].y - points[points.length - 1].y;
      total += Math.sqrt(dx * dx + dy * dy) / measureScale;
    }
    return total;
  }, [measureScale]);

  const calculateArea = useCallback((points: MeasurementPoint[]) => {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2 / (measureScale * measureScale);
  }, [measureScale]);

  // Handle save measurement
  const handleSaveMeasurement = useCallback(() => {
    if (!currentPlan?.id || measurePoints.length < 2 || !measurementName.trim()) return;
    
    saveMeasurement({
      floor_plan_id: currentPlan.id,
      name: measurementName.trim(),
      description: measurementDescription.trim() || undefined,
      points: measurePoints,
      scale: measureScale,
      is_closed: isPolygonClosed,
      total_distance: calculateTotalDistance(measurePoints, isPolygonClosed),
      area: isPolygonClosed ? calculateArea(measurePoints) : undefined,
      category: measurementCategory,
    });
    
    setSaveMeasurementOpen(false);
    setMeasurementName('');
    setMeasurementDescription('');
    setMeasurementCategory('geral');
  }, [currentPlan?.id, measurePoints, measurementName, measurementDescription, measureScale, isPolygonClosed, measurementCategory, saveMeasurement, calculateTotalDistance, calculateArea]);

  // Handle load measurement
  const handleLoadMeasurement = useCallback((measurement: Measurement) => {
    if (viewerRef.current) {
      viewerRef.current.setMeasurePointsExternal(measurement.points, measurement.is_closed);
      // Reverse calculate scaleRatio and pixelsPerCm from saved measureScale
      // measureScale = (pixelsPerCm * 100) / scaleRatio
      // Assuming pixelsPerCm stays constant, we update scaleRatio
      const newScaleRatio = (pixelsPerCm * 100) / measurement.scale;
      setScaleRatio(Math.round(newScaleRatio));
      setMeasureMode(true);
    }
  }, [pixelsPerCm]);

  // Handle scale configuration apply
  const handleScaleApply = useCallback((newScaleRatio: number, newPixelsPerCm: number) => {
    setScaleRatio(newScaleRatio);
    setPixelsPerCm(newPixelsPerCm);
    setCalibrationMode(false);
    setCalibrationPoints([]);
    setCalibrationDistance(undefined);
    
    // Save to database
    if (currentPlan?.id) {
      updateFloorPlanScale(currentPlan.id, newScaleRatio, newPixelsPerCm);
    }
  }, [currentPlan?.id, updateFloorPlanScale]);

  // Handle calibration start
  const handleStartCalibration = useCallback(() => {
    setCalibrationMode(true);
    setCalibrationPoints([]);
    setCalibrationDistance(undefined);
    setScaleConfigOpen(false);
  }, []);

  // Handle calibration click (from viewer)
  const handleCalibrationClick = useCallback((x: number, y: number) => {
    if (!calibrationMode) return;
    
    const newPoints = [...calibrationPoints, { x, y }];
    setCalibrationPoints(newPoints);
    
    if (newPoints.length === 2) {
      const dx = newPoints[1].x - newPoints[0].x;
      const dy = newPoints[1].y - newPoints[0].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setCalibrationDistance(distance);
      setCalibrationMode(false);
      setScaleConfigOpen(true);
    }
  }, [calibrationMode, calibrationPoints]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      fullscreenContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Hover handlers for tooltip
  const handleHover = useCallback((position: EquipmentPosition, screenX: number, screenY: number) => {
    setHoveredPosition(position);
    setTooltipPos({ x: screenX, y: screenY });
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredPosition(null);
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(5, currentZoom * 1.25);
    viewerRef.current?.setZoom(newZoom);
    setCurrentZoom(newZoom);
  }, [currentZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.25, currentZoom / 1.25);
    viewerRef.current?.setZoom(newZoom);
    setCurrentZoom(newZoom);
  }, [currentZoom]);

  const handleZoomPreset = useCallback((zoom: number) => {
    viewerRef.current?.setZoom(zoom);
    setCurrentZoom(zoom);
  }, []);

  const handleFitToView = useCallback(() => {
    viewerRef.current?.fitToView();
    setCurrentZoom(1);
  }, []);

  const handleAddClick = (x: number, y: number) => {
    setClickPosition({ x, y });
    setAddDialogOpen(true);
  };

  const handlePositionChange = (id: string, x: number, y: number) => {
    updatePosition({ id, x, y });
  };

  const handleRotationChange = (id: string, rotation: number) => {
    updatePosition({ id, rotation });
  };

  const handleRotateSelected = (delta: number) => {
    if (!selectedPositionId) return;
    const pos = positions?.find(p => p.id === selectedPositionId);
    if (!pos) return;
    const newRotation = ((pos.rotation || 0) + delta + 360) % 360;
    updatePosition({ id: selectedPositionId, rotation: newRotation });
  };

  const handleResetRotation = () => {
    if (!selectedPositionId) return;
    updatePosition({ id: selectedPositionId, rotation: 0 });
  };

  const handleDeletePosition = () => {
    if (selectedPositionId) {
      deletePosition(selectedPositionId);
      setSelectedPositionId(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Handle adding rack to floor plan
  const handleAddRack = useCallback((rackId: string) => {
    if (!currentPlan?.id) return;
    
    // Default position in center or at click position
    const posX = rackClickPosition?.x ?? 0.5;
    const posY = rackClickPosition?.y ?? 0.5;
    
    addRackPosition({
      floor_plan_id: currentPlan.id,
      rack_id: rackId,
      position_x: posX * 100, // Store as percentage * 100
      position_y: posY * 100,
    });
    
    setRackClickPosition(null);
  }, [currentPlan?.id, rackClickPosition, addRackPosition]);

  // Handle equipment selection from sidebar - focus and center
  const handleEquipmentSelect = (id: string | null) => {
    setSelectedPositionId(id);
    if (id) {
      setFocusedPositionId(id);
      // Clear focus after 3 seconds
      setTimeout(() => setFocusedPositionId(null), 3000);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveFloorPlan(planId);
  };

  const getModeButton = (mode: ViewMode, icon: React.ReactNode, label: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={viewMode === mode ? 'default' : 'outline'}
          size="icon"
          onClick={() => setViewMode(mode)}
          disabled={!canEdit && mode !== 'view'}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {terminology.planTitle}: {floor?.name || ''}
              </h1>
              <p className="text-sm text-muted-foreground">
                {floor?.building?.name} • {positions?.length || 0} equipamentos posicionados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Plan Version Selector */}
            {floorPlans && floorPlans.length > 0 && currentPlan && (
              <PlanVersionSelector
                floorPlans={floorPlans}
                activeId={currentPlan.id}
                onSelect={handlePlanSelect}
                onDelete={canEdit ? deleteFloorPlan : undefined}
                onRename={canEdit ? renameFloorPlan : undefined}
                canEdit={canEdit}
              />
            )}

            {/* Compare Button (only if 2+ versions) */}
            {floorPlans && floorPlans.length >= 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setComparisonOpen(true)}
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Comparar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Comparar versões lado a lado</TooltipContent>
              </Tooltip>
            )}

            {/* Search */}
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[200px] justify-start">
                  <Search className="mr-2 h-4 w-4" />
                  <span className="text-muted-foreground">Buscar equipamento...</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Nome, IP, modelo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex h-10 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                    />
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <CommandList>
                    {searchQuery.trim() && searchResults.length === 0 && (
                      <CommandEmpty>Nenhum equipamento encontrado</CommandEmpty>
                    )}
                    {searchResults.length > 0 && (
                      <CommandGroup heading="Equipamentos">
                        {searchResults.map((pos) => {
                          const equipment = pos.equipment;
                          const typeLabel = EQUIPMENT_TYPE_LABELS[equipment?.type || ''] || equipment?.type;
                          return (
                            <CommandItem
                              key={pos.id}
                              onSelect={() => handleSearchSelect(pos)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  {pos.custom_label || equipment?.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    {typeLabel}
                                  </Badge>
                                  {equipment?.ip_address && (
                                    <span className="font-mono">{equipment.ip_address}</span>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                    {!searchQuery.trim() && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Digite para buscar por nome, IP ou modelo
                        <div className="mt-1 text-xs opacity-70">
                          Atalho: Ctrl+F
                        </div>
                      </div>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Export Button */}
            {currentPlan && (
              <ExportFloorPlanButton
                stageRef={{ current: viewerRef.current?.getStage() }}
                floorName={floor?.name || 'planta'}
                buildingName={floor?.building?.name}
                positions={positions}
                rackPositions={rackPositions}
              />
            )}

            {/* Toggle Connections */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showConnections ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setShowConnections(!showConnections)}
                >
                  <Cable className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showConnections ? 'Ocultar conexões' : 'Mostrar conexões'}
              </TooltipContent>
            </Tooltip>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              {getModeButton('view', <Eye className="h-4 w-4" />, 'Visualizar')}
              {getModeButton('edit', <Edit3 className="h-4 w-4" />, 'Editar posições')}
              {getModeButton('add', <Plus className="h-4 w-4" />, 'Adicionar equipamento')}
            </div>

            {/* Actions */}
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setAddRackDialogOpen(true)}>
                  <Server className="mr-2 h-4 w-4" />
                  Adicionar Rack
                </Button>
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Nova Planta
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden mt-4" ref={fullscreenContainerRef}>
          {/* Canvas Area */}
          <div className={`flex-1 relative rounded-lg overflow-hidden border bg-muted/20 ${isFullscreen ? 'bg-background' : ''}`}>
            {isLoading || positionsLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !currentPlan ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileImage className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Nenhuma planta cadastrada</p>
                <p className="text-sm mb-4">Faça upload de uma planta baixa para começar</p>
                {canEdit && (
                  <Button onClick={() => setUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload de Planta
                  </Button>
                )}
              </div>
            ) : (
              <>
                <FloorPlanViewer
                  ref={viewerRef}
                  floorPlan={currentPlan}
                  positions={positions || []}
                  selectedId={selectedPositionId}
                  focusedId={focusedPositionId}
                  onSelect={setSelectedPositionId}
                  onPositionChange={viewMode === 'edit' ? handlePositionChange : undefined}
                  onRotationChange={viewMode === 'edit' ? handleRotationChange : undefined}
                  onAddClick={viewMode === 'add' ? handleAddClick : undefined}
                  editable={viewMode === 'edit'}
                  addMode={viewMode === 'add'}
                  showConnections={showConnections}
                  showGrid={showGrid}
                  gridSize={gridSize}
                  snapToGrid={snapToGrid}
                  measureMode={measureMode}
                  measureScale={measureScale}
                  scaleRatio={scaleRatio}
                  calibrationMode={calibrationMode}
                  onCalibrationClick={handleCalibrationClick}
                  onHover={handleHover}
                  onHoverEnd={handleHoverEnd}
                  rackPositions={rackPositions || []}
                  selectedRackId={selectedRackId}
                  onRackSelect={setSelectedRackId}
                  onRackPositionChange={(id, x, y) => {
                    updateRackPosition({ id, position_x: x, position_y: y });
                  }}
                />

                {/* Floating Tooltip */}
                {hoveredPosition && (
                  <div 
                    className="fixed z-50 pointer-events-none"
                    style={{ 
                      left: tooltipPos.x, 
                      top: tooltipPos.y - 20,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <EquipmentTooltip 
                      equipment={hoveredPosition.equipment} 
                      customLabel={hoveredPosition.custom_label}
                    />
                  </div>
                )}

                {/* Mode indicator */}
                {viewMode !== 'view' && (
                  <div className="absolute top-4 left-4">
                    <Badge variant={viewMode === 'add' ? 'default' : 'secondary'} className="gap-1">
                      {viewMode === 'add' ? (
                        <>
                          <Plus className="h-3 w-3" />
                          Clique para adicionar equipamento
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-3 w-3" />
                          Arraste para reposicionar
                        </>
                      )}
                    </Badge>
                  </div>
                )}

                {/* Grid indicator */}
                {showGrid && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="outline" className="gap-1 bg-background/80">
                      <Grid3X3 className="h-3 w-3" />
                      Grid {gridSize}px {snapToGrid && '• Snap ativo'}
                    </Badge>
                  </div>
                )}

                {/* Connection indicator */}
                {showConnections && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="gap-1 bg-background/80">
                      <Cable className="h-3 w-3" />
                      Conexões visíveis
                    </Badge>
                  </div>
                )}

                {/* Measurement Mode indicator */}
                {measureMode && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="gap-1 bg-primary">
                      <Ruler className="h-3 w-3" />
                      Modo Medição • Clique para definir pontos • ESC para sair
                    </Badge>
                  </div>
                )}

                {/* Bottom Controls - Zoom, Measurement and Grid */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {/* Zoom controls */}
                  <div className="flex gap-1 bg-background/90 backdrop-blur p-1 rounded-lg items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={handleZoomOut}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom Out (-)</TooltipContent>
                    </Tooltip>
                    
                    {/* Zoom Presets Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs min-w-[60px]">
                          {Math.round(currentZoom * 100)}%
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-popover">
                        <DropdownMenuItem onClick={() => handleZoomPreset(0.25)}>
                          25%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(0.5)}>
                          50%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(0.75)}>
                          75%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(1)}>
                          100%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(1.5)}>
                          150%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(2)}>
                          200%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(3)}>
                          300%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoomPreset(5)}>
                          500%
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={handleZoomIn}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom In (+)</TooltipContent>
                    </Tooltip>
                    
                    <div className="w-px h-6 bg-border" />
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={handleFitToView}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ajustar à tela</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => viewerRef.current?.resetView()}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Resetar View</TooltipContent>
                    </Tooltip>
                    
                    <div className="w-px h-6 bg-border" />
                    
                    {/* Fullscreen Toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={toggleFullscreen}
                        >
                          {isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Measurement Tool */}
                  <div className="flex gap-1 bg-background/90 backdrop-blur p-1 rounded-lg items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={measureMode ? 'default' : 'ghost'} 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setMeasureMode(!measureMode)}
                        >
                          <Ruler className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Medir distância (M)</TooltipContent>
                    </Tooltip>
                    
                    {measureMode && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => viewerRef.current?.undoLastMeasurePoint()}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Desfazer último ponto (Ctrl+Z)</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => viewerRef.current?.clearMeasurement()}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Limpar medição</TooltipContent>
                        </Tooltip>
                        
                        <div className="w-px h-6 bg-border" />
                        
                        {/* Scale Dropdown */}
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                                  <Ruler className="h-3 w-3" />
                                  1:{scaleRatio}
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Escala do desenho</TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent className="bg-popover">
                            <DropdownMenuItem onClick={() => setScaleRatio(50)}>
                              1:50 - Detalhes construtivos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setScaleRatio(100)}>
                              1:100 - Residencial (padrão)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setScaleRatio(200)}>
                              1:200 - Industrial / Galpões
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setScaleRatio(250)}>
                              1:250 - Planta geral
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setScaleRatio(500)}>
                              1:500 - Vista distante
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setScaleConfigOpen(true)}>
                              <Settings2 className="h-4 w-4 mr-2" />
                              Configurar escala...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Export Measurements PDF */}
                        <ExportMeasurementButton
                          points={measurePoints}
                          scale={measureScale}
                          scaleRatio={scaleRatio}
                          floorPlanName={floor?.name || 'Planta'}
                          buildingName={floor?.building?.name}
                        />
                        
                        <div className="w-px h-6 bg-border" />
                        
                        {/* Save Measurement */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setSaveMeasurementOpen(true)}
                              disabled={measurePoints.length < 2}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Salvar medição</TooltipContent>
                        </Tooltip>
                        
                        {/* Load Saved Measurements */}
                        {measurements && measurements.length > 0 && (
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <History className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Medições salvas</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent className="bg-popover w-64">
                              {measurements.map((m) => (
                                <DropdownMenuItem 
                                  key={m.id} 
                                  className="flex justify-between items-center"
                                  onClick={() => handleLoadMeasurement(m)}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{m.name}</span>
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {m.category === 'eletrica' ? 'Elétrica' : 
                                         m.category === 'rede' ? 'Rede' : 
                                         m.category === 'hidraulica' ? 'Hidráulica' : 
                                         m.category === 'estrutura' ? 'Estrutura' : 'Geral'}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {m.total_distance?.toFixed(2)}m {m.is_closed && `• ${m.area?.toFixed(2)}m²`}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMeasurement(m.id);
                                    }}
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Grid controls (only in edit/add mode) */}
                  {viewMode !== 'view' && (
                    <div className="flex gap-1 bg-background/90 backdrop-blur p-1 rounded-lg">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={showGrid ? 'default' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setShowGrid(!showGrid)}
                          >
                            <Grid3X3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showGrid ? 'Ocultar grid' : 'Mostrar grid'}
                        </TooltipContent>
                      </Tooltip>
                      
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                {gridSize}px
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Tamanho do grid</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent className="bg-popover">
                          <DropdownMenuItem onClick={() => setGridSize(10)}>
                            10px (fino)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setGridSize(20)}>
                            20px (médio)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setGridSize(50)}>
                            50px (grosso)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={snapToGrid ? 'default' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setSnapToGrid(!snapToGrid)}
                          >
                            <Magnet className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {snapToGrid ? 'Desativar snap' : 'Ativar snap ao grid'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Rotation, Icon, and Delete controls (only when something is selected in edit mode) */}
                  {viewMode === 'edit' && selectedPositionId && (
                    <div className="flex gap-1 bg-background/90 backdrop-blur p-1 rounded-lg items-center">
                      {/* Icon selector */}
                      <Select 
                        value={(positions?.find(p => p.id === selectedPositionId) as any)?.custom_icon || 'auto'}
                        onValueChange={(icon) => {
                          updatePosition({ 
                            id: selectedPositionId, 
                            customIcon: icon === 'auto' ? null : icon 
                          });
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue placeholder="Ícone" />
                            </SelectTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Alterar ícone</TooltipContent>
                        </Tooltip>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full border border-white/50" 
                                  style={{ backgroundColor: opt.color || '#6b7280' }} 
                                />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="w-px h-6 bg-border mx-1" />
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRotateSelected(-45)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rotacionar -45°</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRotateSelected(45)}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rotacionar +45°</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={handleResetRotation}
                          >
                            <RotateCcwSquare className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Resetar rotação</TooltipContent>
                      </Tooltip>
                      
                      {/* Delete button */}
                      <div className="w-px h-6 bg-border mx-1" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmOpen(true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir equipamento</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          {currentPlan && positions && (
            <EquipmentSidebar
              positions={positions}
              selectedId={selectedPositionId}
              onSelect={handleEquipmentSelect}
              onDelete={(id) => {
                setSelectedPositionId(id);
                setDeleteConfirmOpen(true);
              }}
              editable={canEdit && viewMode !== 'view'}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <FloorPlanUpload
        floorId={floorId || ''}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* Add Rack Dialog */}
      <AddRackDialog
        open={addRackDialogOpen}
        onOpenChange={setAddRackDialogOpen}
        availableRacks={racks?.map(r => ({ ...r, room: undefined })) || []}
        existingRackIds={rackPositions?.map(rp => rp.rack_id) || []}
        onAddRack={handleAddRack}
        isLoading={isAddingRack}
      />

      {currentPlan && (
        <AddEquipmentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          floorPlanId={currentPlan.id}
          clickPosition={clickPosition}
        />
      )}

      {/* Comparison Dialog */}
      {floorPlans && floorPlans.length >= 2 && (
        <FloorPlanComparison
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          floorPlans={floorPlans}
          initialLeftId={floorPlans[0]?.id}
          initialRightId={floorPlans[1]?.id}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover marcador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este equipamento da planta? 
              O equipamento não será excluído, apenas sua posição na planta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Save Measurement Dialog */}
      <Dialog open={saveMeasurementOpen} onOpenChange={setSaveMeasurementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Medição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="measurement-name">Nome</Label>
              <Input 
                id="measurement-name"
                value={measurementName}
                onChange={(e) => setMeasurementName(e.target.value)}
                placeholder="Ex: Sala de servidores"
              />
            </div>
            <div>
              <Label htmlFor="measurement-category">Categoria</Label>
              <Select value={measurementCategory} onValueChange={setMeasurementCategory}>
                <SelectTrigger id="measurement-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="eletrica">Elétrica</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                  <SelectItem value="hidraulica">Hidráulica</SelectItem>
                  <SelectItem value="estrutura">Estrutura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="measurement-desc">Descrição (opcional)</Label>
              <Textarea 
                id="measurement-desc"
                value={measurementDescription}
                onChange={(e) => setMeasurementDescription(e.target.value)}
                placeholder="Observações sobre a medição..."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {measurePoints.length} pontos • {isPolygonClosed ? 'Polígono fechado' : 'Linha aberta'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveMeasurementOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveMeasurement} 
              disabled={!measurementName.trim() || isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Configuration Dialog */}
      <ScaleConfigDialog
        open={scaleConfigOpen}
        onOpenChange={setScaleConfigOpen}
        currentScaleRatio={scaleRatio}
        currentPixelsPerCm={pixelsPerCm}
        onApply={handleScaleApply}
        calibrationMode={calibrationMode}
        onStartCalibration={handleStartCalibration}
        calibrationDistance={calibrationDistance}
      />
    </AppLayout>
  );
}