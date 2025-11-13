import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Server, Cable, Activity } from 'lucide-react';

interface ScanResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: any;
  connectionCode: string;
  onScanAgain: () => void;
}

export const ScanResultDialog = ({ open, onOpenChange, connection, connectionCode, onScanAgain }: ScanResultDialogProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      inactive: { variant: 'secondary', label: 'Inativo' },
      maintenance: { variant: 'outline', label: 'Manutenção' },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = () => {
    navigate(`/connections/${connection.id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <DialogTitle>Conexão Encontrada!</DialogTitle>
          </div>
          <DialogDescription>
            Código: <span className="font-semibold">{connectionCode}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Server className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Ponto A</p>
                <p className="text-sm text-muted-foreground">
                  {connection.equipment_a_name} → {connection.port_a_name}
                </p>
                <p className="text-xs text-muted-foreground">Rack: {connection.rack_a_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Server className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Ponto B</p>
                <p className="text-sm text-muted-foreground">
                  {connection.equipment_b_name} → {connection.port_b_name}
                </p>
                <p className="text-xs text-muted-foreground">Rack: {connection.rack_b_name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Cable className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cabo</p>
                <p className="text-sm font-medium">{connection.cable_type}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5">{getStatusBadge(connection.status)}</div>
              </div>
            </div>
          </div>

          {connection.cable_length_meters && (
            <p className="text-sm text-muted-foreground">
              Comprimento: {connection.cable_length_meters}m
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleViewDetails} className="w-full">
            Ver Detalhes Completos
          </Button>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={onScanAgain} className="w-full">
              Escanear Novamente
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
