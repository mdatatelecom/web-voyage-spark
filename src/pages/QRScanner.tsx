import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQRScanner } from '@/hooks/useQRScanner';
import { ScanResultDialog } from '@/components/qr-scanner/ScanResultDialog';
import { PublicScanResultDialog } from '@/components/qr-scanner/PublicScanResultDialog';
import { ArrowLeft, QrCode, Camera, RotateCw, AlertCircle, History, Trash2, Upload } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

export default function QRScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isPublicMode = searchParams.get('mode') === 'public';
  const scannerRef = useRef<Html5Qrcode | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isScanning,
    scanResult,
    error,
    cameras,
    scanHistory,
    startScanner,
    stopScanner,
    resumeScanning,
    switchCamera,
    clearHistory,
    processQRCode,
  } = useQRScanner();

  useEffect(() => {
    const initScanner = async () => {
      const scanner = await startScanner('qr-reader');
      scannerRef.current = scanner;
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        stopScanner(scannerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scanResult) {
      setIsDialogOpen(true);
    }
  }, [scanResult]);

  const handleScanAgain = () => {
    setIsDialogOpen(false);
    resumeScanning(scannerRef.current);
  };

  const handleSwitchCamera = async () => {
    if (scannerRef.current) {
      await stopScanner(scannerRef.current);
    }
    switchCamera();
    const scanner = await startScanner('qr-reader');
    scannerRef.current = scanner;
  };

  const handleBack = () => {
    if (isPublicMode) {
      navigate('/auth');
    } else {
      navigate(-1);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      const decodedText = await html5QrCode.scanFile(file, false);
      await processQRCode(decodedText);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scanner QR Code
                  {isPublicMode && <span className="text-sm text-muted-foreground">(Público)</span>}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Aponte a câmera para o QR Code
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Scanner Card */}
          <Card className="overflow-hidden">
            <div className="relative bg-black" style={{ aspectRatio: '1/1' }}>
              <div id="qr-reader" className="w-full h-full"></div>
              
              {/* Overlay with guide */}
              {!scanResult && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/50" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-primary rounded-lg shadow-lg">
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-primary" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-primary" />
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-primary" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-primary" />
                  </div>
                </div>
              )}

              {/* Status Badge */}
              {isScanning && !scanResult && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                  Escaneando...
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-muted/30 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleSwitchCamera}
                disabled={cameras.length <= 1}
                className="flex items-center gap-2"
              >
                <RotateCw className="h-5 w-5" />
                Trocar Câmera
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-5 w-5" />
                {isUploading ? 'Processando...' : 'Enviar Foto'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">Como usar:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Posicione o QR Code dentro do quadrado guia</li>
                  <li>Mantenha a câmera estável</li>
                  <li>Certifique-se de ter boa iluminação</li>
                  <li>A detecção é automática</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Histórico Recente</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-48">
                <div className="p-4 space-y-2">
                  {scanHistory.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/connections/${item.connectionId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{item.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(item.scannedAt, { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>

        {/* Result Dialog */}
        {scanResult && !isPublicMode && user && (
          <ScanResultDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            connection={scanResult.connection}
            connectionCode={scanResult.data.code}
            onScanAgain={handleScanAgain}
          />
        )}
        
        {/* Public Mode Result Dialog */}
        {scanResult && (isPublicMode || !user) && (
          <PublicScanResultDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            connectionCode={scanResult.data.code}
            connectionId={scanResult.data.id}
          />
        )}
      </div>
    </AppLayout>
  );
}
