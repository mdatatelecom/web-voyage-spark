import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface PortStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port: { id: string; name: string; status: string } | null;
  onStatusChange: (portId: string, newStatus: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível', description: 'Porta livre para nova conexão' },
  { value: 'reserved', label: 'Reservado', description: 'Porta reservada para uso futuro' },
  { value: 'disabled', label: 'Desabilitado', description: 'Porta desativada administrativamente' },
  { value: 'faulty', label: 'Defeituoso', description: 'Porta com problema técnico' },
];

export function PortStatusDialog({ open, onOpenChange, port, onStatusChange }: PortStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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

  const isInUse = port.status === 'in_use';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status da Porta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Porta</Label>
            <p className="text-sm font-medium">{port.name}</p>
          </div>

          {isInUse ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta porta está em uso. Desconecte-a antes de alterar o status.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isInUse || selectedStatus === port.status}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
