import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  Map, 
  Search, 
  MapPin,
  Layers,
  AlertCircle
} from 'lucide-react';

interface FloorWithPlan {
  id: string;
  name: string;
  building_id: string;
  hasPlan: boolean;
}

const FloorPlanSelector = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  
  const { buildings, isLoading: buildingsLoading } = useBuildings();
  const { floors, isLoading: floorsLoading } = useFloors();
  const { floorPlans, isLoading: plansLoading } = useFloorPlans();

  const isLoading = buildingsLoading || floorsLoading || plansLoading;

  // Get floors with plan status for each building
  const getFloorsForBuilding = (buildingId: string): FloorWithPlan[] => {
    return (floors || [])
      .filter(floor => floor.building_id === buildingId)
      .map(floor => ({
        id: floor.id,
        name: floor.name,
        building_id: floor.building_id,
        hasPlan: (floorPlans || []).some(plan => plan.floor_id === floor.id)
      }));
  };

  // Filter buildings based on search
  const filteredBuildings = (buildings || []).filter(building => {
    const matchesBuilding = building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const buildingFloors = getFloorsForBuilding(building.id);
    const matchesFloor = buildingFloors.some(floor => 
      floor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return matchesBuilding || matchesFloor;
  });

  const toggleBuilding = (buildingId: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  const handleViewPlan = (buildingId: string, floorId: string) => {
    navigate(`/buildings/${buildingId}/floors/${floorId}/plan`);
  };

  // Count total floors with plans
  const totalFloorsWithPlans = (floors || []).filter(floor => 
    (floorPlans || []).some(plan => plan.floor_id === floor.id)
  ).length;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Plantas Baixas</h1>
              <p className="text-muted-foreground text-sm">
                Selecione um local para visualizar a planta
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Prédios</span>
            </div>
            <p className="text-2xl font-bold mt-1">{buildings?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Andares</span>
            </div>
            <p className="text-2xl font-bold mt-1">{floors?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Com Planta</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalFloorsWithPlans}</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prédio ou andar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Buildings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredBuildings.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhum prédio encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente buscar por outro termo' : 'Cadastre um prédio para começar'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBuildings.map(building => {
              const buildingFloors = getFloorsForBuilding(building.id);
              const floorsWithPlan = buildingFloors.filter(f => f.hasPlan).length;
              const isExpanded = expandedBuildings.has(building.id);

              return (
                <Card key={building.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleBuilding(building.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{building.name}</CardTitle>
                              {building.address && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {building.address}
                                  {building.city && `, ${building.city}`}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {buildingFloors.length} andar{buildingFloors.length !== 1 ? 'es' : ''}
                            </Badge>
                            {floorsWithPlan > 0 && (
                              <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                {floorsWithPlan} planta{floorsWithPlan !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        {buildingFloors.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 pl-12">
                            Nenhum andar cadastrado
                          </p>
                        ) : (
                          <div className="space-y-2 pl-12">
                            {buildingFloors.map(floor => (
                              <div 
                                key={floor.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Layers className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{floor.name}</span>
                                </div>
                                {floor.hasPlan ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleViewPlan(building.id, floor.id)}
                                  >
                                    <Map className="h-4 w-4 mr-2" />
                                    Ver Planta
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Sem planta
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FloorPlanSelector;
