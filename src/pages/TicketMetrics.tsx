import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useTicketStats, formatResolutionTime } from '@/hooks/useTicketStats';
import { TicketStatsCards } from '@/components/tickets/TicketStatsCards';
import { TicketsByCategoryChart } from '@/components/tickets/TicketsByCategoryChart';
import { TicketsByTechnicianChart } from '@/components/tickets/TicketsByTechnicianChart';
import { TicketTrendChart } from '@/components/tickets/TicketTrendChart';
import { ResolutionByCategoryChart } from '@/components/tickets/ResolutionByCategoryChart';
import { SLAComplianceChart } from '@/components/tickets/SLAComplianceChart';
import { MonthlyTrendChart } from '@/components/tickets/MonthlyTrendChart';
import { UrgentTicketsList } from '@/components/tickets/UrgentTicketsList';
import { TicketsByPriorityChart } from '@/components/tickets/TicketsByPriorityChart';
import { SLATrendChart } from '@/components/tickets/SLATrendChart';
import { SLAByCategoryChart } from '@/components/tickets/SLAByCategoryChart';
import { SLAByTechnicianChart } from '@/components/tickets/SLAByTechnicianChart';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TicketMetrics = () => {
  const { data: stats, isLoading } = useTicketStats();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/tickets')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Métricas de Chamados
              </h1>
              <p className="text-muted-foreground">
                Análise detalhada de desempenho e SLA
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : stats ? (
            <>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">SLA Compliance</p>
                      <p className="text-3xl font-bold text-green-500">{stats.slaCompliance}%</p>
                    </div>
                    <CheckCircle2 className="h-10 w-10 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      <p className="text-3xl font-bold text-blue-500">
                        {formatResolutionTime(stats.avgResolutionTimeMinutes)}
                      </p>
                    </div>
                    <Clock className="h-10 w-10 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Urgentes</p>
                      <p className="text-3xl font-bold text-amber-500">{stats.urgentTickets.length}</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasados</p>
                      <p className="text-3xl font-bold text-red-500">{stats.overdueTickets}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* SLA Trend - Full Width */}
        <SLATrendChart />

        {/* SLA Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SLAByCategoryChart />
          <SLAByTechnicianChart />
        </div>

        {/* Charts Grid - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SLAComplianceChart />
          <ResolutionByCategoryChart />
        </div>

        {/* Monthly Trend - Full Width */}
        <MonthlyTrendChart />

        {/* Charts Grid - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TicketsByPriorityChart />
          <TicketsByCategoryChart />
        </div>

        {/* Technician Performance & Urgent List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TicketsByTechnicianChart />
          <UrgentTicketsList />
        </div>

        {/* 7-day Trend */}
        <TicketTrendChart />
      </div>
    </AppLayout>
  );
};

export default TicketMetrics;
