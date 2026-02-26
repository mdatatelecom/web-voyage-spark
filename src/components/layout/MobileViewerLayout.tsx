import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { LogOut, QrCode, List } from 'lucide-react';


interface MobileViewerLayoutProps {
  children: ReactNode;
}

export const MobileViewerLayout = ({ children }: MobileViewerLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { branding } = useSystemSettings();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Compacto */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.systemName} className="h-8 w-auto" />
          ) : (
            <h1 className="text-lg font-semibold">{branding.systemName}</h1>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-6 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-around px-4">
          <Button
            variant={isActive('/scan') ? 'default' : 'ghost'}
            size="lg"
            onClick={() => navigate('/scan')}
            className="flex flex-col items-center gap-1 h-auto py-2 px-4"
          >
            <QrCode className="h-5 w-5" />
            <span className="text-xs">Escanear</span>
          </Button>
          
          <Button
            variant={isActive('/my-connections') ? 'default' : 'ghost'}
            size="lg"
            onClick={() => navigate('/my-connections')}
            className="flex flex-col items-center gap-1 h-auto py-2 px-4"
          >
            <List className="h-5 w-5" />
            <span className="text-xs">Minhas Conexões</span>
          </Button>
        </div>
      </nav>

      
    </div>
  );
};
