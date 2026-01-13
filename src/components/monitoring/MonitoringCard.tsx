import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { MonitoredDevice } from '@/hooks/useMonitoredDevices';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { Server, Clock, RefreshCw, ExternalLink, PanelTop } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface MonitoringCardProps {
  device: MonitoredDevice;
}

export function MonitoringCard({ device }: MonitoringCardProps) {
  const navigate = useNavigate();
  const { data: status, isLoading, refetch, isFetching } = useDeviceStatus(device);

  const lastSeen = device.last_seen
    ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {device.hostname || device.device_id}
              </CardTitle>
            </div>
            <DeviceStatusBadge status={device.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {device.vendor && (
              <div>
                <span className="text-muted-foreground">Fabricante:</span>
                <p className="font-medium">{device.vendor}</p>
              </div>
            )}
            {device.model && (
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">{device.model}</p>
              </div>
            )}
            {device.ip_address && (
              <div>
                <span className="text-muted-foreground">IP:</span>
                <p className="font-medium font-mono">{device.ip_address}</p>
              </div>
            )}
            {device.customer_name && (
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{device.customer_name}</p>
              </div>
            )}
          </div>

          {device.uptime_raw && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Uptime: {device.uptime_raw}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Última coleta: {lastSeen}
            </div>
            <div className="flex gap-2">
              {device.external_panel_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(device.external_panel_url!, '_blank', 'noopener,noreferrer')}
                  title="Ver Painel"
                >
                  <PanelTop className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/monitoring/${device.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
            </div>
          </div>

          {!device.is_active && (
            <Badge variant="secondary" className="w-full justify-center">
              Monitoramento Desativado
            </Badge>
        )}
        </CardContent>
    </Card>
  );
}
