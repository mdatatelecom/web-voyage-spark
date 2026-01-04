import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Maximize2, Minimize2, RefreshCw, Play, Pause, Video, ExternalLink, Lock, Camera, Zap } from 'lucide-react';
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

type StreamMode = 'detecting' | 'webrtc' | 'hls' | 'mjpeg' | 'snapshot' | 'error';

// Constants for retry logic
const MAX_WEBRTC_ATTEMPTS = 2;
const WEBRTC_TIMEOUT_MS = 8000;

// Extract auth credentials from URL
const extractAuthFromUrl = (url: string): { cleanUrl: string; username?: string; password?: string } => {
  try {
    const urlObj = new URL(url);
    const username = urlObj.username || undefined;
    const password = urlObj.password || undefined;
    
    if (username || password) {
      urlObj.username = '';
      urlObj.password = '';
      return { cleanUrl: urlObj.toString(), username, password };
    }
    return { cleanUrl: url };
  } catch {
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
  const urlWithoutAuth = lowerUrl.replace(/\/\/[^:]+:[^@]+@/, '//');
  
  if (urlWithoutAuth.includes('.m3u8') || urlWithoutAuth.includes('/hls/')) return 'hls';
  if (urlWithoutAuth.includes('.flv') || urlWithoutAuth.includes('/live.flv')) return 'flv';
  if (urlWithoutAuth.includes('.ts') && !urlWithoutAuth.includes('.tsx')) return 'ts';
  
  if (
    urlWithoutAuth.includes('.mjpg') || 
    urlWithoutAuth.includes('.mjpeg') || 
    urlWithoutAuth.includes('/mjpg/') ||
    urlWithoutAuth.includes('/mjpeg/') ||
    urlWithoutAuth.includes('cgi-bin/mjpg') ||
    urlWithoutAuth.includes('/video/mjpg.cgi') ||
    urlWithoutAuth.includes('videostream.cgi') ||
    urlWithoutAuth.includes('/axis-cgi/mjpg') ||
    urlWithoutAuth.includes('/cgi-bin/video.cgi') ||
    urlWithoutAuth.includes('httppreview')
  ) return 'mjpeg';
  
  if (
    urlWithoutAuth.includes('.jpg') || 
    urlWithoutAuth.includes('.jpeg') ||
    urlWithoutAuth.includes('.png') ||
    urlWithoutAuth.includes('snapshot') ||
    urlWithoutAuth.includes('/snap.') ||
    urlWithoutAuth.includes('/picture') ||
    urlWithoutAuth.includes('/cgi-bin/snapshot') ||
    urlWithoutAuth.includes('/snap.cgi') ||
    urlWithoutAuth.includes('/onvifsnapshot') ||
    urlWithoutAuth.includes('image.cgi')
  ) return 'snapshot';
  
  if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
  if (lowerUrl.startsWith('rtmp://') || lowerUrl.startsWith('rtmps://')) return 'rtmp';
  if (lowerUrl.startsWith('srt://')) return 'srt';
  if (lowerUrl.startsWith('udp://')) return 'udp';
  if (lowerUrl.startsWith('rtp://')) return 'rtp';
  if (lowerUrl.startsWith('webrtc://') || lowerUrl.startsWith('wss://')) return 'webrtc';
  if (lowerUrl.startsWith('ndi://')) return 'ndi';
  
  if (
    urlWithoutAuth.includes('/live/') ||
    urlWithoutAuth.includes('/stream/') ||
    urlWithoutAuth.includes('/video/') ||
    urlWithoutAuth.includes('/streaming/')
  ) return 'unknown';
  
  return 'unknown';
};

// Detect Wowza Cloud URLs and generate direct HLS URL
const getWowzaHlsUrl = (url: string): string | null => {
  const lowerUrl = url.toLowerCase();
  const isWowzaCloud = lowerUrl.includes('wowza.com') || 
                        lowerUrl.includes('entrypoint.cloud') ||
                        lowerUrl.includes('.wowza.');
  
  if (isWowzaCloud && lowerUrl.startsWith('rtsp://')) {
    try {
      // Parse URL properly
      const urlObj = new URL(url.replace('rtsp://', 'https://'));
      // Remove port for HTTPS (443 is default)
      urlObj.port = '';
      // Ensure path ends with /playlist.m3u8
      const path = urlObj.pathname.replace(/\/?$/, '');
      urlObj.pathname = path + '/playlist.m3u8';
      return urlObj.toString();
    } catch {
      // Fallback to regex replacement
      return url
        .replace(/^rtsp:\/\//i, 'https://')
        .replace(/:\d+/, '') // Remove any port
        .replace(/\/?$/, '/playlist.m3u8');
    }
  }
  return null;
};

// Check if URL is from Wowza Cloud
const isWowzaCloudUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('wowza.com') || 
         lowerUrl.includes('entrypoint.cloud') ||
         lowerUrl.includes('.wowza.');
};

export function CameraLiveDialog({ open, onOpenChange, cameraName, streamUrl }: CameraLiveDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const initRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotKey, setSnapshotKey] = useState(0);
  const [activeStreamUrl, setActiveStreamUrl] = useState(streamUrl);
  const [activeStreamType, setActiveStreamType] = useState<StreamType | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>('detecting');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGo2rtcActive, setIsGo2rtcActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const { settings: go2rtcSettings, registerStream, exchangeWebRtcSdp } = useGo2rtcSettings();
  
  const originalStreamType = detectStreamType(streamUrl);
  const streamType = activeStreamType || originalStreamType;
  
  const authInfo = useMemo(() => extractAuthFromUrl(streamUrl), [streamUrl]);
  const hasAuth = Boolean(authInfo.username || authInfo.password);

  const getUnsupportedProtocolMessage = (type: StreamType): string => {
    const messages: Record<string, string> = {
      rtsp: 'RTSP requer conversão para HLS/WebRTC. Use go2rtc, mediamtx ou similar.',
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

  const captureSnapshot = useCallback(async () => {
    setIsCapturing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      let captured = false;

      if (videoRef.current && videoRef.current.videoWidth > 0) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        captured = true;
      } 
      else if (imgRef.current && imgRef.current.naturalWidth > 0) {
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
        ctx.drawImage(imgRef.current, 0, 0);
        captured = true;
      }

      if (!captured) {
        throw new Error('Nenhum frame disponível para captura');
      }

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

  const initHlsPlayer = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setStreamMode('hls');
        video.play().catch(() => {});
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          setError('Erro ao carregar stream HLS. Verifique se a URL está correta.');
          setStreamMode('error');
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setStreamMode('hls');
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Erro ao carregar stream.');
        setStreamMode('error');
        setIsLoading(false);
      });
    } else {
      setError('Seu navegador não suporta reprodução HLS.');
      setStreamMode('error');
      setIsLoading(false);
    }
  }, []);

  const initWebRtcPlayer = useCallback(async (streamName: string): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      console.log('Initializing WebRTC for stream:', streamName);
      
      // Close existing connection if any
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // Create peer connection with STUN server
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });
      pcRef.current = pc;

      // Set up to receive video and audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Promise that resolves when we get a track
      const trackPromise = new Promise<boolean>((resolve) => {
        pc.ontrack = (event) => {
          console.log('WebRTC track received:', event.track.kind);
          if (event.streams[0]) {
            video.srcObject = event.streams[0];
            video.play().catch((e) => console.warn('Video play error:', e));
            setIsLoading(false);
            setStreamMode('webrtc');
            resolve(true);
          }
        };
      });

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('WebRTC connection failed/disconnected');
          setLastError('Conexão WebRTC falhou');
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (!offer.sdp) {
        throw new Error('Failed to create SDP offer');
      }

      console.log('Sending SDP offer to go2rtc...');
      
      // Exchange SDP via Edge Function proxy with timeout
      const sdpPromise = exchangeWebRtcSdp(streamName, offer.sdp);
      const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => 
        setTimeout(() => resolve({ success: false, error: 'Timeout na troca SDP' }), WEBRTC_TIMEOUT_MS)
      );
      
      const result = await Promise.race([sdpPromise, timeoutPromise]);
      
      if (!result.success || !('sdpAnswer' in result) || !result.sdpAnswer) {
        throw new Error(result.error || 'Failed to exchange SDP');
      }

      console.log('Received SDP answer, setting remote description...');

      // Apply answer
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: result.sdpAnswer
      });

      console.log('WebRTC setup complete, waiting for track...');
      
      // Wait for track with timeout
      const trackTimeout = new Promise<boolean>((resolve) => 
        setTimeout(() => resolve(false), WEBRTC_TIMEOUT_MS)
      );
      
      const gotTrack = await Promise.race([trackPromise, trackTimeout]);
      
      if (!gotTrack) {
        throw new Error('Timeout aguardando stream de vídeo');
      }
      
      return true;
    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      setLastError(error instanceof Error ? error.message : 'Erro WebRTC desconhecido');
      // Clean up on failure
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      return false;
    }
  }, [exchangeWebRtcSdp]);

  useEffect(() => {
    if (!open || !streamUrl) return;
    
    // Prevent multiple parallel initializations
    if (initRef.current) {
      console.log('Stream initialization already in progress, skipping');
      return;
    }
    initRef.current = true;
    
    setIsLoading(true);
    setError(null);
    setLastError(null);
    setActiveStreamUrl(streamUrl);
    setActiveStreamType(null);
    setStreamMode('detecting');
    setIsGo2rtcActive(false);
    
    const detectedType = detectStreamType(streamUrl);
    
    const processStream = async () => {
      let finalUrl = streamUrl;
      let finalType = detectedType;
      let usingGo2rtc = false;
      
      // Check for Wowza Cloud - try direct HLS first
      if (detectedType === 'rtsp') {
        const wowzaHlsUrl = getWowzaHlsUrl(streamUrl);
        if (wowzaHlsUrl) {
          console.log('Detected Wowza Cloud, trying direct HLS:', wowzaHlsUrl);
          finalUrl = wowzaHlsUrl;
          finalType = 'hls';
          setActiveStreamUrl(finalUrl);
          setActiveStreamType(finalType);
          initHlsPlayer(finalUrl);
          return;
        }
      }
      
      // If RTSP and go2rtc is configured, try WebRTC first, then HLS
      if (detectedType === 'rtsp' && go2rtcSettings.enabled && go2rtcSettings.serverUrl) {
        // Clean stream name - remove special chars and trailing hyphens
        const streamName = cameraName
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .replace(/-+$/, '')
          .toLowerCase() || 'stream';
        
        console.log('Registering stream in go2rtc:', streamName);
        
        // Register stream in go2rtc
        const regResult = await registerStream(streamName, streamUrl);
        
        if (regResult.success) {
          usingGo2rtc = true;
          setIsGo2rtcActive(true);
          
          // Try WebRTC first (lower latency ~100-300ms) with retry
          let webrtcSuccess = false;
          for (let attempt = 1; attempt <= MAX_WEBRTC_ATTEMPTS; attempt++) {
            console.log(`WebRTC attempt ${attempt}/${MAX_WEBRTC_ATTEMPTS}...`);
            webrtcSuccess = await initWebRtcPlayer(streamName);
            if (webrtcSuccess) break;
            
            // Small delay before retry
            if (attempt < MAX_WEBRTC_ATTEMPTS) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
          
          if (webrtcSuccess) {
            console.log('WebRTC connection successful!');
            setActiveStreamType('webrtc');
            return; // Success with WebRTC!
          }
          
          // Fallback to HLS if WebRTC fails (~3-5s latency)
          console.log('WebRTC failed after retries, falling back to HLS...');
          finalUrl = regResult.hlsUrl!;
          finalType = 'hls';
        } else {
          console.warn('Failed to register stream in go2rtc:', regResult.message);
          setLastError(regResult.message || 'Falha ao registrar stream');
          
          // If go2rtc failed and it's Wowza, try direct HLS as fallback
          if (isWowzaCloudUrl(streamUrl)) {
            const wowzaHlsUrl = getWowzaHlsUrl(streamUrl);
            if (wowzaHlsUrl) {
              console.log('go2rtc failed, trying Wowza direct HLS fallback:', wowzaHlsUrl);
              finalUrl = wowzaHlsUrl;
              finalType = 'hls';
              setActiveStreamUrl(finalUrl);
              setActiveStreamType(finalType);
              setIsGo2rtcActive(false);
              initHlsPlayer(finalUrl);
              return;
            }
          }
        }
      }
      
      // Check if protocol is still unsupported
      const unsupportedTypes: StreamType[] = ['rtsp', 'rtmp', 'srt', 'udp', 'rtp', 'ndi', 'flv', 'ts'];
      if (unsupportedTypes.includes(finalType)) {
        // Build informative error message
        const errorParts = [getUnsupportedProtocolMessage(finalType)];
        
        if (isWowzaCloudUrl(streamUrl)) {
          errorParts.push('Verifique se o stream Wowza está ativo e público.');
        }
        
        if (lastError) {
          errorParts.push(`Detalhe: ${lastError}`);
        }
        
        setError(errorParts.join(' '));
        setStreamMode('error');
        setIsLoading(false);
        return;
      }
      
      setActiveStreamUrl(finalUrl);
      setActiveStreamType(finalType);
      setIsGo2rtcActive(usingGo2rtc);
      
      if (finalType === 'hls' || finalType === 'unknown') {
        initHlsPlayer(finalUrl);
      } else if (finalType === 'mjpeg') {
        setStreamMode('mjpeg');
        setIsLoading(true);
      } else if (finalType === 'snapshot') {
        setStreamMode('snapshot');
        setIsLoading(true);
      } else {
        setIsLoading(true);
      }
    };
    
    processStream();

    return () => {
      initRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, streamUrl, go2rtcSettings.enabled, go2rtcSettings.serverUrl, registerStream, cameraName, initHlsPlayer, initWebRtcPlayer, lastError]);

  // Auto-refresh for snapshots
  useEffect(() => {
    if (!open || streamType !== 'snapshot' || isPaused) return;
    
    const interval = setInterval(() => {
      setSnapshotKey(prev => prev + 1);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [open, streamType, isPaused]);

  const handleRefresh = () => {
    if (streamType === 'snapshot' || streamType === 'mjpeg') {
      setSnapshotKey(prev => prev + 1);
    } else if (streamMode === 'webrtc' && pcRef.current) {
      // For WebRTC, re-initialize the connection
      const streamName = cameraName.replace(/\s+/g, '_').toLowerCase();
      setIsLoading(true);
      initWebRtcPlayer(streamName);
    } else if (hlsRef.current && videoRef.current) {
      hlsRef.current.loadSource(activeStreamUrl);
      videoRef.current.play().catch(() => {});
    }
  };

  const handlePlayPause = () => {
    if ((streamType === 'hls' || streamMode === 'webrtc') && videoRef.current) {
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

  const getStreamModeLabel = (): string => {
    switch (streamMode) {
      case 'webrtc': return 'WebRTC';
      case 'hls': return 'HLS';
      case 'mjpeg': return 'MJPEG';
      case 'snapshot': return 'Snapshot';
      case 'detecting': return 'Conectando...';
      default: return 'Auto';
    }
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
    streamMode === 'webrtc' ||
    streamMode === 'hls' ||
    streamMode === 'mjpeg' ||
    streamMode === 'snapshot'
  );

  const showVideo = streamMode === 'webrtc' || streamMode === 'hls' || 
    (streamMode === 'detecting' && (streamType === 'hls' || streamType === 'unknown' || streamType === 'rtsp'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Video className="w-5 h-5" />
            {cameraName} - Ao Vivo
            
            {streamMode === 'webrtc' ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <Zap className="w-3 h-3 mr-1" />
                WebRTC
              </Badge>
            ) : (
              <Badge variant="outline">
                {getStreamModeLabel()}
              </Badge>
            )}
            
            {hasAuth && (
              <Badge variant="secondary">
                <Lock className="w-3 h-3 mr-1" />
                Auth
              </Badge>
            )}
            
            {isGo2rtcActive && (
              <Badge variant="secondary" className="bg-blue-600/80 text-white">
                go2rtc
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div id="camera-live-container" className="relative bg-black aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">
                  {streamMode === 'detecting' ? 'Conectando...' : 'Carregando...'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 z-10">
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
                    <p className="font-semibold mt-3">Para RTSP com go2rtc:</p>
                    <p className="text-muted-foreground">
                      Configure o servidor go2rtc em Configurações &rarr; go2rtc para conversão automática via WebRTC (baixa latência) ou HLS.
                    </p>
                    <p className="mt-3">
                      <strong>Conversores:</strong>{' '}
                      <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener noreferrer" className="text-primary underline">go2rtc</a>,{' '}
                      <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener noreferrer" className="text-primary underline">mediamtx</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video element for HLS and WebRTC */}
          {showVideo && !error && (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          )}

          {/* Image element for MJPEG / Snapshot */}
          {(streamMode === 'mjpeg' || streamMode === 'snapshot') && !error && (
            <img
              ref={imgRef}
              key={snapshotKey}
              src={streamMode === 'snapshot' ? `${activeStreamUrl}${activeStreamUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : activeStreamUrl}
              alt={`Live view de ${cameraName}`}
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Erro ao carregar imagem. Verifique se a URL está correta.');
                setStreamMode('error');
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
