import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Wifi, ExternalLink } from 'lucide-react';

interface PortNotesData {
  location_image_url?: string;
  location_description?: string;
  locationPhotoUrl?: string;
  locationImageUrl?: string;
  location_photo_url?: string;
  locationDescription?: string;
  [key: string]: any;
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!port) return null;

  const parseNotes = (notesStr: string | null | undefined): PortNotesData => {
    if (!notesStr) return {};
    try {
      return typeof notesStr === 'string' ? JSON.parse(notesStr) : (notesStr as any);
    } catch {
      return { location_description: notesStr };
    }
  };

  const extractLocationImageUrl = (notes: PortNotesData): string | undefined => {
    return (
      notes.location_image_url ||
      notes.locationPhotoUrl ||
      notes.location_photo_url ||
      notes.locationImageUrl ||
      undefined
    );
  };

  const notesData = parseNotes(port.notes);
  const locationImageUrl = extractLocationImageUrl(notesData);
  const hasImage = !!locationImageUrl;
  const imageFailed = !!locationImageUrl && failedUrl === locationImageUrl;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Disponível',
      in_use: 'Em Uso',
      reserved: 'Reservado',
      disabled: 'Desabilitado',
      faulty: 'Defeituoso',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      in_use: 'bg-red-500',
      reserved: 'bg-yellow-500',
      disabled: 'bg-gray-500',
      faulty: 'bg-orange-500',
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
          {hasImage && !imageFailed ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={locationImageUrl}
                alt={`Localização de ${port.name}`}
                className="w-full max-h-[400px] object-contain bg-muted"
                loading="lazy"
                onError={() => setFailedUrl(locationImageUrl ?? null)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
              <Camera className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {hasImage ? 'Não foi possível carregar a imagem' : 'Nenhuma imagem de localização'}
              </p>
              {hasImage ? (
                <a
                  href={locationImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground underline"
                >
                  Abrir imagem
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Edite a porta para adicionar uma foto
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {(notesData.location_description || notesData.locationDescription) && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Descrição</h4>
              <p className="text-sm text-muted-foreground">
                {notesData.location_description || notesData.locationDescription}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
