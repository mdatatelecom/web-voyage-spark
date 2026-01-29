import { useState } from 'react';
import { useAlerts, AlertType } from '@/hooks/useAlerts';
import { AlertCircle, CheckCircle, Info, Video, Camera, Cable, Clock, Network, Radar, HardHat, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EpiImageDialog } from '@/components/alerts/EpiImageDialog';

interface AlertListProps {
  compact?: boolean;
  status?: 'active' | 'acknowledged' | 'resolved';
  type?: AlertType;
}

const getSeverityIcon = (severity: string, type: string) => {
  // Type-specific icons
  switch (type) {
    case 'nvr_full':
      return <Video className={cn("h-4 w-4", severity === 'critical' ? 'text-destructive' : 'text-yellow-500')} />;
    case 'camera_unassigned':
      return <Camera className="h-4 w-4 text-yellow-500" />;
    case 'connection_faulty':
      return <Cable className="h-4 w-4 text-destructive" />;
    case 'connection_stale_testing':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'equipment_no_ip':
      return <Network className="h-4 w-4 text-blue-500" />;
    case 'zabbix_alert':
      return <Radar className={cn("h-4 w-4", 
        severity === 'critical' ? 'text-destructive' : 
        severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
      )} />;
    case 'epi_alert':
      return <HardHat className={cn("h-4 w-4", 
        severity === 'critical' ? 'text-destructive' : 
        severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
      )} />;
  }

  // Default severity-based icons
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-l-destructive';
    case 'warning':
      return 'border-l-yellow-500';
    default:
      return 'border-l-blue-500';
  }
};

const getAlertTypeLabel = (type: string) => {
  switch (type) {
    case 'rack_capacity':
      return 'Capacidade Rack';
    case 'port_capacity':
      return 'Capacidade Portas';
    case 'poe_capacity':
      return 'PoE Budget';
    case 'equipment_failure':
      return 'Falha Equipamento';
    case 'nvr_full':
      return 'NVR/DVR Cheio';
    case 'camera_unassigned':
      return 'Câmera sem NVR';
    case 'connection_faulty':
      return 'Conexão Defeituosa';
    case 'connection_stale_testing':
      return 'Testing Prolongado';
    case 'equipment_no_ip':
      return 'Sem IP';
    case 'zabbix_alert':
      return 'Zabbix';
    case 'epi_alert':
      return 'EPI Monitor';
    default:
      return type;
  }
};

export const AlertList = ({ compact = false, status = 'active', type }: AlertListProps) => {
  const { alerts, isLoading, acknowledgeAlert, resolveAlert } = useAlerts({
    status: status,
    type: type,
  });
  const navigate = useNavigate();
  const [selectedEpiAlert, setSelectedEpiAlert] = useState<typeof alerts[number] | null>(null);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!alerts || alerts.length === 0) {
    const emptyMessages = {
      active: 'Nenhum alerta ativo',
      acknowledged: 'Nenhum alerta marcado como lido',
      resolved: 'Nenhum alerta resolvido'
    };
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessages[status]}</p>
      </div>
    );
  }

  const displayAlerts = compact ? alerts.slice(0, 5) : alerts;

  const handleNavigateToEntity = (alert: any) => {
    if (alert.related_entity_type === 'rack') {
      navigate(`/racks/${alert.related_entity_id}`);
    } else if (alert.related_entity_type === 'equipment') {
      navigate(`/equipment/${alert.related_entity_id}`);
    } else if (alert.related_entity_type === 'connection') {
      navigate(`/connections/${alert.related_entity_id}`);
    } else if (alert.related_entity_type === 'zabbix_host' && alert.metadata?.ip) {
      // Navegar para equipamentos filtrando por IP do Zabbix
      navigate(`/equipment?ip=${encodeURIComponent(alert.metadata.ip)}`);
    }
  };

  // Verificar se alerta EPI tem imagem
  const hasEpiImage = (alert: typeof alerts[number]) => {
    return alert.type === 'epi_alert' && (alert.metadata as any)?.image_url;
  };

  return (
    <>
      <div className="divide-y">
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'p-4 border-l-4 hover:bg-muted/50 transition-colors',
              getSeverityColor(alert.severity)
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getSeverityIcon(alert.severity, alert.type)}</div>
              
              {/* Miniatura da imagem EPI */}
              {hasEpiImage(alert) && (
                <div 
                  className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedEpiAlert(alert)}
                >
                  <img
                    src={(alert.metadata as any).image_url}
                    alt="Screenshot EPI"
                    className="w-20 h-14 object-cover rounded border shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                    {getAlertTypeLabel(alert.type)}
                  </span>
                </div>
                <h4 className="font-medium text-sm">{alert.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                {alert.current_value !== null && alert.threshold_value !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Atual: {Math.round(alert.current_value)}{alert.type === 'connection_stale_testing' ? ' dias' : '%'} | Limite: {alert.threshold_value}{alert.type === 'connection_stale_testing' ? ' dias' : '%'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Botão Ver Imagem para alertas EPI com imagem */}
                  {hasEpiImage(alert) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => setSelectedEpiAlert(alert)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  )}
                  {alert.related_entity_id && alert.related_entity_type && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleNavigateToEntity(alert)}
                    >
                      Ver Detalhes
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Marcar como Lido
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-600 hover:text-green-700"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dialog para visualizar imagem EPI */}
      <EpiImageDialog
        alert={selectedEpiAlert ? {
          id: selectedEpiAlert.id,
          title: selectedEpiAlert.title,
          message: selectedEpiAlert.message,
          severity: selectedEpiAlert.severity,
          created_at: selectedEpiAlert.created_at,
          metadata: selectedEpiAlert.metadata as any,
        } : null}
        open={!!selectedEpiAlert}
        onOpenChange={(open) => !open && setSelectedEpiAlert(null)}
      />
    </>
  );
};
