import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { useScanAnalytics, AnalyticsPeriod } from '@/hooks/useScanAnalytics';
import { ScanAnalyticsFilters } from '@/components/analytics/ScanAnalyticsFilters';
import { ScanTimeSeriesChart } from '@/components/analytics/ScanTimeSeriesChart';
import { TopConnectionsChart } from '@/components/analytics/TopConnectionsChart';
import { HourDistributionChart } from '@/components/analytics/HourDistributionChart';
import { DayOfWeekChart } from '@/components/analytics/DayOfWeekChart';
import { DeviceMethodPieCharts } from '@/components/analytics/DeviceMethodPieCharts';
import { UserScansTable } from '@/components/analytics/UserScansTable';
import { BarChart3, TrendingUp, Clock, Users } from 'lucide-react';

export default function ScanAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const {
    summaryData,
    scansByDate,
    topConnections,
    scansByHour,
    scansByDayOfWeek,
    scansByUser,
    deviceMethodStats,
    isLoading,
  } = useScanAnalytics({ period });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Analytics de Scans
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada de uso do scanner QR Code
            </p>
          </div>
          <ScanAnalyticsFilters period={period} onPeriodChange={setPeriod} />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Carregando analytics...</p>
          </div>
        ) : (
          <>
            {/* Resumo Geral */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Total de Scans</div>
                    <div className="text-3xl font-bold mt-1">
                      {summaryData?.total || 0}
                    </div>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Hoje</div>
                    <div className="text-3xl font-bold mt-1">
                      {summaryData?.today || 0}
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Média por Dia</div>
                    <div className="text-3xl font-bold mt-1">
                      {summaryData?.average || 0}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </Card>
            </div>

            {/* Gráfico de Time Series */}
            <ScanTimeSeriesChart data={scansByDate} />

            {/* Top Conexões */}
            <TopConnectionsChart data={topConnections} />

            {/* Distribuições Temporais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HourDistributionChart data={scansByHour} />
              <DayOfWeekChart data={scansByDayOfWeek} />
            </div>

            {/* Dispositivos e Métodos */}
            <DeviceMethodPieCharts data={deviceMethodStats} />

            {/* Usuários */}
            <UserScansTable data={scansByUser} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
