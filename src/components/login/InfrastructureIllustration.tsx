import { useSystemSettings } from '@/hooks/useSystemSettings';

export const InfrastructureIllustration = () => {
  const { branding } = useSystemSettings();

  return (
    <div className="relative w-full h-full flex items-center justify-center p-12">
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-md opacity-20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Rack */}
        <rect x="140" y="80" width="120" height="240" rx="8" className="stroke-primary" strokeWidth="2" />
        
        {/* Rack Units */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <g key={i}>
            <rect 
              x="148" 
              y={92 + i * 28} 
              width="104" 
              height="24" 
              rx="2" 
              className="fill-primary/30 stroke-primary" 
              strokeWidth="1" 
            />
            {/* LED indicators */}
            <circle cx="158" cy={104 + i * 28} r="3" className="fill-primary animate-pulse" />
            <circle cx="170" cy={104 + i * 28} r="3" className="fill-primary/50" />
            {/* Ports */}
            {[0, 1, 2, 3, 4].map((j) => (
              <rect 
                key={j} 
                x={200 + j * 10} 
                y={98 + i * 28} 
                width="6" 
                height="12" 
                rx="1" 
                className="stroke-primary/60" 
                strokeWidth="0.5" 
              />
            ))}
          </g>
        ))}
        
        {/* Side Rack Left */}
        <rect x="40" y="120" width="60" height="160" rx="6" className="stroke-primary/60" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect 
            key={`left-${i}`} 
            x="48" 
            y={132 + i * 28} 
            width="44" 
            height="20" 
            rx="2" 
            className="fill-primary/20 stroke-primary/40" 
            strokeWidth="0.5" 
          />
        ))}
        
        {/* Side Rack Right */}
        <rect x="300" y="120" width="60" height="160" rx="6" className="stroke-primary/60" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect 
            key={`right-${i}`} 
            x="308" 
            y={132 + i * 28} 
            width="44" 
            height="20" 
            rx="2" 
            className="fill-primary/20 stroke-primary/40" 
            strokeWidth="0.5" 
          />
        ))}
        
        {/* Connection Lines */}
        <path 
          d="M100 180 L140 180" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeDasharray="4 2"
        />
        <path 
          d="M100 220 L140 220" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeDasharray="4 2"
        />
        <path 
          d="M260 180 L300 180" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeDasharray="4 2"
        />
        <path 
          d="M260 220 L300 220" 
          className="stroke-primary/60" 
          strokeWidth="2" 
          strokeDasharray="4 2"
        />
        
        {/* Top Connection Hub */}
        <ellipse cx="200" cy="50" rx="40" ry="20" className="stroke-primary/40" strokeWidth="1.5" />
        <path d="M200 70 L200 80" className="stroke-primary/60" strokeWidth="2" />
        
        {/* Bottom Base */}
        <rect x="120" y="330" width="160" height="12" rx="4" className="fill-primary/20 stroke-primary/40" strokeWidth="1" />
        
        {/* Floating Data Points */}
        <circle cx="60" cy="100" r="4" className="fill-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="340" cy="100" r="4" className="fill-primary/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <circle cx="60" cy="300" r="4" className="fill-primary/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
        <circle cx="340" cy="300" r="4" className="fill-primary/40 animate-pulse" style={{ animationDelay: '0.8s' }} />
      </svg>
      
      {/* Feature Highlights */}
      <div className="absolute bottom-12 left-12 right-12 space-y-4">
        <h2 className="text-2xl font-bold text-foreground/80">
          Gestão Inteligente de Infraestrutura
        </h2>
        <p className="text-muted-foreground text-sm">
          Controle completo de racks, equipamentos, conexões e muito mais em uma única plataforma.
        </p>
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Monitoramento em tempo real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
            <span className="text-xs text-muted-foreground">Gestão de tickets</span>
          </div>
        </div>
      </div>
    </div>
  );
};
