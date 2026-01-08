import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MonitoredDevice } from '@/hooks/useMonitoredDevices';
import { MonitoredInterface } from '@/hooks/useMonitoredInterfaces';
import { MonitoredVlan } from '@/hooks/useMonitoredVlans';
import { FileText, Server, Network, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeviceDocumentationProps {
  device: MonitoredDevice;
  interfaces: MonitoredInterface[];
  vlans: MonitoredVlan[];
}

export function DeviceDocumentation({ device, interfaces, vlans }: DeviceDocumentationProps) {
  const monitoredInterfaces = interfaces.filter((i) => i.is_monitored);
  const monitoredVlans = vlans.filter((v) => v.is_monitored);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentação Técnica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações do Dispositivo */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Server className="h-4 w-4" />
            Informações do Equipamento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Hostname:</span>
              <p className="font-medium">{device.hostname || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Device ID:</span>
              <p className="font-mono">{device.device_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fabricante:</span>
              <p className="font-medium">{device.vendor || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Modelo:</span>
              <p className="font-medium">{device.model || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">IP:</span>
              <p className="font-mono">{device.ip_address || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente:</span>
              <p className="font-medium">{device.customer_name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Uptime:</span>
              <p className="font-medium">{device.uptime_raw || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Última Coleta:</span>
              <p className="font-medium">
                {device.last_seen
                  ? format(new Date(device.last_seen), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '-'}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Interfaces Monitoradas */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Network className="h-4 w-4" />
            Interfaces Monitoradas ({monitoredInterfaces.length})
          </h3>
          {monitoredInterfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma interface selecionada para monitoramento.
            </p>
          ) : (
            <div className="space-y-2">
              {monitoredInterfaces.map((iface) => (
                <div
                  key={iface.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{iface.interface_name}</span>
                    <Badge variant="outline">{iface.interface_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={iface.status === 'up' ? 'default' : 'secondary'}
                      className={iface.status === 'up' ? 'bg-green-500' : ''}
                    >
                      {iface.status}
                    </Badge>
                    {iface.speed && (
                      <span className="text-xs text-muted-foreground">{iface.speed}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* VLANs Monitoradas */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4" />
            VLANs Monitoradas ({monitoredVlans.length})
          </h3>
          {monitoredVlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma VLAN selecionada para monitoramento.
            </p>
          ) : (
            <div className="space-y-2">
              {monitoredVlans.map((vlan) => (
                <div
                  key={vlan.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">VLAN {vlan.vlan_id}</span>
                    {vlan.vlan_name && (
                      <span className="text-sm text-muted-foreground">({vlan.vlan_name})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.isArray(vlan.interfaces) &&
                      vlan.interfaces.slice(0, 3).map((iface, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {iface}
                        </Badge>
                      ))}
                    {Array.isArray(vlan.interfaces) && vlan.interfaces.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{vlan.interfaces.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {device.notes && (
          <>
            <Separator />
            <section>
              <h3 className="font-semibold mb-2">Observações</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {device.notes}
              </p>
            </section>
          </>
        )}

        <Separator />

        <footer className="text-xs text-muted-foreground text-center">
          Documentação gerada automaticamente em{' '}
          {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </footer>
      </CardContent>
    </Card>
  );
}
