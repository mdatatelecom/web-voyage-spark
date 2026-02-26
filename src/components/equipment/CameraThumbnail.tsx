import { useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraThumbnailProps {
  cameraId: string;
  cameraName?: string;
  fallbackImage?: string;
  status?: string;
  className?: string;
  showStatus?: boolean;
}

export function CameraThumbnail({
  cameraName,
  fallbackImage,
  status = 'active',
  className,
  showStatus = true,
}: CameraThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
      {isLoading && fallbackImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-5">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        </div>
      )}

      {/* Image or fallback */}
      {fallbackImage && !hasError ? (
        <img
          src={fallbackImage}
          alt={cameraName || 'Camera thumbnail'}
          className="w-full h-full object-cover"
          onLoad={() => { setIsLoading(false); setHasError(false); }}
          onError={() => { setIsLoading(false); setHasError(true); }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="w-6 h-6 mb-1" />
          <span className="text-[8px]">Sem foto</span>
        </div>
      )}
    </div>
  );
}

export default CameraThumbnail;
