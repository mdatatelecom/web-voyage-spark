import { Building2, MapPin, Layers, Edit, Trash2, DoorOpen, Server, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BUILDING_TYPES, getTerminology, usesFloors } from '@/constants/locationTypes';

interface BuildingCardProps {
  building: {
    id: string;
    name: string;
    internal_code?: string | null;
    building_type?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    floors?: Array<{ count: number }>;
    rooms?: Array<{ count: number }>;
    racks?: Array<{ count: number }>;
  };
  isAdmin: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewPlan?: (id: string) => void;
}

export function BuildingCard({
  building,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onViewPlan,
}: BuildingCardProps) {
  const buildingTypeInfo = BUILDING_TYPES.find((t) => t.value === building.building_type);
  const Icon = buildingTypeInfo?.icon || Building2;
  const terminology = getTerminology(building.building_type);
  const isSimpleBuilding = !usesFloors(building.building_type);

  const floorCount = building.floors?.[0]?.count || 0;
  const roomCount = building.rooms?.[0]?.count || 0;
  const rackCount = building.racks?.[0]?.count || 0;

  const hasLocation = building.city || building.state;
  const locationText = [building.city, building.state].filter(Boolean).join(', ');

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{building.name}</h3>
              {building.internal_code && (
                <p className="text-sm text-muted-foreground">
                  Código: {building.internal_code}
                </p>
              )}
              {buildingTypeInfo && (
                <Badge variant="secondary" className="mt-1">
                  {buildingTypeInfo.label}
                </Badge>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(building.id);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(building.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {hasLocation && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{locationText}</p>
              {building.address && (
                <p className="text-muted-foreground truncate">{building.address}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{floorCount}</span>
            <span className="text-muted-foreground">{terminology.level.plural.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{roomCount}</span>
            <span className="text-muted-foreground">salas</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{rackCount}</span>
            <span className="text-muted-foreground">racks</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t gap-2">
        {isSimpleBuilding && onViewPlan && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewPlan(building.id)}
          >
            <FileImage className="mr-2 h-4 w-4" />
            Ver Planta
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onView(building.id)}
        >
          Ver Detalhes →
        </Button>
      </CardFooter>
    </Card>
  );
}
