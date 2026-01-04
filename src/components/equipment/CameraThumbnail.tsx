import { useState, useEffect } from 'react';
import { Camera, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGo2rtcSettings } from '@/hooks/useGo2rtcSettings';

interface CameraThumbnailProps {
  cameraId: string;
  cameraName?: string;
  snapshotUrl?: string;
  liveUrl?: string;
  fallbackImage?: string;
  status?: string;
  className?: string;
  refreshInterval?: number; // in seconds, 0 to disable auto-refresh
  showStatus?: boolean;
}

export function CameraThumbnail({
  cameraId,
  cameraName,
  snapshotUrl,
  liveUrl,
  fallbackImage,
  status = 'active',
  className,
  refreshInterval = 30,
  showStatus = true,
}: CameraThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const { settings: go2rtcSettings, getSnapshot } = useGo2rtcSettings();

  // Determine the best source for thumbnail
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    const loadThumbnail = async () => {
      // Priority 1: Explicit snapshot URL configured
      if (snapshotUrl) {
        setImageSrc(`${snapshotUrl}${snapshotUrl.includes('?') ? '&' : '?'}t=${lastRefresh}`);
        return;
      }

      // Priority 2: Try go2rtc snapshot if enabled and RTSP stream configured
      if (go2rtcSettings.enabled && go2rtcSettings.serverUrl && liveUrl?.toLowerCase().startsWith('rtsp://')) {
        try {
          const streamName = cameraName?.replace(/\s+/g, '_').toLowerCase() || `cam_${cameraId}`;
          const snapshot = await getSnapshot(streamName);
          if (snapshot && isMounted) {
            setImageSrc(snapshot);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.log('go2rtc snapshot failed, trying fallback');
        }
      }

      // Priority 3: For HLS streams, we can't easily get a snapshot
      // Priority 4: Use fallback image (location photo)
      if (fallbackImage) {
        setImageSrc(fallbackImage);
        return;
      }

      // No thumbnail available
      if (isMounted) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadThumbnail();

    return () => {
      isMounted = false;
    };
  }, [cameraId, cameraName, snapshotUrl, liveUrl, fallbackImage, go2rtcSettings, getSnapshot, lastRefresh]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0 || hasError) return;

    const interval = setInterval(() => {
      setLastRefresh(Date.now());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, hasError]);

  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    // Try fallback if not already using it
    if (imageSrc !== fallbackImage && fallbackImage) {
      setImageSrc(fallbackImage);
      setHasError(false);
      setIsLoading(true);
    }
  };

  const isOnline = status === 'active';

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-muted",
      className
    )}>
      {/* Status indicator */}
      {showStatus && (
        <div className={cn(
          "absolute top-1 right-1 z-10 w-2.5 h-2.5 rounded-full",
          isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
        )} />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-5">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        </div>
      )}

      {/* Image or fallback */}
      {imageSrc && !hasError ? (
        <img
          src={imageSrc}
          alt={cameraName || 'Camera thumbnail'}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="w-6 h-6 mb-1" />
          {hasError ? (
            <span className="text-[8px]">Sem preview</span>
          ) : (
            <span className="text-[8px]">Carregando...</span>
          )}
        </div>
      )}

      {/* Live indicator for streams */}
      {liveUrl && isOnline && (
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[8px] font-medium flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* Refresh button on hover */}
      {snapshotUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          className="absolute bottom-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default CameraThumbnail;
