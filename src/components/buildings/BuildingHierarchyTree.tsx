import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, ChevronRight, Layers, DoorOpen, Archive, Search } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { getTerminology } from '@/constants/locationTypes';
import { useBuildingHierarchy, HierarchyBuilding, HierarchyFloor, HierarchyRoom, HierarchyRack } from '@/hooks/useBuildingHierarchy';
import { Skeleton } from '@/components/ui/skeleton';

export const BuildingHierarchyTree = () => {
  const { data: hierarchy, isLoading } = useBuildingHierarchy();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggleBuilding = (id: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleFloor = (id: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRoom = (id: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredHierarchy = hierarchy?.filter(building => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      building.name.toLowerCase().includes(term) ||
      building.floors.some(floor =>
        floor.name.toLowerCase().includes(term) ||
        floor.rooms.some(room =>
          room.name.toLowerCase().includes(term) ||
          room.racks.some(rack => rack.name.toLowerCase().includes(term))
        )
      )
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filteredHierarchy?.map((building) => (
          <BuildingNode
            key={building.id}
            building={building}
            isExpanded={expandedBuildings.has(building.id)}
            onToggle={() => toggleBuilding(building.id)}
            expandedFloors={expandedFloors}
            expandedRooms={expandedRooms}
            onToggleFloor={toggleFloor}
            onToggleRoom={toggleRoom}
            navigate={navigate}
          />
        ))}
      </div>

      {filteredHierarchy?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
};

interface BuildingNodeProps {
  building: HierarchyBuilding;
  isExpanded: boolean;
  onToggle: () => void;
  expandedFloors: Set<string>;
  expandedRooms: Set<string>;
  onToggleFloor: (id: string) => void;
  onToggleRoom: (id: string) => void;
  navigate: (path: string) => void;
}

const BuildingNode = ({
  building,
  isExpanded,
  onToggle,
  expandedFloors,
  expandedRooms,
  onToggleFloor,
  onToggleRoom,
  navigate,
}: BuildingNodeProps) => {
  const terminology = getTerminology(building.building_type);
  const totalFloors = building.floors.length;
  const totalRooms = building.floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalRacks = building.floors.reduce(
    (sum, f) => sum + f.rooms.reduce((s, r) => s + r.racks.length, 0),
    0
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-left">
            <div className="font-semibold">{building.name}</div>
            {(building.city || building.state) && (
              <div className="text-xs text-muted-foreground">
                {building.city}, {building.state}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge variant="secondary">{totalFloors} {terminology.level.plural.toLowerCase()}</Badge>
            <Badge variant="secondary">{totalRooms} salas</Badge>
            <Badge variant="secondary">{totalRacks} racks</Badge>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-1">
            {building.floors.map((floor) => (
              <FloorNode
                key={floor.id}
                floor={floor}
                buildingId={building.id}
                terminology={terminology}
                isExpanded={expandedFloors.has(floor.id)}
                onToggle={() => onToggleFloor(floor.id)}
                expandedRooms={expandedRooms}
                onToggleRoom={onToggleRoom}
                navigate={navigate}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface FloorNodeProps {
  floor: HierarchyFloor;
  buildingId: string;
  terminology: any;
  isExpanded: boolean;
  onToggle: () => void;
  expandedRooms: Set<string>;
  onToggleRoom: (id: string) => void;
  navigate: (path: string) => void;
}

const FloorNode = ({
  floor,
  buildingId,
  terminology,
  isExpanded,
  onToggle,
  expandedRooms,
  onToggleRoom,
  navigate,
}: FloorNodeProps) => {
  const totalRooms = floor.rooms.length;
  const totalRacks = floor.rooms.reduce((sum, r) => sum + r.racks.length, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-background ml-8">
        <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <Layers className="h-4 w-4 text-secondary shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{floor.name}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">{totalRooms} salas</Badge>
            <Badge variant="outline" className="text-xs">{totalRacks} racks</Badge>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1">
            {floor.rooms.map((room) => (
              <RoomNode
                key={room.id}
                room={room}
                floorId={floor.id}
                buildingId={buildingId}
                isExpanded={expandedRooms.has(room.id)}
                onToggle={() => onToggleRoom(room.id)}
                navigate={navigate}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface RoomNodeProps {
  room: HierarchyRoom;
  floorId: string;
  buildingId: string;
  isExpanded: boolean;
  onToggle: () => void;
  navigate: (path: string) => void;
}

const RoomNode = ({ room, floorId, buildingId, isExpanded, onToggle, navigate }: RoomNodeProps) => {
  const totalRacks = room.racks.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-muted/30 ml-8">
        <CollapsibleTrigger className="w-full p-2 flex items-center gap-2 hover:bg-accent/50 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <DoorOpen className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm">{room.name}</div>
            {room.room_type && (
              <div className="text-xs text-muted-foreground">{room.room_type}</div>
            )}
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{totalRacks} racks</Badge>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-2 pb-2 space-y-1">
            {room.racks.map((rack) => (
              <RackNode key={rack.id} rack={rack} navigate={navigate} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface RackNodeProps {
  rack: HierarchyRack;
  navigate: (path: string) => void;
}

const RackNode = ({ rack, navigate }: RackNodeProps) => {
  const occupancyPercent = (rack.occupied_u / rack.size_u) * 100;

  return (
    <div
      className="border rounded p-2 ml-8 flex items-center gap-2 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/racks/${rack.id}`)}
    >
      <Archive className="h-3 w-3 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium">{rack.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={occupancyPercent} className="h-1 w-20" />
          <span className="text-xs text-muted-foreground">
            {rack.occupied_u}/{rack.size_u}U ({occupancyPercent.toFixed(0)}%)
          </span>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {rack.equipment_count} equip.
      </Badge>
    </div>
  );
};
