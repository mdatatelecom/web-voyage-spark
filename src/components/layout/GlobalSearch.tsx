import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator 
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Server, 
  Cable, 
  Network, 
  BarChart3, 
  AlertCircle, 
  Settings, 
  Users, 
  Ticket, 
  Tag,
  Camera,
  Map,
  HardDrive,
  Globe,
  QrCode,
  FileText,
  Bell,
  Search,
  Keyboard
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface SearchItem {
  id: string;
  title: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
  category: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, isTechnician, isNetworkViewer, isViewer } = useUserRole();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [
      // Dashboard
      { id: 'dashboard', title: 'Dashboard', path: '/', icon: BarChart3, keywords: ['painel', 'início', 'home'], category: 'Principal' },
      
      // Infraestrutura
      { id: 'buildings', title: 'Localizações', path: '/buildings', icon: Building2, keywords: ['prédios', 'andares', 'salas', 'locais'], category: 'Infraestrutura' },
      { id: 'racks', title: 'Racks', path: '/racks', icon: Server, keywords: ['rack', 'gabinete', 'armário'], category: 'Infraestrutura' },
      { id: 'equipment', title: 'Equipamentos', path: '/equipment', icon: HardDrive, keywords: ['servidor', 'switch', 'roteador', 'dispositivo'], category: 'Infraestrutura' },
      { id: 'rack-occupancy', title: 'Ocupação de Racks', path: '/rack-occupancy', icon: BarChart3, keywords: ['relatório', 'ocupação', 'capacidade'], category: 'Infraestrutura' },
      
      // Rede
      { id: 'connections', title: 'Conexões', path: '/connections', icon: Cable, keywords: ['cabo', 'link', 'patch'], category: 'Rede' },
      { id: 'vlans', title: 'VLANs', path: '/vlans', icon: Network, keywords: ['vlan', 'rede virtual', 'segmentação'], category: 'Rede' },
      { id: 'subnets', title: 'Sub-redes', path: '/subnets', icon: Globe, keywords: ['subnet', 'ip', 'cidr', 'ipam'], category: 'Rede' },
      { id: 'network-map', title: 'Mapa de Rede', path: '/network-map', icon: Map, keywords: ['topologia', 'diagrama', 'mapa'], category: 'Rede' },
      { id: 'ipam', title: 'IPAM Dashboard', path: '/ipam', icon: Globe, keywords: ['ip', 'endereço', 'gerenciamento'], category: 'Rede' },
      
      // Vigilância
      { id: 'cameras', title: 'Mapa de Câmeras', path: '/camera-map', icon: Camera, keywords: ['cftv', 'vigilância', 'monitoramento'], category: 'Vigilância' },
      { id: 'nvr', title: 'Relatório NVR', path: '/nvr-report', icon: Camera, keywords: ['nvr', 'gravador', 'canais'], category: 'Vigilância' },
      
      // Operações
      { id: 'tickets', title: 'Chamados', path: '/tickets', icon: Ticket, keywords: ['suporte', 'ticket', 'atendimento', 'sla'], category: 'Operações' },
      { id: 'ticket-metrics', title: 'Métricas de Chamados', path: '/ticket-metrics', icon: BarChart3, keywords: ['relatório', 'sla', 'desempenho'], category: 'Operações' },
      { id: 'labels', title: 'Etiquetas', path: '/labels', icon: Tag, keywords: ['qr', 'código', 'impressão'], category: 'Operações' },
      { id: 'scan', title: 'Scanner QR', path: '/scan', icon: QrCode, keywords: ['qr', 'escanear', 'ler'], category: 'Operações' },
      
      // Alertas
      { id: 'alerts', title: 'Lista de Alertas', path: '/alerts', icon: AlertCircle, keywords: ['alerta', 'aviso', 'notificação'], category: 'Alertas' },
      { id: 'alerts-dashboard', title: 'Dashboard de Alertas', path: '/alerts/dashboard', icon: BarChart3, keywords: ['análise', 'gráfico', 'métricas'], category: 'Alertas' },
      { id: 'alert-settings', title: 'Configurar Alertas', path: '/alerts/settings', icon: Settings, keywords: ['limiar', 'threshold', 'configuração'], category: 'Alertas' },
      
      // Sistema
      { id: 'system', title: 'Configurações do Sistema', path: '/system', icon: Settings, keywords: ['config', 'tema', 'branding'], category: 'Sistema' },
      { id: 'audit', title: 'Auditoria', path: '/audit', icon: FileText, keywords: ['log', 'histórico', 'registro'], category: 'Sistema' },
      { id: 'knowledge', title: 'Base de Conhecimento', path: '/knowledge', icon: FileText, keywords: ['documentação', 'ajuda', 'faq'], category: 'Sistema' },
      { id: 'notifications', title: 'Notificações', path: '/notifications', icon: Bell, keywords: ['email', 'whatsapp', 'alerta'], category: 'Sistema' },
      
      // Usuário
      { id: 'profile', title: 'Meu Perfil', path: '/profile', icon: Users, keywords: ['perfil', 'conta', 'usuário'], category: 'Usuário' },
      { id: 'my-connections', title: 'Minhas Conexões', path: '/my-connections', icon: Cable, keywords: ['histórico', 'escaneado'], category: 'Usuário' },
    ];

    // Admin only
    if (isAdmin) {
      items.push(
        { id: 'users', title: 'Gerenciar Usuários', path: '/users', icon: Users, keywords: ['usuário', 'permissão', 'função'], category: 'Administração' }
      );
    }

    return items;
  }, [isAdmin]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    searchItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [searchItems]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, funcionalidades..." />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente buscar por "racks", "conexões" ou "alertas"
              </p>
            </div>
          </CommandEmpty>
          
          {Object.entries(groupedItems).map(([category, items], index) => (
            <div key={category}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.keywords.join(' ')}`}
                    onSelect={() => handleSelect(item.path)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
        
        <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3 w-3" />
            <span>Use <kbd className="px-1 rounded bg-muted">↑↓</kbd> para navegar</span>
          </div>
          <div>
            <kbd className="px-1 rounded bg-muted">Enter</kbd> para selecionar
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
