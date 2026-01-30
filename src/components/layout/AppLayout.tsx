import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Network, LogOut, Home, Package, Cable, Tag, Users, Settings, Bell, QrCode, Loader2, Waypoints, Terminal, Camera, Ticket, ChevronLeft, ChevronRight, MessageCircle, User, BarChart3, ClipboardCheck, Brain, Globe, ChevronDown, LucideIcon, Activity, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Breadcrumb } from './Breadcrumb';
import { AlertBell } from '@/components/notifications/AlertBell';
import { MobileViewerLayout } from './MobileViewerLayout';
import { TerminalDialog } from '@/components/cli/TerminalDialog';
import { SystemChatButton } from '@/components/ai/SystemChatButton';
import { GlobalSearch } from './GlobalSearch';

interface AppLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path: string;
  visible: boolean;
  action?: () => void;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
  visible: boolean;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isTechnician, isNetworkViewer, isViewer } = useUserRole();
  const { branding, isLoading: brandingLoading } = useSystemSettings();
  const [terminalOpen, setTerminalOpen] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const stored = localStorage.getItem('sidebar-open-groups');
    return stored ? JSON.parse(stored) : ['infrastructure', 'operations'];
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar-open-groups', JSON.stringify(openGroups));
  }, [openGroups]);

  // Use mobile layout for viewers and network_viewers
  const isMobileViewer = isViewer || isNetworkViewer;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/auth');
    }
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const menuGroups: MenuGroup[] = [
    {
      id: 'main',
      label: 'Principal',
      icon: Home,
      visible: !isNetworkViewer,
      items: [
        { label: 'Dashboard', icon: Home, path: '/dashboard', visible: true },
      ],
    },
    {
      id: 'network-viewer',
      label: 'Minhas Conexões',
      icon: Network,
      visible: isNetworkViewer,
      items: [
        { label: 'Minhas Conexões', icon: Network, path: '/my-connections', visible: true },
      ],
    },
    {
      id: 'infrastructure',
      label: 'Infraestrutura',
      icon: Building2,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Localizações', icon: Building2, path: '/buildings', visible: true },
        { label: 'Racks', icon: Package, path: '/racks', visible: true },
        { label: 'Equipamentos', icon: Cable, path: '/equipment', visible: true },
        { label: 'Conexões', icon: Network, path: '/connections', visible: true },
      ],
    },
    {
      id: 'network',
      label: 'Rede',
      icon: Globe,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Sub-redes', icon: Globe, path: '/ipam', visible: true },
        { label: 'VLANs', icon: Waypoints, path: '/vlans', visible: true },
        { label: 'Mapa da Rede', icon: Waypoints, path: '/network-map', visible: true },
      ],
    },
    {
      id: 'surveillance',
      label: 'Vigilância',
      icon: Camera,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Mapa de Câmeras', icon: Camera, path: '/cameras/map', visible: true },
        { label: 'Relatório NVR', icon: BarChart3, path: '/nvr-report', visible: true },
      ],
    },
    {
      id: 'operations',
      label: 'Operações',
      icon: Ticket,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Chamados', icon: Ticket, path: '/tickets', visible: true },
        { label: 'Etiquetas', icon: Tag, path: '/labels', visible: true },
        { label: 'Escanear QR', icon: QrCode, path: '/scan', visible: true },
        { label: 'Auditoria', icon: ClipboardCheck, path: '/audit', visible: true },
      ],
    },
    {
      id: 'alerts',
      label: 'Alertas',
      icon: Bell,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Lista de Alertas', icon: Bell, path: '/alerts', visible: true },
        { label: 'Dashboard', icon: BarChart3, path: '/alerts/dashboard', visible: true },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoramento',
      icon: Activity,
      visible: (isAdmin || isTechnician) && !isNetworkViewer,
      items: [
        { label: 'Painéis', icon: Activity, path: '/monitoring', visible: true },
      ],
    },
    {
      id: 'system',
      label: 'Sistema',
      icon: Settings,
      visible: isAdmin && !isNetworkViewer,
      items: [
        { label: 'Configurações', icon: Settings, path: '/system', visible: true },
        { label: 'Usuários', icon: Users, path: '/users', visible: true },
        { label: 'WhatsApp', icon: MessageCircle, path: '/whatsapp-history', visible: true },
        { label: 'CLI', icon: Terminal, path: '#cli', visible: true, action: () => setTerminalOpen(true) },
        { label: 'Base de Conhecimento', icon: Brain, path: '/knowledge-base', visible: true },
      ],
    },
    {
      id: 'user',
      label: 'Usuário',
      icon: User,
      visible: true,
      items: [
        { label: 'Meu Perfil', icon: User, path: '/profile', visible: true },
        { label: 'Escanear QR', icon: QrCode, path: '/scan', visible: isViewer && !isTechnician && !isAdmin },
      ],
    },
  ];

  const isGroupActive = (group: MenuGroup) => {
    return group.items.some((item) => item.visible && location.pathname === item.path);
  };

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
            <GlobalSearch />
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
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "sticky top-16 h-[calc(100vh-4rem)] border-r bg-sidebar transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-56"
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
              {menuGroups.map((group) => {
                if (!group.visible) return null;
                const visibleItems = group.items.filter((item) => item.visible);
                if (visibleItems.length === 0) return null;

                const GroupIcon = group.icon;
                const isActive = isGroupActive(group);
                const isOpen = openGroups.includes(group.id);

                // Single item group - render directly
                if (visibleItems.length === 1 && group.id === 'main') {
                  const item = visibleItems[0];
                  const ItemIcon = item.icon;
                  const isItemActive = location.pathname === item.path;

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={group.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isItemActive ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-10 w-10", isItemActive && "bg-primary/10 text-primary")}
                            onClick={() => navigate(item.path)}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Button
                      key={group.id}
                      variant={isItemActive ? "secondary" : "ghost"}
                      className={cn("justify-start gap-2", isItemActive && "bg-primary/10 text-primary font-medium")}
                      onClick={() => navigate(item.path)}
                    >
                      <ItemIcon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                }

                // Collapsed sidebar - show only icons
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={group.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="icon"
                          className={cn("h-10 w-10", isActive && "bg-primary/10 text-primary")}
                          onClick={() => {
                            setSidebarCollapsed(false);
                            if (!openGroups.includes(group.id)) {
                              toggleGroup(group.id);
                            }
                          }}
                        >
                          <GroupIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{group.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                // Expanded sidebar - show collapsible groups
                return (
                  <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between gap-2",
                          isActive && "text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <GroupIcon className="h-4 w-4" />
                          <span className="text-sm">{group.label}</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = location.pathname === item.path;

                        return (
                          <Button
                            key={item.path}
                            variant={isItemActive ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "w-full justify-start gap-2 text-sm h-9",
                              isItemActive && "bg-primary/10 text-primary font-medium"
                            )}
                            onClick={() => {
                              if (item.action) {
                                item.action();
                              } else {
                                navigate(item.path);
                              }
                            }}
                          >
                            <ItemIcon className="h-3.5 w-3.5" />
                            {item.label}
                          </Button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
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

      {/* AI Chat Assistant */}
      <SystemChatButton />
    </div>
  );
};
