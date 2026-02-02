import { useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraThumbnailProps {
  cameraId: string;
  cameraName?: string;
  snapshotUrl?: string;
  liveUrl?: string;
  fallbackImage?: string;
  status?: string;
  className?: string;
  refreshInterval?: number;
  showStatus?: boolean;
}

export function CameraThumbnail({
  cameraName,
  snapshotUrl,
  liveUrl,
  fallbackImage,
  status = 'active',
  className,
  showStatus = true,
}: CameraThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use saved image directly - no async loading needed
  const imageSrc = snapshotUrl 
    ? `${snapshotUrl}${snapshotUrl.includes('?') ? '&' : '?'}t=${refreshKey}`
    : fallbackImage || null;

  const handleRefresh = () => {
    setRefreshKey(Date.now());
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
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
