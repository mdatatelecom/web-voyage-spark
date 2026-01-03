import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Maximize2, Minimize2, RefreshCw, Play, Pause, Video, ExternalLink } from 'lucide-react';
import Hls from 'hls.js';

interface CameraLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  streamUrl: string;
}

type StreamType = 'hls' | 'mjpeg' | 'snapshot' | 'rtsp' | 'unknown';

const detectStreamType = (url: string): StreamType => {
  const lowerUrl = url.toLowerCase();
  
  // HLS
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls/')) return 'hls';
  
  // MJPEG - padrões comuns de fabricantes
  if (
    lowerUrl.includes('.mjpg') || 
    lowerUrl.includes('.mjpeg') || 
    lowerUrl.includes('/mjpg/') ||
    lowerUrl.includes('/mjpeg/') ||
    lowerUrl.includes('cgi-bin/mjpg') ||
    lowerUrl.includes('/video/mjpg.cgi') || // Dahua
    lowerUrl.includes('videostream.cgi') || // Foscam
    lowerUrl.includes('/axis-cgi/mjpg') || // Axis
    lowerUrl.includes('/cgi-bin/video.cgi') // Genérico
  ) return 'mjpeg';
  
  // Snapshot - padrões comuns de fabricantes
  if (
    lowerUrl.includes('.jpg') || 
    lowerUrl.includes('.jpeg') ||
    lowerUrl.includes('.png') ||
    lowerUrl.includes('snapshot') ||
    lowerUrl.includes('/snap.') ||
    lowerUrl.includes('/picture/') || // Hikvision
    lowerUrl.includes('/cgi-bin/snapshot') ||
    lowerUrl.includes('/snap.cgi') || // Intelbras
    lowerUrl.includes('/streaming/channels') && lowerUrl.includes('picture') || // Hikvision
    lowerUrl.includes('/onvifsnapshot') // ONVIF
  ) return 'snapshot';
  
  // RTSP
  if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
  
  // Tentar detectar padrões de streaming genéricos
  if (
    lowerUrl.includes('/live/') ||
    lowerUrl.includes('/stream/') ||
    lowerUrl.includes('/video/') ||
    lowerUrl.includes('/streaming/')
  ) return 'unknown';
  
  return 'unknown';
};

export function CameraLiveDialog({ open, onOpenChange, cameraName, streamUrl }: CameraLiveDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotKey, setSnapshotKey] = useState(0);
  const streamType = detectStreamType(streamUrl);

  useEffect(() => {
    if (!open || !streamUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    if (streamType === 'rtsp') {
      setError('URLs RTSP não são suportadas diretamente no navegador. Use uma URL HLS (.m3u8), MJPEG (.mjpg) ou snapshot (.jpg).');
      setIsLoading(false);
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
        
        hls.loadSource(streamUrl);
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
        video.src = streamUrl;
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
  }, [open, streamUrl, streamType]);

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
      hlsRef.current.loadSource(streamUrl);
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
    switch (type) {
      case 'hls': return 'HLS';
      case 'mjpeg': return 'MJPEG';
      case 'snapshot': return 'Snapshot';
      case 'rtsp': return 'RTSP';
      default: return 'Auto';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {cameraName} - Ao Vivo
            <Badge variant="outline" className="ml-2">{getStreamTypeLabel(streamType)}</Badge>
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
                {streamType === 'rtsp' && (
                  <div className="text-left bg-muted p-4 rounded-lg text-xs space-y-2">
                    <p className="font-semibold">Formatos suportados:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code>http://.../*.m3u8</code> - Stream HLS</li>
                      <li><code>http://.../*.mjpg</code> - MJPEG</li>
                      <li><code>http://.../snapshot.jpg</code> - Snapshot</li>
                    </ul>
                    <p className="font-semibold mt-3">Exemplos por fabricante:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><strong>Hikvision:</strong> <code>http://IP/Streaming/Channels/101/picture</code></li>
                      <li><strong>Dahua:</strong> <code>http://IP/cgi-bin/snapshot.cgi</code></li>
                      <li><strong>Intelbras:</strong> <code>http://IP/snap.cgi?chn=1</code></li>
                      <li><strong>Axis:</strong> <code>http://IP/axis-cgi/mjpg/video.cgi</code></li>
                    </ul>
                    <p className="mt-2">Para converter RTSP, use <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener noreferrer" className="text-primary underline">go2rtc</a> ou similar.</p>
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
              key={snapshotKey}
              src={streamType === 'snapshot' ? `${streamUrl}${streamUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : streamUrl}
              alt={`Live view de ${cameraName}`}
              className="w-full h-full object-contain"
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
