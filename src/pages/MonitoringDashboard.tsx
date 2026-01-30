import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Plus, 
  ExternalLink, 
  RefreshCw,
  Monitor,
  Maximize2,
  Settings
} from 'lucide-react';
import { useMonitoringPanels, MonitoringPanel } from '@/hooks/useMonitoringPanels';
import { useUserRole } from '@/hooks/useUserRole';

export default function MonitoringDashboard() {
  const navigate = useNavigate();
  const { panels, isLoading } = useMonitoringPanels();
  const { isAdmin } = useUserRole();
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const activePanels = panels.filter(p => p.is_active);

  // Fullscreen panel view
  if (isFullscreen) {
    const panel = panels.find(p => p.id === isFullscreen);
    if (!panel) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold">{panel.name}</span>
            <Badge variant="outline">{panel.panel_type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(panel.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
            <Button variant="default" size="sm" onClick={() => setIsFullscreen(null)}>
              Sair do Fullscreen
            </Button>
          </div>
        </div>
        <iframe
          key={refreshKey}
          src={panel.url}
          className="w-full h-[calc(100vh-73px)] border-0"
          title={panel.name}
          allow="fullscreen"
        />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Monitoramento</h1>
              <p className="text-muted-foreground">
                Visão geral dos painéis do Grafana, Zabbix e outros sistemas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Todos
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/monitoring/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            )}
          </div>
        </div>

        {/* Panels Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activePanels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum painel configurado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Configure painéis do Grafana ou Zabbix para visualizar aqui
              </p>
              {isAdmin && (
                <Button onClick={() => navigate('/monitoring/settings')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Painel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {activePanels.map((panel) => (
              <Card key={panel.id} className="overflow-hidden">
                <CardHeader className="py-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{panel.name}</CardTitle>
                        {panel.description && (
                          <CardDescription className="text-xs mt-0.5">
                            {panel.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {panel.panel_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/monitoring/panel/${panel.id}`)}
                        title="Abrir em página dedicada"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(panel.url, '_blank')}
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative bg-muted/20" style={{ height: '500px' }}>
                    <iframe
                      key={`${panel.id}-${refreshKey}`}
                      src={panel.url}
                      className="w-full h-full border-0"
                      title={panel.name}
                      allow="fullscreen"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
