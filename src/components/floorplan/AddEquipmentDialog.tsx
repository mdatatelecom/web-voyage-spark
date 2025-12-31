import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Package, Palette, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { ICON_OPTIONS, EQUIPMENT_TYPE_COLORS } from './equipment-icons';

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

const ICON_SIZE_OPTIONS = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
];

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
  const [selectedIcon, setSelectedIcon] = useState<string>('auto');
  const [iconSize, setIconSize] = useState<string>('medium');
  const [activeTab, setActiveTab] = useState('equipment');

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

  // Get selected equipment info for preview
  const selectedEquipment = allEquipment?.find(eq => eq.id === selectedId);

  const handleAdd = () => {
    if (selectedId && clickPosition) {
      createPosition({
        floorPlanId,
        equipmentId: selectedId,
        x: clickPosition.x,
        y: clickPosition.y,
        customLabel: customLabel || undefined,
        customIcon: selectedIcon !== 'auto' ? selectedIcon : undefined,
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
    setSelectedIcon('auto');
    setIconSize('medium');
    setActiveTab('equipment');
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setCustomLabel('');
      setSelectedIcon('auto');
      setIconSize('medium');
      setActiveTab('equipment');
    }
  }, [open]);

  const previewIconColor = selectedIcon !== 'auto' 
    ? ICON_OPTIONS.find(i => i.value === selectedIcon)?.color || '#6b7280'
    : selectedEquipment 
      ? EQUIPMENT_TYPE_COLORS[selectedEquipment.type] || '#6b7280'
      : '#6b7280';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Adicionar Equipamento
          </DialogTitle>
        </DialogHeader>
        
        {clickPosition && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Posição: X {(clickPosition.x * 100).toFixed(1)}% | Y {(clickPosition.y * 100).toFixed(1)}%
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipamento
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2" disabled={!selectedId}>
              <Settings2 className="h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="equipment" className="flex-1 flex flex-col min-h-0 space-y-3 mt-4">
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
            <ScrollArea className="flex-1 min-h-0 border rounded-md">
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
          </TabsContent>
          
          <TabsContent value="appearance" className="flex-1 flex flex-col min-h-0 space-y-4 mt-4">
            {/* Icon Preview */}
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-4"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    borderColor: previewIconColor,
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-full"
                    style={{ backgroundColor: previewIconColor }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedEquipment?.name || 'Equipamento'}
                </p>
              </div>
            </div>

            {/* Icon Size Selection */}
            <div className="space-y-3">
              <Label>Tamanho do Marcador</Label>
              <RadioGroup 
                value={iconSize} 
                onValueChange={setIconSize}
                className="flex gap-4"
              >
                {ICON_SIZE_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Icon Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Ícone na Planta
              </Label>
              <ScrollArea className="h-[180px]">
                <div className="grid grid-cols-4 gap-2 pr-4">
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedIcon(opt.value)}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                        ${selectedIcon === opt.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted hover:border-primary/50'
                        }
                      `}
                      title={opt.label}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: opt.color || '#6b7280' }}
                      />
                      <span className="text-[10px] mt-1 text-center truncate w-full">
                        {opt.label.length > 10 ? opt.label.substring(0, 10) + '...' : opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
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
