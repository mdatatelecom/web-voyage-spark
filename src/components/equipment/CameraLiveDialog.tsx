import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Maximize2, Minimize2, RefreshCw, Play, Pause, Video, ExternalLink, Lock, Camera } from 'lucide-react';
import Hls from 'hls.js';
import { useToast } from '@/hooks/use-toast';
import { useGo2rtcSettings } from '@/hooks/useGo2rtcSettings';

interface CameraLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  streamUrl: string;
}

type StreamType = 
  | 'hls' | 'mjpeg' | 'snapshot' | 'flv' | 'ts'
  | 'rtsp' | 'rtmp' | 'srt' | 'udp' | 'rtp' | 'webrtc' | 'ndi'
  | 'unknown';

// Extract auth credentials from URL
const extractAuthFromUrl = (url: string): { cleanUrl: string; username?: string; password?: string } => {
  try {
    const urlObj = new URL(url);
    const username = urlObj.username || undefined;
    const password = urlObj.password || undefined;
    
    if (username || password) {
      // Remove auth from URL for display/requests that handle auth separately
      urlObj.username = '';
      urlObj.password = '';
      return { cleanUrl: urlObj.toString(), username, password };
    }
    return { cleanUrl: url };
  } catch {
    // Manual regex for non-standard URLs
    const match = url.match(/^(\w+):\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return {
        cleanUrl: `${match[1]}://${match[4]}`,
        username: match[2],
        password: match[3]
      };
    }
    return { cleanUrl: url };
  }
};

const detectStreamType = (url: string): StreamType => {
  const lowerUrl = url.toLowerCase();
  
  // Remove auth from URL for detection
  const urlWithoutAuth = lowerUrl.replace(/\/\/[^:]+:[^@]+@/, '//');
  
  // HLS
  if (urlWithoutAuth.includes('.m3u8') || urlWithoutAuth.includes('/hls/')) return 'hls';
  
  // HTTP-FLV
  if (urlWithoutAuth.includes('.flv') || urlWithoutAuth.includes('/live.flv')) return 'flv';
  
  // MPEG-TS
  if (urlWithoutAuth.includes('.ts') && !urlWithoutAuth.includes('.tsx')) return 'ts';
  
  // MJPEG - padrões comuns de fabricantes
  if (
    urlWithoutAuth.includes('.mjpg') || 
    urlWithoutAuth.includes('.mjpeg') || 
    urlWithoutAuth.includes('/mjpg/') ||
    urlWithoutAuth.includes('/mjpeg/') ||
    urlWithoutAuth.includes('cgi-bin/mjpg') ||
    urlWithoutAuth.includes('/video/mjpg.cgi') || // Dahua
    urlWithoutAuth.includes('videostream.cgi') || // Foscam
    urlWithoutAuth.includes('/axis-cgi/mjpg') || // Axis
    urlWithoutAuth.includes('/cgi-bin/video.cgi') || // Genérico
    urlWithoutAuth.includes('httppreview') // Hikvision
  ) return 'mjpeg';
  
  // Snapshot - padrões comuns de fabricantes
  if (
    urlWithoutAuth.includes('.jpg') || 
    urlWithoutAuth.includes('.jpeg') ||
    urlWithoutAuth.includes('.png') ||
    urlWithoutAuth.includes('snapshot') ||
    urlWithoutAuth.includes('/snap.') ||
    urlWithoutAuth.includes('/picture') || // Hikvision
    urlWithoutAuth.includes('/cgi-bin/snapshot') ||
    urlWithoutAuth.includes('/snap.cgi') || // Intelbras
    urlWithoutAuth.includes('/onvifsnapshot') || // ONVIF
    urlWithoutAuth.includes('image.cgi') // Axis
  ) return 'snapshot';
  
  // Protocols that require proxy/conversion
  if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
  if (lowerUrl.startsWith('rtmp://') || lowerUrl.startsWith('rtmps://')) return 'rtmp';
  if (lowerUrl.startsWith('srt://')) return 'srt';
  if (lowerUrl.startsWith('udp://')) return 'udp';
  if (lowerUrl.startsWith('rtp://')) return 'rtp';
  if (lowerUrl.startsWith('webrtc://') || lowerUrl.startsWith('wss://')) return 'webrtc';
  if (lowerUrl.startsWith('ndi://')) return 'ndi';
  
  // Tentar detectar padrões de streaming genéricos
  if (
    urlWithoutAuth.includes('/live/') ||
    urlWithoutAuth.includes('/stream/') ||
    urlWithoutAuth.includes('/video/') ||
    urlWithoutAuth.includes('/streaming/')
  ) return 'unknown';
  
  return 'unknown';
};

export function CameraLiveDialog({ open, onOpenChange, cameraName, streamUrl }: CameraLiveDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotKey, setSnapshotKey] = useState(0);
  const [activeStreamUrl, setActiveStreamUrl] = useState(streamUrl);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const { settings: go2rtcSettings, registerStream } = useGo2rtcSettings();
  
  const streamType = detectStreamType(streamUrl);
  
  // Extract auth info
  const authInfo = useMemo(() => extractAuthFromUrl(streamUrl), [streamUrl]);
  const hasAuth = Boolean(authInfo.username || authInfo.password);

  // Get protocol-specific error message
  const getUnsupportedProtocolMessage = (type: StreamType): string => {
    const messages: Record<string, string> = {
      rtsp: 'RTSP requer conversão para HLS/MJPEG. Use go2rtc, mediamtx ou similar.',
      rtmp: 'RTMP requer conversão. Use um servidor de mídia para transcodificar para HLS.',
      srt: 'SRT requer conversão. Use ffmpeg ou OBS para transcodificar.',
      udp: 'UDP Multicast não é suportado em navegadores. Use VLC ou transcodificador.',
      rtp: 'RTP não é suportado diretamente. Use um servidor de mídia.',
      webrtc: 'WebRTC requer um servidor de sinalização específico.',
      ndi: 'NDI não é suportado em navegadores. Use software compatível.',
      flv: 'HTTP-FLV requer biblioteca adicional (flv.js). Use HLS como alternativa.',
      ts: 'MPEG-TS direto não é suportado. Converta para HLS.',
    };
    return messages[type] || 'Protocolo não suportado diretamente no navegador.';
  };

  // Capture snapshot function
  const captureSnapshot = useCallback(async () => {
    setIsCapturing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      let captured = false;

      // Try video element first (HLS)
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        captured = true;
      } 
      // Try image element (MJPEG/Snapshot)
      else if (imgRef.current && imgRef.current.naturalWidth > 0) {
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
        ctx.drawImage(imgRef.current, 0, 0);
        captured = true;
      }

      if (!captured) {
        throw new Error('Nenhum frame disponível para captura');
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `${cameraName.replace(/\s+/g, '_')}-${timestamp}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: 'Snapshot capturado',
            description: `Imagem salva: ${a.download}`,
          });
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Capture error:', err);
      toast({
        title: 'Erro na captura',
        description: err instanceof Error ? err.message : 'Não foi possível capturar o snapshot',
        variant: 'destructive',
      });
      setIsCapturing(false);
    }
  }, [cameraName, toast]);

  useEffect(() => {
    if (!open || !streamUrl) return;
    
    setIsLoading(true);
    setError(null);
    setActiveStreamUrl(streamUrl);
    
    // Check if RTSP and go2rtc is available
    const handleRtspWithGo2rtc = async () => {
      if (streamType === 'rtsp' && go2rtcSettings.enabled && go2rtcSettings.serverUrl) {
        const streamName = cameraName.replace(/\s+/g, '_').toLowerCase();
        const result = await registerStream(streamName, streamUrl);
        
        if (result.success && result.hlsUrl) {
          setActiveStreamUrl(result.hlsUrl);
          return true;
        }
      }
      return false;
    };
    
    // Protocols that require conversion
    const unsupportedTypes: StreamType[] = ['rtsp', 'rtmp', 'srt', 'udp', 'rtp', 'webrtc', 'ndi', 'flv', 'ts'];
    
    if (unsupportedTypes.includes(streamType)) {
      // Try go2rtc for RTSP
      if (streamType === 'rtsp') {
        handleRtspWithGo2rtc().then(success => {
          if (!success) {
            setError(getUnsupportedProtocolMessage(streamType));
            setIsLoading(false);
          }
        });
      } else {
        setError(getUnsupportedProtocolMessage(streamType));
        setIsLoading(false);
      }
      return;
    }

    if (streamType === 'hls' || streamType === 'unknown') {
      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        
        hls.loadSource(activeStreamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(() => {});
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (streamType === 'unknown') {
              // Try as snapshot fallback
              setError(null);
            } else {
              setError('Erro ao carregar stream HLS. Verifique se a URL está correta.');
            }
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = activeStreamUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(() => {});
        });
        video.addEventListener('error', () => {
          setError('Erro ao carregar stream.');
          setIsLoading(false);
        });
      } else {
        setError('Seu navegador não suporta reprodução HLS.');
        setIsLoading(false);
      }
    } else {
      // For MJPEG and Snapshot, loading is handled by img onLoad
      setIsLoading(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [open, streamUrl, streamType, activeStreamUrl, go2rtcSettings, registerStream, cameraName]);

  // Auto-refresh for snapshots
  useEffect(() => {
    if (!open || streamType !== 'snapshot' || isPaused) return;
    
    const interval = setInterval(() => {
      setSnapshotKey(prev => prev + 1);
    }, 2000); // Refresh every 2 seconds
    
    return () => clearInterval(interval);
  }, [open, streamType, isPaused]);

  const handleRefresh = () => {
    if (streamType === 'snapshot' || streamType === 'mjpeg') {
      setSnapshotKey(prev => prev + 1);
    } else if (hlsRef.current && videoRef.current) {
      hlsRef.current.loadSource(activeStreamUrl);
      videoRef.current.play().catch(() => {});
    }
  };

  const handlePlayPause = () => {
    if (streamType === 'hls' && videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
    setIsPaused(!isPaused);
  };

  const handleFullscreen = () => {
    const container = document.getElementById('camera-live-container');
    if (!container) return;
    
    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getStreamTypeLabel = (type: StreamType) => {
    const labels: Record<StreamType, string> = {
      hls: 'HLS',
      mjpeg: 'MJPEG',
      snapshot: 'Snapshot',
      flv: 'HTTP-FLV',
      ts: 'MPEG-TS',
      rtsp: 'RTSP',
      rtmp: 'RTMP',
      srt: 'SRT',
      udp: 'UDP',
      rtp: 'RTP',
      webrtc: 'WebRTC',
      ndi: 'NDI',
      unknown: 'Auto',
    };
    return labels[type] || 'Auto';
  };

  const canCapture = !error && !isLoading && (
    (streamType === 'hls' || streamType === 'unknown') ||
    streamType === 'mjpeg' ||
    streamType === 'snapshot'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {cameraName} - Ao Vivo
            <Badge variant="outline" className="ml-2">{getStreamTypeLabel(streamType)}</Badge>
            {hasAuth && (
              <Badge variant="secondary" className="ml-1">
                <Lock className="w-3 h-3 mr-1" />
                Auth
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div id="camera-live-container" className="relative bg-black aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Conectando...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                {['rtsp', 'rtmp', 'srt', 'udp', 'rtp', 'webrtc', 'ndi', 'flv', 'ts'].includes(streamType) && (
                  <div className="text-left bg-muted p-4 rounded-lg text-xs space-y-2">
                    <p className="font-semibold">Formatos suportados diretamente:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code>http://.../*.m3u8</code> - Stream HLS</li>
                      <li><code>http://.../*.mjpg</code> - MJPEG</li>
                      <li><code>http://.../snapshot.jpg</code> - Snapshot</li>
                    </ul>
                    <p className="font-semibold mt-3">URLs com autenticação:</p>
                    <p className="text-muted-foreground">
                      <code>http://usuario:senha@IP/caminho</code>
                    </p>
                    <p className="font-semibold mt-3">Exemplos por fabricante (HTTP):</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><strong>Hikvision:</strong> <code>http://user:pass@IP/Streaming/Channels/101/picture</code></li>
                      <li><strong>Dahua:</strong> <code>http://user:pass@IP/cgi-bin/snapshot.cgi</code></li>
                      <li><strong>Intelbras:</strong> <code>http://user:pass@IP/snap.cgi?chn=1</code></li>
                      <li><strong>Axis:</strong> <code>http://user:pass@IP/axis-cgi/mjpg/video.cgi</code></li>
                    </ul>
                    <p className="mt-3">
                      <strong>Conversores recomendados:</strong>{' '}
                      <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener noreferrer" className="text-primary underline">go2rtc</a>,{' '}
                      <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener noreferrer" className="text-primary underline">mediamtx</a>,{' '}
                      <a href="https://frigate.video" target="_blank" rel="noopener noreferrer" className="text-primary underline">Frigate</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HLS Video */}
          {(streamType === 'hls' || streamType === 'unknown') && !error && (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          )}

          {/* MJPEG / Snapshot Image */}
          {(streamType === 'mjpeg' || streamType === 'snapshot') && !error && (
            <img
              ref={imgRef}
              key={snapshotKey}
              src={streamType === 'snapshot' ? `${activeStreamUrl}${activeStreamUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : activeStreamUrl}
              alt={`Live view de ${cameraName}`}
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Erro ao carregar imagem. Verifique se a URL está correta.');
                setIsLoading(false);
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-3 border-t bg-background">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePlayPause}>
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={captureSnapshot}
              disabled={!canCapture || isCapturing}
              title="Capturar Snapshot"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(streamUrl, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Abrir URL
            </Button>
            <Button variant="outline" size="sm" onClick={handleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
