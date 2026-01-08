import { cn } from '@/lib/utils';

interface DeviceStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function DeviceStatusBadge({ status, size = 'md', showLabel = true }: DeviceStatusBadgeProps) {
  const isOnline = status === 'online';
  const isOffline = status === 'offline';
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            'rounded-full',
            sizeClasses[size],
            isOnline && 'bg-green-500',
            isOffline && 'bg-red-500',
            !isOnline && !isOffline && 'bg-yellow-500'
          )}
        />
        {isOnline && (
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
              sizeClasses[size]
            )}
          />
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            labelSizeClasses[size],
            isOnline && 'text-green-600 dark:text-green-400',
            isOffline && 'text-red-600 dark:text-red-400',
            !isOnline && !isOffline && 'text-yellow-600 dark:text-yellow-400'
          )}
        >
          {isOnline ? 'Online' : isOffline ? 'Offline' : 'Desconhecido'}
        </span>
      )}
    </div>
  );
}
