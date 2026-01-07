import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAlertStats } from '@/hooks/useAlertStats';
import { AlertTrendChart } from '@/components/alerts/AlertTrendChart';
import { AlertsByTypeChart } from '@/components/alerts/AlertsByTypeChart';
import { AlertsBySeverityChart } from '@/components/alerts/AlertsBySeverityChart';
import { AlertResolutionTimeChart } from '@/components/alerts/AlertResolutionTimeChart';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle, Activity, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AlertsDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAlertStats(30);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout>
        <div className="text-center py-8 text-muted-foreground">
          Erro ao carregar estatísticas
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/alerts')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard de Alertas</h1>
              <p className="text-muted-foreground">Análise dos últimos 30 dias</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">nos últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(0) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio Resolução</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">média de resolução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">{stats.resolved} resolvidos</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Alertas (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTrendChart data={stats.dailyTrend} />
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alertas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byType.length > 0 ? (
                <AlertsByTypeChart data={stats.byType} />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas por Severidade</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total > 0 ? (
                <AlertsBySeverityChart data={stats.bySeverity} />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resolution Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio de Resolução por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.resolutionTimeByType.length > 0 ? (
              <AlertResolutionTimeChart data={stats.resolutionTimeByType} />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Sem dados de resolução disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
