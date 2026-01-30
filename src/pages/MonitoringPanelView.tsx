import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  Maximize2,
  Activity
} from 'lucide-react';
import { useMonitoringPanels } from '@/hooks/useMonitoringPanels';

export default function MonitoringPanelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { panels, isLoading } = useMonitoringPanels();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const panel = panels.find(p => p.id === id);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  // Fullscreen view
  if (isFullscreen && panel) {
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
            <Button variant="default" size="sm" onClick={() => setIsFullscreen(false)}>
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-[calc(100vh-250px)] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!panel) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Painel não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O painel solicitado não existe ou foi removido
          </p>
          <Button onClick={() => navigate('/monitoring')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Monitoramento
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/monitoring')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{panel.name}</h1>
                {panel.description && (
                  <p className="text-sm text-muted-foreground">{panel.description}</p>
                )}
              </div>
              <Badge variant="outline" className="ml-2">
                {panel.panel_type}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleFullscreen}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Tela Cheia
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(panel.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="rounded-lg border overflow-hidden bg-muted/20" style={{ height: 'calc(100vh - 220px)' }}>
          <iframe
            key={refreshKey}
            src={panel.url}
            className="w-full h-full border-0"
            title={panel.name}
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </AppLayout>
  );
}
