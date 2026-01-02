import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface PortStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port: { id: string; name: string; status: string; connection?: { id: string; status: string } | null } | null;
  onStatusChange: (portId: string, newStatus: string) => Promise<void>;
  equipmentType?: string;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível', description: 'Porta livre para nova conexão' },
  { value: 'in_use', label: 'Em Uso', description: 'Porta/canal ocupado' },
  { value: 'reserved', label: 'Reservado', description: 'Porta reservada para uso futuro' },
  { value: 'disabled', label: 'Desabilitado', description: 'Porta desativada administrativamente' },
  { value: 'faulty', label: 'Defeituoso', description: 'Porta com problema técnico' },
];

// Types that represent NVR/DVR equipment (channels instead of network ports)
const NVR_TYPES = ['nvr', 'nvr_poe', 'dvr'];

export function PortStatusDialog({ open, onOpenChange, port, onStatusChange, equipmentType }: PortStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const isNvrContext = equipmentType ? NVR_TYPES.includes(equipmentType) : false;
  const hasActiveConnection = port?.connection?.status === 'active';

  useEffect(() => {
    if (port && open) {
      setSelectedStatus(port.status);
    }
  }, [port, open]);

  const handleSave = async () => {
    if (!port || !selectedStatus || selectedStatus === port.status) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(port.id, selectedStatus);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!port) return null;

  // For regular equipment: block if in_use with active connection
  // For NVR/DVR: allow status change even if in_use (represents channel occupancy)
  const isBlocked = !isNvrContext && port.status === 'in_use' && hasActiveConnection;

  // Filter status options based on context
  const availableOptions = isNvrContext 
    ? STATUS_OPTIONS // NVR: show all including in_use
    : STATUS_OPTIONS.filter(opt => opt.value !== 'in_use'); // Regular: hide in_use (controlled by connections)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNvrContext ? 'Alterar Status do Canal' : 'Alterar Status da Porta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{isNvrContext ? 'Canal' : 'Porta'}</Label>
            <p className="text-sm font-medium">{port.name}</p>
          </div>

          {isBlocked ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta porta está em uso com conexão ativa. Desconecte-a antes de alterar o status.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {isNvrContext && hasActiveConnection && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Este canal possui uma conexão ativa. Considere desconectá-la se quiser liberar o canal.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label>Novo Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isBlocked || selectedStatus === port.status}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}