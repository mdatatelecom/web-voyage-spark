import React from 'react';
import { Building2, Server, Cpu, Cable, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
}) => {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  };

  const iconColorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
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
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", iconColorClasses[color])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
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
  ports?: number;
  isLoading?: boolean;
}

export const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  buildings,
  racks,
  equipment,
  connections,
  ports,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl bg-muted h-[76px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
      {ports !== undefined && (
        <MetricCard
          title="Portas Livres"
          value={ports}
          icon={<Plug className="h-5 w-5" />}
          color="cyan"
        />
      )}
    </div>
  );
};
