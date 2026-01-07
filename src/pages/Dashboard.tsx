import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Cable, Network, Server, LogOut, BarChart3, AlertCircle, Loader2, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RackOccupancyChart } from '@/components/dashboard/RackOccupancyChart';
import { EquipmentTypeChart } from '@/components/dashboard/EquipmentTypeChart';
import { ConnectionStatusChart } from '@/components/dashboard/ConnectionStatusChart';
import { PortUsageChart } from '@/components/dashboard/PortUsageChart';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SLAWidget } from '@/components/dashboard/SLAWidget';
import { usePortUsageStats } from '@/hooks/useDashboardStats';
import { useAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { TicketStatsCards } from '@/components/tickets/TicketStatsCards';
import { TicketsByCategoryChart } from '@/components/tickets/TicketsByCategoryChart';
import { TicketsByTechnicianChart } from '@/components/tickets/TicketsByTechnicianChart';
import { TicketTrendChart } from '@/components/tickets/TicketTrendChart';
import { CriticalAlertsWidget } from '@/components/dashboard/CriticalAlertsWidget';

export default function Dashboard() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    roles,
    isAdmin,
    isTechnician,
    isViewer,
    isNetworkViewer
  } = useUserRole();
  const navigate = useNavigate();
  const { branding, isLoading: brandingLoading } = useSystemSettings();

  // Redirect viewers to scanner page
  useEffect(() => {
    if (isViewer || isNetworkViewer) {
      navigate('/scan');
    }
  }, [isViewer, isNetworkViewer, navigate]);
  const { alerts: activeAlerts, activeCount } = useAlerts({ status: 'active' });
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const {
    data: stats
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [buildings, racks, equipment, connections] = await Promise.all([supabase.from('buildings').select('count', {
        count: 'exact',
        head: true
      }), supabase.from('racks').select('count', {
        count: 'exact',
        head: true
      }), supabase.from('equipment').select('count', {
        count: 'exact',
        head: true
      }), supabase.from('connections').select('count', {
        count: 'exact',
        head: true
      })]);
      return {
        buildings: buildings.count || 0,
        racks: racks.count || 0,
        equipment: equipment.count || 0,
        connections: connections.count || 0
      };
    }
  });

  const { data: portStats } = usePortUsageStats();
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandingLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.systemName} className="h-8 w-auto" />
            ) : (
              <>
                <Network className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{branding.systemName}</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {roles.join(', ') || 'Nenhuma função atribuída'}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Painel de Controle</h2>
          <p className="text-muted-foreground">
            Gerencie seus ativos de infraestrutura e conectividade de rede
          </p>
        </div>

        {roles.length === 0 && <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-500">
                Nenhuma Função Atribuída
              </CardTitle>
              <CardDescription>
                Entre em contato com um administrador para atribuir uma função antes de usar o sistema.
              </CardDescription>
            </CardHeader>
          </Card>}

        <div className="mb-8">
          <DashboardFilters />
        </div>

        {/* Critical Alerts Widget */}
        <div className="mb-8">
          <CriticalAlertsWidget />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/buildings')}>
            <CardHeader>
              <Building className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Localizações</CardTitle>
              <CardDescription>
                Gerencie prédios, andares e salas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Gerenciar Localizações
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Server className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Equipamentos</CardTitle>
              <CardDescription>
                Visualize e gerencie equipamentos de rede
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={!isAdmin && !isTechnician}
                onClick={() => navigate('/equipment')}
              >
                Gerenciar Equipamentos
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Cable className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Conexões</CardTitle>
              <CardDescription>
                Rastreie conexões de cabos e gere etiquetas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={!isAdmin && !isTechnician}
                onClick={() => navigate('/connections')}
              >
                Ver Conexões
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Prédios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.buildings || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Racks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.racks || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Equipamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.equipment || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conexões</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.connections || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Portas Disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {portStats?.available || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {portStats?.total || 0} totais
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <RackOccupancyChart />
          <EquipmentTypeChart />
          <ConnectionStatusChart />
          <PortUsageChart />
        </div>

        {/* Ticket Metrics Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Ticket className="h-6 w-6" />
                Chamados de Suporte
              </h3>
              <p className="text-muted-foreground">Métricas e desempenho do suporte técnico</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/tickets')}>
              Ver Todos
            </Button>
          </div>

          {/* SLA Widget */}
          <SLAWidget className="mb-6" />
          
          <TicketStatsCards />
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <TicketsByCategoryChart />
            <TicketsByTechnicianChart />
            <TicketTrendChart />
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <CardDescription>Acesse relatórios detalhados</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/rack-occupancy')}
            >
              Ver Relatório de Ocupação de Racks
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>;
}