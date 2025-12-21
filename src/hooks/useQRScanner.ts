import { useState, useCallback, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { parseQRCode, parseConnectionCode, QRCodeData } from '@/lib/qr-validator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Supported formats for scanning
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
];

interface ScanResult {
  data: QRCodeData;
  connection: any;
}

interface ScanHistoryItem {
  code: string;
  scannedAt: Date;
  connectionId: string;
}

export const useQRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Load scan history from localStorage
    const history = localStorage.getItem('qr_scan_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setScanHistory(parsed.map((item: any) => ({
          ...item,
          scannedAt: new Date(item.scannedAt)
        })));
      } catch (e) {
        console.error('Failed to parse scan history', e);
      }
    }

    // Get available cameras
    const getCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera on mobile
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('traseira') ||
            d.label.toLowerCase().includes('rear')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        } else {
          setError('Nenhuma câmera encontrada. Verifique as permissões do navegador.');
        }
      } catch (err: any) {
        console.error('Error getting cameras:', err);
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Habilite nas configurações do navegador.');
        } else {
          setError('Não foi possível acessar as câmeras. Verifique as permissões.');
        }
      }
    };
    
    getCameras();
  }, []);

  const addToHistory = useCallback((code: string, connectionId: string) => {
    const newItem: ScanHistoryItem = {
      code,
      scannedAt: new Date(),
      connectionId
    };
    
    const newHistory = [newItem, ...scanHistory].slice(0, 10); // Keep last 10
    setScanHistory(newHistory);
    localStorage.setItem('qr_scan_history', JSON.stringify(newHistory));
  }, [scanHistory]);

  const processQRCode = useCallback(async (decodedText: string) => {
    setError(null);
    
    // Try to parse as JSON QR code first
    let qrData = parseQRCode(decodedText);
    
    // If not a JSON QR code, try to parse as connection code (barcode)
    if (!qrData) {
      qrData = await parseConnectionCode(decodedText);
    }
    
    if (!qrData) {
      setError('Código não reconhecido. Este código não pertence ao sistema.');
      toast({
        title: 'Código Não Reconhecido',
        description: 'Este código não é do sistema InfraConnexus.',
        variant: 'destructive',
      });
      return;
    }

    // Vibrate device
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Fetch connection from database
    try {
      const { data: connection, error: dbError } = await supabase
        .from('v_connection_details')
        .select('*')
        .eq('id', qrData.id)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!connection) {
        setError('Conexão não encontrada. Esta conexão pode ter sido removida.');
        toast({
          title: 'Conexão Não Encontrada',
          description: `A conexão ${qrData.code} não existe mais no sistema.`,
          variant: 'destructive',
        });
        return;
      }

      // Log scan activity
      if (user) {
        await supabase.from('access_logs').insert({
          user_id: user.id,
          action: 'qr_code_scanned',
          connection_id: qrData.id,
          details: {
            scan_method: 'camera',
            device_type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Add to history
      addToHistory(qrData.code, qrData.id);

      // Set result
      setScanResult({ data: qrData, connection });
      
      toast({
        title: 'Conexão Encontrada!',
        description: `${qrData.code} - ${connection.equipment_a_name} → ${connection.equipment_b_name}`,
      });
    } catch (err: any) {
      console.error('Error processing code:', err);
      setError('Erro ao buscar dados da conexão.');
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar os dados da conexão.',
        variant: 'destructive',
      });
    }
  }, [toast, user, addToHistory]);

  const startScanner = useCallback(async (elementId: string) => {
    if (!selectedCamera) {
      setError('Nenhuma câmera disponível. Verifique as permissões do navegador.');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);
      
      const html5QrCode = new Html5Qrcode(elementId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      
      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          html5QrCode.pause(true);
          processQRCode(decodedText);
        },
        (errorMessage) => {
          // Scanning errors are normal, ignore them
        }
      );
      
      return html5QrCode;
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Habilite nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Câmera não encontrada no dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('Câmera está sendo usada por outro aplicativo.');
      } else if (err.name === 'OverconstrainedError') {
        setError('A câmera selecionada não está disponível.');
      } else {
        setError('Erro ao iniciar câmera. Verifique as permissões e tente novamente.');
      }
      
      setIsScanning(false);
      toast({
        title: 'Erro ao Acessar Câmera',
        description: 'Verifique se concedeu permissão para usar a câmera.',
        variant: 'destructive',
      });
    }
  }, [selectedCamera, processQRCode, toast]);

  const stopScanner = useCallback(async (html5QrCode: Html5Qrcode | undefined) => {
    if (html5QrCode) {
      try {
        const state = html5QrCode.getState();
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await html5QrCode.stop();
        }
        html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  const resumeScanning = useCallback((html5QrCode: Html5Qrcode | undefined) => {
    if (html5QrCode) {
      try {
        html5QrCode.resume();
      } catch (err) {
        console.error('Error resuming scanner:', err);
      }
      setScanResult(null);
      setError(null);
    }
  }, []);

  const switchCamera = useCallback(() => {
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  }, [cameras, selectedCamera]);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    localStorage.removeItem('qr_scan_history');
  }, []);

  return {
    isScanning,
    scanResult,
    error,
    cameras,
    selectedCamera,
    scanHistory,
    startScanner,
    stopScanner,
    resumeScanning,
    switchCamera,
    clearHistory,
    processQRCode,
  };
};
