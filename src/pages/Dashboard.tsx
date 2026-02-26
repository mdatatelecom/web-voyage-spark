import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building, Cable, Network, Server, LogOut, BarChart3, 
  Loader2, Ticket, RefreshCw, Zap, PieChart, ExternalLink,
  Activity, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { RackOccupancyChart } from '@/components/dashboard/RackOccupancyChart';
import { EquipmentTypeChart } from '@/components/dashboard/EquipmentTypeChart';
import { ConnectionStatusChart } from '@/components/dashboard/ConnectionStatusChart';
import { PortUsageChart } from '@/components/dashboard/PortUsageChart';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SLAWidget } from '@/components/dashboard/SLAWidget';
import { usePortUsageStats, useDashboardCounts } from '@/hooks/useDashboardStats';
import { DashboardFilters as DashboardFiltersType } from '@/hooks/useDashboardFilters';
import { useEffect, useMemo, useState } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { TicketStatsCards } from '@/components/tickets/TicketStatsCards';
import { TicketsByCategoryChart } from '@/components/tickets/TicketsByCategoryChart';
import { TicketsByTechnicianChart } from '@/components/tickets/TicketsByTechnicianChart';
import { TicketTrendChart } from '@/components/tickets/TicketTrendChart';
import { TicketsByEpiChart } from '@/components/tickets/TicketsByEpiChart';
import { CriticalAlertsWidget } from '@/components/dashboard/CriticalAlertsWidget';
import { MetricsWidget } from '@/components/dashboard/MetricsWidget';
import { QuickAccessWidget } from '@/components/dashboard/QuickAccessWidget';
import { ZabbixMonitoringWidget } from '@/components/dashboard/ZabbixMonitoringWidget';
import { EpiMonitorWidget } from '@/components/dashboard/EpiMonitorWidget';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isTechnician, isViewer, isNetworkViewer } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branding, isLoading: brandingLoading } = useSystemSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilters, setActiveFilters] = useState<DashboardFiltersType | null>(null);

  const statsFilters = useMemo(() => {
    if (!activeFilters) return undefined;
    return {
      buildingId: activeFilters.location.buildingId,
      connectionStatus: activeFilters.connectionStatus,
      equipmentType: activeFilters.equipmentType,
    };
  }, [activeFilters]);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Redirect viewers to scanner page
  useEffect(() => {
    if (isViewer || isNetworkViewer) {
      navigate('/scan');
    }
  }, [isViewer, isNetworkViewer, navigate]);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const { data: stats, isLoading: isLoadingStats } = useDashboardCounts(statsFilters);

  const { data: portStats } = usePortUsageStats(statsFilters);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header Profissional */}
      <header className="border-b border-border/50 bg-gradient-to-r from-card via-card to-primary/5 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo e título */}
            <div className="flex items-center gap-4">
              {brandingLoading ? (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              ) : branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.systemName} className="h-10 w-auto" />
              ) : (
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Network className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight">{branding.systemName}</h1>
                <p className="text-xs text-muted-foreground">Gestão de Infraestrutura</p>
              </div>
            </div>
            
            {/* Ações do header */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block mr-2">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {roles.join(', ') || 'Sem função'}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                className="hover:bg-primary/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleSignOut}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Hero Section com Data/Hora */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Painel de Controle</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Visão geral da infraestrutura e conectividade de rede
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>{format(currentTime, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        {/* SEÇÃO: Acesso Rápido (movido para cima) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Acesso Rápido
            </h3>
          </div>
          <Card className="p-3 bg-card/50 border-border/50">
            <QuickAccessWidget />
          </Card>
        </section>

        {/* Alerta de usuário sem função */}
        {roles.length === 0 && (
          <Card className="border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-500">
                Nenhuma Função Atribuída
              </CardTitle>
              <CardDescription>
                Entre em contato com um administrador para atribuir uma função antes de usar o sistema.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Filtros Colapsíveis */}
        <DashboardFilters onFiltersChange={setActiveFilters} />

        {/* SEÇÃO 1: Métricas Rápidas (5 colunas) */}
        <section>
          <MetricsWidget
            buildings={stats?.buildings || 0}
            racks={stats?.racks || 0}
            equipment={stats?.equipment || 0}
            connections={stats?.connections || 0}
            ports={portStats?.available}
            isLoading={isLoadingStats}
          />
        </section>

        {/* SEÇÃO 2: Monitoramento e Alertas (3 colunas) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monitoramento e Alertas
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CriticalAlertsWidget filters={statsFilters} />
            <ZabbixMonitoringWidget filters={statsFilters} />
            <EpiMonitorWidget filters={statsFilters} />
          </div>
        </section>


        {/* SEÇÃO 4: Análise de Infraestrutura (grid 2x2) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Análise de Infraestrutura
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RackOccupancyChart filters={statsFilters} />
            <EquipmentTypeChart filters={statsFilters} />
            <ConnectionStatusChart filters={statsFilters} />
            <PortUsageChart filters={statsFilters} />
          </div>
        </section>

        {/* SEÇÃO 5: Centro de Suporte */}
        <section className="pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Centro de Suporte</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Métricas e desempenho do suporte técnico
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/tickets')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Gerenciar Chamados
            </Button>
          </div>

          <div className="space-y-4 mb-4">
            <TicketStatsCards />
            <SLAWidget />
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <TicketsByCategoryChart />
            <TicketsByTechnicianChart />
            <TicketsByEpiChart />
          </div>
          <div className="mt-4">
            <TicketTrendChart />
          </div>
        </section>

        {/* Card de Relatórios */}
        <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-card to-primary/5 py-3 border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Relatórios
            </CardTitle>
            <CardDescription className="text-xs">Acesse relatórios detalhados de ocupação</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => navigate('/rack-occupancy')}
            >
              <ExternalLink className="h-4 w-4" />
              Ver Relatório de Ocupação de Racks
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
