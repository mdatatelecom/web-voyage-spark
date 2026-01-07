import React from 'react';
import { Building2, Server, Cpu, Cable, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color,
}) => {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-600',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-600',
  };

  const iconColorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl p-4 border",
        "bg-gradient-to-br transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        colorClasses[color]
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-current opacity-5 -mr-8 -mt-8" />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {trend > 0 && '+'}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={cn("p-2.5 rounded-lg", iconColorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface MetricsWidgetProps {
  buildings: number;
  racks: number;
  equipment: number;
  connections: number;
  isLoading?: boolean;
}

export const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  buildings,
  racks,
  equipment,
  connections,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 h-full animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-muted h-full min-h-[100px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <MetricCard
        title="Localizações"
        value={buildings}
        icon={<Building2 className="h-5 w-5" />}
        color="blue"
      />
      <MetricCard
        title="Racks"
        value={racks}
        icon={<Server className="h-5 w-5" />}
        color="green"
      />
      <MetricCard
        title="Equipamentos"
        value={equipment}
        icon={<Cpu className="h-5 w-5" />}
        color="purple"
      />
      <MetricCard
        title="Conexões"
        value={connections}
        icon={<Cable className="h-5 w-5" />}
        color="orange"
      />
    </div>
  );
};
