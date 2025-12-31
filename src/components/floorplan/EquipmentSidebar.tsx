import { useState } from 'react';
import { Search, Trash2, Tag, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { FloorPlanLegend } from './FloorPlanLegend';

interface EquipmentSidebarProps {
  positions: EquipmentPosition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  editable: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  ip_camera: 'Câmera IP',
  nvr: 'NVR',
  dvr: 'DVR',
  switch: 'Switch',
  switch_poe: 'Switch PoE',
  access_point: 'AP',
  router: 'Roteador',
  firewall: 'Firewall',
  server: 'Servidor',
  pdu: 'PDU',
  ups: 'UPS',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  online: 'bg-green-500',
  offline: 'bg-red-500',
  inactive: 'bg-red-500',
  warning: 'bg-yellow-500',
  maintenance: 'bg-blue-500',
};

export function EquipmentSidebar({ 
  positions, 
  selectedId, 
  onSelect, 
  onDelete,
  editable 
}: EquipmentSidebarProps) {
  const [search, setSearch] = useState('');

  const filteredPositions = positions.filter(pos => {
    const name = pos.custom_label || pos.equipment?.name || '';
    const ip = pos.equipment?.ip_address || '';
    const searchLower = search.toLowerCase();
    return name.toLowerCase().includes(searchLower) || 
           ip.toLowerCase().includes(searchLower);
  });

  return (
    <div className="w-72 flex flex-col h-full bg-background/95 backdrop-blur border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Equipamentos na Planta
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {positions.length} marcadores posicionados
        </p>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Equipment List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum equipamento encontrado
            </div>
          ) : (
            filteredPositions.map(pos => (
              <Card
                key={pos.id}
                className={`
                  cursor-pointer transition-all
                  ${selectedId === pos.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                  }
                `}
                onClick={() => onSelect(pos.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            STATUS_COLORS[pos.equipment?.equipment_status || 'active'] || 'bg-gray-500'
                          }`}
                        />
                        <span className="font-medium text-sm truncate">
                          {pos.custom_label || pos.equipment?.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_LABELS[pos.equipment?.type || ''] || pos.equipment?.type}
                        </Badge>
                        {pos.equipment?.ip_address && (
                          <code className="text-xs text-muted-foreground font-mono">
                            {pos.equipment.ip_address}
                          </code>
                        )}
                      </div>
                    </div>

                    {editable && selectedId === pos.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(pos.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Collapsible Legend */}
      <Collapsible defaultOpen={false} className="p-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground/80 transition-colors">
          <span>Legenda</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <FloorPlanLegend />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
