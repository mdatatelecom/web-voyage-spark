import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Network, LogOut, Home, Building, Package, Cable, Tag, Users, Settings, Bell, QrCode, Loader2, Waypoints, Terminal, Camera, Ticket, ChevronLeft, ChevronRight, MessageCircle, User, BarChart3, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useLabels } from '@/hooks/useLabels';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Breadcrumb } from './Breadcrumb';
import { AlertBell } from '@/components/notifications/AlertBell';
import { MobileViewerLayout } from './MobileViewerLayout';
import { TerminalDialog } from '@/components/cli/TerminalDialog';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isTechnician, isNetworkViewer, isViewer } = useUserRole();
  const { labels } = useLabels();
  const { branding, isLoading: brandingLoading } = useSystemSettings();
  const [terminalOpen, setTerminalOpen] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Use mobile layout for viewers and network_viewers
  const isMobileViewer = isViewer || isNetworkViewer;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/auth');
    }
  };

  const menuItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard', visible: !isNetworkViewer, badge: undefined },
    { label: 'Minhas Conexões', icon: Network, path: '/my-connections', visible: isNetworkViewer, badge: undefined },
    { label: 'Localizações', icon: Building2, path: '/buildings', visible: !isNetworkViewer, badge: undefined },
    { label: 'Racks', icon: Package, path: '/racks', visible: !isNetworkViewer, badge: undefined },
    { label: 'Equipamentos', icon: Cable, path: '/equipment', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Conexões', icon: Network, path: '/connections', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Mapa da Rede', icon: Waypoints, path: '/network-map', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Mapa de Câmeras', icon: Camera, path: '/cameras/map', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Relatório NVR', icon: BarChart3, path: '/nvr-report', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Auditoria', icon: ClipboardCheck, path: '/audit', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'Escanear QR', icon: QrCode, path: '/scan', visible: true, badge: undefined },
    { label: 'Etiquetas', icon: Tag, path: '/labels', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined, action: undefined },
    { label: 'Chamados', icon: Ticket, path: '/tickets', visible: (isAdmin || isTechnician) && !isNetworkViewer, badge: undefined },
    { label: 'WhatsApp', icon: MessageCircle, path: '/whatsapp-history', visible: isAdmin && !isNetworkViewer, badge: undefined },
    { label: 'CLI', icon: Terminal, path: '#cli', visible: isAdmin && !isNetworkViewer, badge: undefined, action: () => setTerminalOpen(true) },
    { label: 'Alertas', icon: Bell, path: '/alerts', visible: !isNetworkViewer, badge: undefined },
    { label: 'Meu Perfil', icon: User, path: '/profile', visible: true, badge: undefined },
    { label: 'Sistema', icon: Settings, path: '/system', visible: isAdmin && !isNetworkViewer, badge: undefined },
    { label: 'Usuários', icon: Users, path: '/users', visible: isAdmin && !isNetworkViewer, badge: undefined },
  ];

  // Return mobile layout for viewers
  if (isMobileViewer) {
    return <MobileViewerLayout>{children}</MobileViewerLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            {brandingLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.systemName} className="h-8 w-auto" />
            ) : (
              <>
                <Network className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">{branding.systemName}</h1>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <AlertBell />
            {user?.email && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-foreground">{user.email}</span>
                <div className="flex gap-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role === 'admin' ? 'Admin' : role === 'technician' ? 'Técnico' : role === 'network_viewer' ? 'Vis. Rede' : 'Visualizador'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sair do sistema</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "sticky top-16 h-[calc(100vh-4rem)] border-r bg-sidebar transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex justify-end p-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-49px)]">
            <nav className="flex flex-col gap-1 p-2">
              {menuItems.map((item) => {
                if (!item.visible) return null;
                
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-10 w-10",
                            isActive && "bg-primary/10 text-primary"
                          )}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              navigate(item.path);
                            }
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start gap-2 relative",
                      isActive && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="border-b bg-muted/30 px-6 py-3">
            <Breadcrumb />
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Terminal Dialog */}
      <TerminalDialog open={terminalOpen} onOpenChange={setTerminalOpen} />
    </div>
  );
};
