import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEquipmentPositions } from '@/hooks/useEquipmentPositions';

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorPlanId: string;
  clickPosition: { x: number; y: number } | null;
}

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  ip_camera: 'Câmera IP',
  nvr: 'NVR',
  dvr: 'DVR',
  switch: 'Switch',
  switch_poe: 'Switch PoE',
  access_point: 'Access Point',
  router: 'Roteador',
  firewall: 'Firewall',
  server: 'Servidor',
  pdu: 'PDU',
  ups: 'UPS/Nobreak',
  environment_sensor: 'Sensor Ambiental',
};

export function AddEquipmentDialog({ 
  open, 
  onOpenChange, 
  floorPlanId,
  clickPosition 
}: AddEquipmentDialogProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');

  const { positions, createPosition, isCreating } = useEquipmentPositions(floorPlanId);

  // Get all equipment
  const { data: allEquipment } = useQuery({
    queryKey: ['all_equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, type, ip_address, equipment_status')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Filter out already positioned equipment
  const positionedIds = positions?.map(p => p.equipment_id) || [];
  const availableEquipment = allEquipment?.filter(eq => 
    !positionedIds.includes(eq.id) &&
    (typeFilter === 'all' || eq.type === typeFilter) &&
    (search === '' || 
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.ip_address?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Get unique equipment types for filter
  const equipmentTypes = [...new Set(allEquipment?.map(eq => eq.type) || [])];

  const handleAdd = () => {
    if (selectedId && clickPosition) {
      createPosition({
        floorPlanId,
        equipmentId: selectedId,
        x: clickPosition.x,
        y: clickPosition.y,
        customLabel: customLabel || undefined,
      }, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };

  const handleClose = () => {
    setSearch('');
    setTypeFilter('all');
    setSelectedId(null);
    setCustomLabel('');
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setCustomLabel('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Adicionar Equipamento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {clickPosition && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Posição: X {(clickPosition.x * 100).toFixed(1)}% | Y {(clickPosition.y * 100).toFixed(1)}%
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {equipmentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {EQUIPMENT_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment List */}
          <ScrollArea className="h-[200px] border rounded-md">
            {availableEquipment?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum equipamento disponível</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableEquipment?.map(eq => (
                  <div
                    key={eq.id}
                    onClick={() => setSelectedId(eq.id)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors
                      ${selectedId === eq.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{eq.name}</span>
                      <Badge variant={selectedId === eq.id ? 'secondary' : 'outline'} className="text-xs">
                        {EQUIPMENT_TYPE_LABELS[eq.type] || eq.type}
                      </Badge>
                    </div>
                    {eq.ip_address && (
                      <span className={`text-xs font-mono ${selectedId === eq.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {eq.ip_address}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Custom Label */}
          {selectedId && (
            <div className="space-y-2">
              <Label htmlFor="customLabel">Rótulo personalizado (opcional)</Label>
              <Input
                id="customLabel"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Ex: Câmera Recepção"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={!selectedId || !clickPosition || isCreating}
          >
            {isCreating ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
