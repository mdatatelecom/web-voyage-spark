import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Wifi } from 'lucide-react';

interface PortNotesData {
  location_image_url?: string;
  location_description?: string;
}

interface PortLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port: {
    name: string;
    port_number?: number;
    status: string;
    notes?: string | null;
  } | null;
  cameraIp?: string;
}

export function PortLocationDialog({ open, onOpenChange, port, cameraIp }: PortLocationDialogProps) {
  if (!port) return null;

  const parseNotes = (notesStr: string | null | undefined): PortNotesData => {
    if (!notesStr) return {};
    try {
      return typeof notesStr === 'string' ? JSON.parse(notesStr) : notesStr;
    } catch {
      return { location_description: notesStr };
    }
  };

  const notesData = parseNotes(port.notes);
  const hasImage = !!notesData.location_image_url;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Disponível',
      in_use: 'Em Uso',
      reserved: 'Reservado',
      disabled: 'Desabilitado',
      faulty: 'Defeituoso'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      in_use: 'bg-red-500',
      reserved: 'bg-yellow-500',
      disabled: 'bg-gray-500',
      faulty: 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Localização - {port.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Info */}
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(port.status)}>
              {getStatusLabel(port.status)}
            </Badge>
            {port.port_number && (
              <span className="text-sm text-muted-foreground">
                Canal {port.port_number}
              </span>
            )}
            {cameraIp && (
              <div className="flex items-center gap-1 text-sm">
                <Wifi className="w-4 h-4" />
                <span className="font-mono">{cameraIp}</span>
              </div>
            )}
          </div>

          {/* Location Image */}
          {hasImage ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={notesData.location_image_url}
                alt={`Localização de ${port.name}`}
                className="w-full max-h-[400px] object-contain bg-muted"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
              <Camera className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhuma imagem de localização</p>
              <p className="text-sm text-muted-foreground">
                Edite a porta para adicionar uma foto
              </p>
            </div>
          )}

          {/* Description */}
          {notesData.location_description && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Descrição</h4>
              <p className="text-sm text-muted-foreground">
                {notesData.location_description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
