import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, HardHat, Camera, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EpiAlert {
  id: string;
  title: string;
  message: string;
  severity: string;
  created_at: string | null;
  metadata?: {
    image_url?: string;
    camera?: string;
    risk?: string;
    employee_name?: string;
    department?: string;
    [key: string]: unknown;
  };
}

interface EpiImageDialogProps {
  alert: EpiAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EpiImageDialog({ alert, open, onOpenChange }: EpiImageDialogProps) {
  if (!alert) return null;

  const imageUrl = alert.metadata?.image_url;
  const camera = alert.metadata?.camera;
  const risk = alert.metadata?.risk;
  const employee = alert.metadata?.employee_name;
  const department = alert.metadata?.department;

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `epi-alert-${alert.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-destructive';
      case 'warning':
        return 'text-amber-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-amber-500" />
            Screenshot Alerta EPI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Imagem */}
          {imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <img
                src={imageUrl}
                alt="Screenshot do alerta EPI"
                className="w-full h-auto max-h-[50vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  e.currentTarget.alt = 'Imagem não disponível';
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-lg border bg-muted text-muted-foreground">
              <p>Imagem não disponível</p>
            </div>
          )}

          {/* Informações do Alerta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {camera && (
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Câmera:</span>
                <span className="font-medium">{camera}</span>
              </div>
            )}

            {risk && (
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                <span className="text-muted-foreground">Risco:</span>
                <span className="font-medium">{risk}</span>
              </div>
            )}

            {employee && (
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Funcionário:</span>
                <span className="font-medium">{employee}</span>
              </div>
            )}

            {department && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Departamento:</span>
                <span className="font-medium">{department}</span>
              </div>
            )}

            {alert.created_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {/* Mensagem */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm">{alert.message}</p>
          </div>

          {/* Ações */}
          {imageUrl && (
            <div className="flex justify-end">
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar Imagem
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
