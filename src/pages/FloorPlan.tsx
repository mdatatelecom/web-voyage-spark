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
  Maximize2
} from 'lucide-react';
import { EquipmentTooltip } from '@/components/floorplan/EquipmentTooltip';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { useEquipmentPositions, EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { useUserRole } from '@/hooks/useUserRole';
import { FloorPlanViewer, FloorPlanViewerRef } from '@/components/floorplan/FloorPlanViewer';
import { FloorPlanUpload } from '@/components/floorplan/FloorPlanUpload';
import { AddEquipmentDialog } from '@/components/floorplan/AddEquipmentDialog';
import { EquipmentSidebar } from '@/components/floorplan/EquipmentSidebar';
import { PlanVersionSelector } from '@/components/floorplan/PlanVersionSelector';
import { ExportFloorPlanButton } from '@/components/floorplan/ExportFloorPlanButton';
import { FloorPlanComparison } from '@/components/floorplan/FloorPlanComparison';
import { ICON_OPTIONS, EQUIPMENT_TYPE_LABELS } from '@/components/floorplan/equipment-icons';
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
  
  // Grid and alignment states
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  // Measurement states
  const [measureMode, setMeasureMode] = useState(false);
  const [measureScale, setMeasureScale] = useState(100);
  const [currentZoom, setCurrentZoom] = useState(1);
  
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
    renameFloorPlan 
  } = useFloorPlans(floorId);

  // Determine which plan to show
  const currentPlan = selectedPlanId 
    ? floorPlans?.find(p => p.id === selectedPlanId) || activeFloorPlan
    : activeFloorPlan;

  const { 
    positions, 
    updatePosition, 
    deletePosition,
    isLoading: positionsLoading 
  } = useEquipmentPositions(currentPlan?.id);

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

  // Keyboard shortcut for search (Ctrl+F / Cmd+F) and measurement (M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setMeasureMode(false);
      }
      if (e.key === 'm' || e.key === 'M') {
        if (!searchOpen && document.activeElement?.tagName !== 'INPUT') {
          setMeasureMode(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

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
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Nova Planta
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden mt-4">
          {/* Canvas Area */}
          <div className="flex-1 relative rounded-lg overflow-hidden border bg-muted/20">
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
                  onHover={handleHover}
                  onHoverEnd={handleHoverEnd}
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
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                {measureScale}px/m
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Escala de medição</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent className="bg-popover">
                          <DropdownMenuItem onClick={() => setMeasureScale(50)}>
                            50px/m (Escala grande)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMeasureScale(100)}>
                            100px/m (Padrão)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMeasureScale(200)}>
                            200px/m (Detalhado)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMeasureScale(500)}>
                            500px/m (Alta precisão)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
    </AppLayout>
  );
}