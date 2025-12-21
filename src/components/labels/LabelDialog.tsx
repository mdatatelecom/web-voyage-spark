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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, Printer, Save, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { useLabels } from '@/hooks/useLabels';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: any;
}

type CodeType = 'qrcode' | 'barcode' | 'both';

export const LabelDialog = ({ open, onOpenChange, connection }: LabelDialogProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [codeType, setCodeType] = useState<CodeType>('qrcode');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { createLabel, isCreating } = useLabels();
  const { isAdmin, isTechnician, isLoading: roleLoading } = useUserRole();
  
  const canCreateLabel = isAdmin || isTechnician;

  useEffect(() => {
    if (open && connection) {
      generateCodes();
    }
  }, [open, connection]);

  const generateCodes = async () => {
    // Generate QR Code
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

    // Generate Barcode (Code 128)
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, connection.connection_code, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        margin: 10,
        background: '#FFFFFF',
        lineColor: '#000000',
      });
      setBarcodeDataUrl(canvas.toDataURL());
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  };

  const handleSave = async () => {
    if (!canCreateLabel) {
      toast.error('Você não tem permissão para gerar etiquetas. Necessário role de Admin ou Técnico.');
      return;
    }

    // Save the primary code type
    const codeData = codeType === 'barcode' ? barcodeDataUrl : qrCodeDataUrl;

    try {
      console.log('Creating label for connection:', connection.id);
      createLabel(
        { connectionId: connection.id, qrCodeData: codeData },
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
    
    if (codeType === 'both') {
      // Create combined image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 320;
        canvas.height = 420;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const qrImg = new Image();
        const barcodeImg = new Image();
        
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 10, 10, 300, 300);
          barcodeImg.src = barcodeDataUrl;
        };
        
        barcodeImg.onload = () => {
          ctx.drawImage(barcodeImg, 10, 320, 300, 90);
          link.href = canvas.toDataURL();
          link.click();
        };
        
        qrImg.src = qrCodeDataUrl;
      }
    } else {
      link.href = codeType === 'barcode' ? barcodeDataUrl : qrCodeDataUrl;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let codeHtml = '';
      
      if (codeType === 'qrcode' || codeType === 'both') {
        codeHtml += `<img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code" style="width: 250px; height: 250px;" />`;
      }
      
      if (codeType === 'barcode' || codeType === 'both') {
        codeHtml += `<img src="${barcodeDataUrl}" class="barcode" alt="Código de Barras" style="width: 280px; height: 80px; margin-top: 10px;" />`;
      }
      
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
              .qr-code, .barcode { margin: 10px 0; display: block; margin-left: auto; margin-right: auto; }
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
              ${codeHtml}
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
          <DialogTitle>Gerar Etiqueta</DialogTitle>
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

          {/* Code Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Código</Label>
            <RadioGroup value={codeType} onValueChange={(value: CodeType) => setCodeType(value)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="qrcode" id="qrcode" />
                <Label htmlFor="qrcode" className="cursor-pointer">QR Code</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="barcode" id="barcode" />
                <Label htmlFor="barcode" className="cursor-pointer">Código de Barras</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">Ambos</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Code Preview */}
          <div className="flex flex-col items-center p-6 bg-muted rounded-lg">
            {(codeType === 'qrcode' || codeType === 'both') && qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
            )}
            {(codeType === 'barcode' || codeType === 'both') && barcodeDataUrl && (
              <img src={barcodeDataUrl} alt="Código de Barras" className={codeType === 'both' ? 'mt-2' : ''} style={{ maxWidth: '100%' }} />
            )}
            {!qrCodeDataUrl && !barcodeDataUrl && (
              <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                Gerando código...
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
              disabled={isCreating || roleLoading || !canCreateLabel || (!qrCodeDataUrl && !barcodeDataUrl)} 
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={!qrCodeDataUrl && !barcodeDataUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={!qrCodeDataUrl && !barcodeDataUrl}>
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
