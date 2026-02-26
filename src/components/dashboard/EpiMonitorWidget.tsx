import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardHat, AlertCircle, AlertTriangle, ChevronRight, CheckCircle2, Eye } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EpiImageDialog } from '@/components/alerts/EpiImageDialog';
import { DashboardStatsFilters, getBuildingRackIds, getBuildingEquipmentIds } from '@/hooks/useDashboardStats';

interface EpiMonitorWidgetProps {
  filters?: DashboardStatsFilters;
}

export function EpiMonitorWidget({ filters }: EpiMonitorWidgetProps) {
  const navigate = useNavigate();
  const { alerts } = useAlerts({ status: 'active', type: 'epi_alert' });
  const [filteredEntityIds, setFilteredEntityIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!filters?.buildingId) {
      setFilteredEntityIds(null);
      return;
    }
    const load = async () => {
      const rackIds = await getBuildingRackIds(filters.buildingId!);
      const equipmentIds = await getBuildingEquipmentIds(filters.buildingId!);
      setFilteredEntityIds(new Set([...rackIds, ...equipmentIds]));
    };
    load();
  }, [filters?.buildingId]);

  const epiAlerts = filteredEntityIds
    ? (alerts || []).filter(a => a.related_entity_id && filteredEntityIds.has(a.related_entity_id))
    : (alerts || []);
  const [selectedAlert, setSelectedAlert] = useState<typeof epiAlerts[number] | null>(null);

  const criticalCount = epiAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = epiAlerts.filter(a => a.severity === 'warning').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <HardHat className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-destructive';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  if (epiAlerts.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-base">
            <HardHat className="h-5 w-5" />
            Segurança do Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm">
              Nenhum alerta de EPI ativo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      criticalCount > 0 
        ? "border-amber-600/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" 
        : "border-amber-500/30 bg-amber-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-5 w-5 text-amber-500" />
            Segurança do Trabalho
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge 
                variant="destructive" 
                className="font-bold"
              >
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge 
                variant="outline" 
                className="border-amber-500 text-amber-600 dark:text-amber-400"
              >
                {warningCount} aviso{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {epiAlerts.slice(0, 3).map((alert) => {
          const imageUrl = (alert.metadata as any)?.image_url;
          
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border border-l-4 bg-background transition-all duration-300",
                getSeverityBorder(alert.severity)
              )}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Miniatura da imagem */}
                {imageUrl ? (
                  <div 
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlert(alert);
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Screenshot EPI"
                      className="w-14 h-10 object-cover rounded border shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  getSeverityIcon(alert.severity)
                )}
                
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at!), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                    {imageUrl && (
                      <button
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight 
                className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer hover:text-foreground" 
                onClick={() => navigate('/alerts?type=epi')}
              />
            </div>
          );
        })}

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => navigate('/alerts?type=epi')}
        >
          Ver Todos os Alertas EPI ({epiAlerts.length})
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
      
      {/* Dialog para visualizar imagem EPI */}
      <EpiImageDialog
        alert={selectedAlert ? {
          id: selectedAlert.id,
          title: selectedAlert.title,
          message: selectedAlert.message,
          severity: selectedAlert.severity,
          created_at: selectedAlert.created_at,
          metadata: selectedAlert.metadata as any,
        } : null}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      />
    </Card>
  );
}
