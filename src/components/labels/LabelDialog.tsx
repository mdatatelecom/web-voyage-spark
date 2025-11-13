import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Printer, Save, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useLabels } from '@/hooks/useLabels';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: any;
}

export const LabelDialog = ({ open, onOpenChange, connection }: LabelDialogProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { createLabel, isCreating } = useLabels();
  const { isAdmin, isTechnician, isLoading: roleLoading } = useUserRole();
  
  const canCreateLabel = isAdmin || isTechnician;

  useEffect(() => {
    if (open && connection) {
      generateQRCode();
    }
  }, [open, connection]);

  const generateQRCode = async () => {
    const qrData = JSON.stringify({
      code: connection.connection_code,
      id: connection.id,
      a: {
        eq: connection.equipment_a_name,
        p: connection.port_a_name,
      },
      b: {
        eq: connection.equipment_b_name,
        p: connection.port_b_name,
      },
    });

    try {
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleSave = async () => {
    if (!canCreateLabel) {
      toast.error('Você não tem permissão para gerar etiquetas. Necessário role de Admin ou Técnico.');
      return;
    }

    try {
      console.log('Creating label for connection:', connection.id);
      createLabel(
        { connectionId: connection.id, qrCodeData: qrCodeDataUrl },
        {
          onSuccess: () => {
            console.log('Label created successfully');
            toast.success('Etiqueta gerada com sucesso!');
            onOpenChange(false);
          },
          onError: (error: any) => {
            console.error('Error creating label:', error);
            toast.error(`Erro ao gerar etiqueta: ${error.message}`);
          },
        }
      );
    } catch (error: any) {
      console.error('Unexpected error creating label:', error);
      toast.error(`Erro inesperado: ${error.message}`);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${connection.connection_code}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta ${connection.connection_code}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center;
                padding: 20px;
              }
              .label-container {
                border: 2px solid #000;
                padding: 20px;
                text-align: center;
                max-width: 400px;
              }
              .qr-code { margin: 20px 0; }
              .info { margin: 10px 0; font-size: 14px; }
              .code { font-size: 24px; font-weight: bold; margin: 10px 0; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="code">${connection.connection_code}</div>
              <img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code" />
              <div class="info">
                <strong>A:</strong> ${connection.equipment_a_name} - ${connection.port_a_name}
              </div>
              <div class="info">
                <strong>B:</strong> ${connection.equipment_b_name} - ${connection.port_b_name}
              </div>
              <div class="info">
                <strong>Cabo:</strong> ${connection.cable_type} 
                ${connection.cable_length_meters ? `- ${connection.cable_length_meters}m` : ''}
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Etiqueta QR Code</DialogTitle>
          <DialogDescription>
            Etiqueta para conexão {connection?.connection_code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Permission Warning */}
          {!roleLoading && !canCreateLabel && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você não tem permissão para gerar etiquetas. Apenas Administradores e Técnicos podem realizar esta ação.
              </AlertDescription>
            </Alert>
          )}

          {/* QR Code Preview */}
          <div className="flex flex-col items-center p-6 bg-muted rounded-lg">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
                Gerando QR Code...
              </div>
            )}
            <p className="text-2xl font-bold mt-4">{connection?.connection_code}</p>
          </div>

          {/* Connection Details */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Ponto A:</span> {connection?.equipment_a_name} -{' '}
              {connection?.port_a_name}
            </div>
            <div>
              <span className="font-semibold">Ponto B:</span> {connection?.equipment_b_name} -{' '}
              {connection?.port_b_name}
            </div>
            <div>
              <span className="font-semibold">Cabo:</span> {connection?.cable_type}
              {connection?.cable_length_meters && ` - ${connection.cable_length_meters}m`}
              {connection?.cable_color && (
                <span
                  className="inline-block w-4 h-4 ml-2 rounded border"
                  style={{ backgroundColor: connection.cable_color }}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={isCreating || roleLoading || !canCreateLabel || !qrCodeDataUrl} 
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={!qrCodeDataUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={!qrCodeDataUrl}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
