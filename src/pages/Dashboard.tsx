import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building, Cable, Network, Server, LogOut, BarChart3, 
  Loader2, Ticket, RefreshCw, Zap, PieChart, ExternalLink,
  TrendingUp, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RackOccupancyChart } from '@/components/dashboard/RackOccupancyChart';
import { EquipmentTypeChart } from '@/components/dashboard/EquipmentTypeChart';
import { ConnectionStatusChart } from '@/components/dashboard/ConnectionStatusChart';
import { PortUsageChart } from '@/components/dashboard/PortUsageChart';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SLAWidget } from '@/components/dashboard/SLAWidget';
import { usePortUsageStats } from '@/hooks/useDashboardStats';
import { useEffect } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { TicketStatsCards } from '@/components/tickets/TicketStatsCards';
import { TicketsByCategoryChart } from '@/components/tickets/TicketsByCategoryChart';
import { TicketsByTechnicianChart } from '@/components/tickets/TicketsByTechnicianChart';
import { TicketTrendChart } from '@/components/tickets/TicketTrendChart';
import { CriticalAlertsWidget } from '@/components/dashboard/CriticalAlertsWidget';
import { MetricsWidget } from '@/components/dashboard/MetricsWidget';
import { QuickAccessWidget } from '@/components/dashboard/QuickAccessWidget';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isTechnician, isViewer, isNetworkViewer } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branding, isLoading: brandingLoading } = useSystemSettings();

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

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [buildings, racks, equipment, connections] = await Promise.all([
        supabase.from('buildings').select('count', { count: 'exact', head: true }),
        supabase.from('racks').select('count', { count: 'exact', head: true }),
        supabase.from('equipment').select('count', { count: 'exact', head: true }),
        supabase.from('connections').select('count', { count: 'exact', head: true })
      ]);
      return {
        buildings: buildings.count || 0,
        racks: racks.count || 0,
        equipment: equipment.count || 0,
        connections: connections.count || 0
      };
    }
  });

  const { data: portStats } = usePortUsageStats();
  const availablePercent = portStats?.total ? Math.round((portStats.available / portStats.total) * 100) : 0;

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

      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Painel de Controle</h2>
          </div>
          <p className="text-muted-foreground">
            Visão geral da infraestrutura e conectividade de rede
          </p>
        </div>

        {/* Alerta de usuário sem função */}
        {roles.length === 0 && (
          <Card className="mb-8 border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
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

        {/* Filtros */}
        <div className="mb-8">
          <DashboardFilters />
        </div>

        {/* Seção Principal: Métricas + Alertas */}
        <section className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Métricas de Infraestrutura */}
          <div className="lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Infraestrutura
              </h3>
            </div>
            <MetricsWidget
              buildings={stats?.buildings || 0}
              racks={stats?.racks || 0}
              equipment={stats?.equipment || 0}
              connections={stats?.connections || 0}
              isLoading={isLoadingStats}
            />
            
            {/* Card de Portas */}
            <Card className="mt-4 relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-green-500/5 isolate">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 z-0" />
              <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium uppercase tracking-wider">
                    Disponibilidade de Portas
                  </CardDescription>
                  <Cable className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {portStats?.available || 0}
                </div>
                <Progress 
                  value={availablePercent} 
                  className="mt-3 h-2 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  {availablePercent}% disponíveis ({portStats?.available || 0} de {portStats?.total || 0})
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Widget de Alertas Críticos */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Alertas do Sistema
              </h3>
            </div>
            <CriticalAlertsWidget />
          </div>
        </section>

        {/* Seção de Acesso Rápido */}
        <section className="mb-8 relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Acesso Rápido
            </h3>
          </div>
          <Card className="p-5 bg-card backdrop-blur-sm border-border/50 shadow-sm">
            <QuickAccessWidget />
          </Card>
        </section>

        {/* Seção de Gráficos de Infraestrutura */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Análise de Infraestrutura
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Ocupação de Racks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RackOccupancyChart />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Tipos de Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <EquipmentTypeChart />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cable className="h-4 w-4 text-primary" />
                  Status de Conexões
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ConnectionStatusChart />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  Uso de Portas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <PortUsageChart />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Seção de Chamados de Suporte */}
        <section className="pt-8 border-t border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Centro de Suporte</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Métricas e desempenho do suporte técnico
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/tickets')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Gerenciar Chamados
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-4 mb-6">
            <div className="lg:col-span-1">
              <SLAWidget />
            </div>
            <div className="lg:col-span-3">
              <TicketStatsCards />
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden border-border/50">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium">Por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TicketsByCategoryChart />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-border/50">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium">Por Técnico</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TicketsByTechnicianChart />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-border/50">
              <CardHeader className="bg-gradient-to-r from-card to-primary/5 pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-medium">Tendência</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TicketTrendChart />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Card de Relatórios */}
        <Card className="mt-8 overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-card to-primary/5 border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Relatórios
            </CardTitle>
            <CardDescription>Acesse relatórios detalhados de ocupação</CardDescription>
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
