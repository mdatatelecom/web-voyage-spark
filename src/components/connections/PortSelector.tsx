import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useRooms } from '@/hooks/useRooms';
import { useRacks } from '@/hooks/useRacks';
import { useEquipment } from '@/hooks/useEquipment';
import { useAvailablePorts } from '@/hooks/usePorts';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { NON_NETWORK_EQUIPMENT_TYPES } from '@/constants/equipmentTypes';

interface PortSelectorProps {
  selectedPortId?: string;
  onPortSelect: (portId: string, portInfo: any) => void;
  excludePortId?: string;
  label: string;
}

export function PortSelector({ selectedPortId, onPortSelect, excludePortId, label }: PortSelectorProps) {
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [rackId, setRackId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');

  const { buildings } = useBuildings();
  const { floors } = useFloors(buildingId);
  const { rooms } = useRooms(floorId);
  const { racks } = useRacks(roomId);
  const { equipment, isLoading: equipmentLoading } = useEquipment(rackId);
  const { data: ports, isLoading: portsLoading, error: portsError } = useAvailablePorts(undefined, equipmentId);

  const selectedEquipment = equipment?.find(e => e.id === equipmentId);
  const filteredPorts = ports?.filter(p => p.id !== excludePortId) || [];
  
  // Filter out non-network equipment (cable organizers, shelves, etc.)
  const nonNetworkTypes = NON_NETWORK_EQUIPMENT_TYPES as readonly string[];
  const networkEquipment = equipment?.filter(e => !nonNetworkTypes.includes(e.type)) || [];
  
  // Check if selected equipment is a non-network type
  const isNonNetworkEquipment = selectedEquipment && nonNetworkTypes.includes(selectedEquipment.type);

  const getPortStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'in_use': return 'bg-red-500 cursor-not-allowed text-white';
      case 'reserved': return 'bg-yellow-500 cursor-not-allowed text-white';
      case 'disabled': return 'bg-gray-500 cursor-not-allowed text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">{label}</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prédio</Label>
          <Select value={buildingId} onValueChange={(v) => {
            setBuildingId(v);
            setFloorId('');
            setRoomId('');
            setRackId('');
            setEquipmentId('');
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {buildings?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Andar</Label>
          <Select value={floorId} onValueChange={(v) => {
            setFloorId(v);
            setRoomId('');
            setRackId('');
            setEquipmentId('');
          }} disabled={!buildingId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {floors?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Sala</Label>
          <Select value={roomId} onValueChange={(v) => {
            setRoomId(v);
            setRackId('');
            setEquipmentId('');
          }} disabled={!floorId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Rack</Label>
          <Select value={rackId} onValueChange={(v) => {
            setRackId(v);
            setEquipmentId('');
          }} disabled={!roomId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {racks?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rackId && (
        <div>
          <Label>Equipamento</Label>
          {equipmentLoading ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando equipamentos...</span>
            </div>
          ) : networkEquipment.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">Nenhum equipamento com portas neste rack</span>
            </div>
          ) : (
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>
                {networkEquipment.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} - {e.type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {equipmentId && isNonNetworkEquipment && (
        <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-yellow-600">
            Este equipamento ({selectedEquipment?.type.replace(/_/g, ' ')}) não possui portas de rede.
          </span>
        </div>
      )}

      {equipmentId && !isNonNetworkEquipment && portsLoading && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando portas disponíveis...</span>
        </div>
      )}

      {equipmentId && !isNonNetworkEquipment && portsError && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">Erro ao carregar portas: {portsError.message}</span>
        </div>
      )}

      {equipmentId && !isNonNetworkEquipment && !portsLoading && filteredPorts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>🔌 Portas Disponíveis ({filteredPorts.length})</Label>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                Disponível
              </span>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-2 p-4 bg-muted rounded-lg">
            <TooltipProvider>
              {filteredPorts.map((port) => (
                <Tooltip key={port.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onPortSelect(port.id, {
                        equipmentId,
                        equipmentName: selectedEquipment?.name,
                        portName: port.name,
                        rackId,
                        roomId,
                        floorId,
                        buildingId
                      })}
                      disabled={port.status !== 'available'}
                      className={`
                        relative h-10 rounded flex items-center justify-center text-xs font-medium
                        transition-all
                        ${port.id === selectedPortId ? 'ring-2 ring-primary ring-offset-2' : ''}
                        ${getPortStatusColor(port.status)}
                      `}
                    >
                      {port.port_number || port.name}
                      {port.id === selectedPortId && (
                        <Check className="absolute -top-1 -right-1 w-4 h-4 text-white bg-primary rounded-full p-0.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{port.name}</p>
                      {port.port_type && <p className="text-muted-foreground">Tipo: {port.port_type}</p>}
                      {port.speed && <p className="text-muted-foreground">Velocidade: {port.speed}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {selectedPortId && (
            <Badge className="mt-2 bg-primary">
              ✅ Selecionado: {selectedEquipment?.name} / {filteredPorts.find(p => p.id === selectedPortId)?.name}
            </Badge>
          )}
        </div>
      )}

      {equipmentId && !isNonNetworkEquipment && !portsLoading && filteredPorts.length === 0 && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
          <AlertCircle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-sm text-orange-600 font-medium">Nenhuma porta disponível neste equipamento</p>
          <p className="text-xs text-muted-foreground mt-1">Todas as portas estão em uso ou reservadas</p>
        </div>
      )}
    </div>
  );
}
