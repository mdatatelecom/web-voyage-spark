import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Building2, LayoutGrid, Network } from 'lucide-react';
import { useBuildings } from '@/hooks/useBuildings';
import { useUserRole } from '@/hooks/useUserRole';
import { BuildingWizard } from '@/components/buildings/BuildingWizard';
import { BuildingFilters } from '@/components/buildings/BuildingFilters';
import { BuildingCard } from '@/components/buildings/BuildingCard';
import { BuildingHierarchyTree } from '@/components/buildings/BuildingHierarchyTree';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function Buildings() {
  const navigate = useNavigate();
  const { buildings, isLoading, deleteBuilding } = useBuildings();
  const { isAdmin } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingType, setBuildingType] = useState('all');
  const [state, setState] = useState('all');
  const [city, setCity] = useState('');
  const [internalCode, setInternalCode] = useState('');

  const filteredBuildings = buildings?.filter((building) => {
    const matchesSearch = building.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = buildingType === 'all' || building.building_type === buildingType;
    const matchesState = state === 'all' || building.state === state;
    const matchesCity = !city || building.city?.toLowerCase().includes(city.toLowerCase());
    const matchesCode = !internalCode || building.internal_code?.toLowerCase().includes(internalCode.toLowerCase());
    
    return matchesSearch && matchesType && matchesState && matchesCity && matchesCode;
  });

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingId(undefined);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBuilding(deleteId);
      setDeleteId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setBuildingType('all');
    setState('all');
    setCity('');
    setInternalCode('');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prédios</h1>
            <p className="text-muted-foreground">Gerencie os prédios da sua infraestrutura</p>
          </div>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'tree')}>
              <TabsList>
                <TabsTrigger value="cards" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="tree" className="gap-2">
                  <Network className="h-4 w-4" />
                  Árvore
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {isAdmin && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Prédio
              </Button>
            )}
          </div>
        </div>

        {/* Filters - only for cards view */}
        {viewMode === 'cards' && (
          <BuildingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            buildingType={buildingType}
            onBuildingTypeChange={setBuildingType}
            state={state}
            onStateChange={setState}
            city={city}
            onCityChange={setCity}
            internalCode={internalCode}
            onInternalCodeChange={setInternalCode}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : viewMode === 'tree' ? (
          <BuildingHierarchyTree />
        ) : filteredBuildings && filteredBuildings.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                isAdmin={isAdmin}
                onView={(id) => navigate(`/buildings/${id}/floors`)}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum prédio encontrado</p>
          </div>
        )}
      </div>

      <BuildingWizard
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        buildingId={editingId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este prédio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
