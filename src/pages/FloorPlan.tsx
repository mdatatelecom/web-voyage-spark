import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
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
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { useEquipmentPositions } from '@/hooks/useEquipmentPositions';
import { useUserRole } from '@/hooks/useUserRole';
import { FloorPlanViewer } from '@/components/floorplan/FloorPlanViewer';
import { FloorPlanUpload } from '@/components/floorplan/FloorPlanUpload';
import { AddEquipmentDialog } from '@/components/floorplan/AddEquipmentDialog';
import { EquipmentSidebar } from '@/components/floorplan/EquipmentSidebar';
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

type ViewMode = 'view' | 'edit' | 'add';

export default function FloorPlan() {
  const { floorId } = useParams<{ floorId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isTechnician } = useUserRole();
  const canEdit = isAdmin || isTechnician;

  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const { activeFloorPlan, floorPlans, isLoading, deleteFloorPlan } = useFloorPlans(floorId);
  const { 
    positions, 
    updatePosition, 
    deletePosition,
    isLoading: positionsLoading 
  } = useEquipmentPositions(activeFloorPlan?.id);

  const handleAddClick = (x: number, y: number) => {
    setClickPosition({ x, y });
    setAddDialogOpen(true);
  };

  const handlePositionChange = (id: string, x: number, y: number) => {
    updatePosition({ id, x, y });
  };

  const handleDeletePosition = () => {
    if (selectedPositionId) {
      deletePosition(selectedPositionId);
      setSelectedPositionId(null);
      setDeleteConfirmOpen(false);
    }
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
            ) : !activeFloorPlan ? (
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
                  floorPlan={activeFloorPlan}
                  positions={positions || []}
                  selectedId={selectedPositionId}
                  onSelect={setSelectedPositionId}
                  onPositionChange={viewMode === 'edit' ? handlePositionChange : undefined}
                  onAddClick={viewMode === 'add' ? handleAddClick : undefined}
                  editable={viewMode === 'edit'}
                  addMode={viewMode === 'add'}
                />

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

                {/* Zoom controls */}
                <div className="absolute bottom-4 left-4 flex gap-1 bg-background/90 backdrop-blur p-1 rounded-lg">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom In (Scroll)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom Out (Scroll)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Hand className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Arrastar (Pan)</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          {activeFloorPlan && positions && (
            <EquipmentSidebar
              positions={positions}
              selectedId={selectedPositionId}
              onSelect={setSelectedPositionId}
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

      {activeFloorPlan && (
        <AddEquipmentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          floorPlanId={activeFloorPlan.id}
          clickPosition={clickPosition}
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
