import iwFiberLogo from '@/assets/iw-fiber-logo.png';

interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className }: LandingFooterProps) {
  return (
    <footer className={`w-full border-t border-border/50 bg-background/80 backdrop-blur-sm ${className || ''}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo IW Fiber */}
          <div className="flex items-center gap-3">
            <img 
              src={iwFiberLogo} 
              alt="IW Fiber" 
              className="h-10 w-auto object-contain"
            />
          </div>
          
          {/* Copyright e Creditos */}
          <div className="text-center text-sm text-muted-foreground">
            <span>© 2026 Iw Fiber | Technology by </span>
            <span className="font-semibold text-foreground">Masm</span>
            <span className="hidden md:inline"> — </span>
            <span className="block md:inline mt-1 md:mt-0">Uso exclusivo de clientes</span>
          </div>
          
          {/* Versao */}
          <div className="text-xs text-muted-foreground/60">
            v1.0
          </div>
        </div>
      </div>
    </footer>
  );
}
