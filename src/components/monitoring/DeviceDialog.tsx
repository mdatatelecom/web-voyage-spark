import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGrafanaConfig } from '@/hooks/useGrafanaConfig';
import { ZabbixHostSelector } from './ZabbixHostSelector';
import { GrafanaConfigDialog } from './GrafanaConfigDialog';
import { Settings, AlertTriangle } from 'lucide-react';

interface MonitoredDevice {
  id: string;
  device_id: string;
  hostname?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  zabbix_host_id?: string | null;
  grafana_dashboard_uid?: string | null;
}

interface CreateDeviceInput {
  device_id: string;
  hostname?: string;
  customer_name?: string;
  notes?: string;
  is_active?: boolean;
  data_source_type?: string;
  zabbix_host_id?: string;
  grafana_dashboard_uid?: string;
}

interface DeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: MonitoredDevice | null;
  onSave: (data: CreateDeviceInput | Partial<MonitoredDevice>) => void;
  isLoading: boolean;
}

export function DeviceDialog({ open, onOpenChange, device, onSave, isLoading }: DeviceDialogProps) {
  const { config: grafanaConfig, isLoading: grafanaLoading } = useGrafanaConfig();
  const [grafanaDialogOpen, setGrafanaDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    device_id: device?.device_id || '',
    hostname: device?.hostname || '',
    customer_name: device?.customer_name || '',
    notes: device?.notes || '',
    is_active: device?.is_active ?? true,
    zabbix_host_id: device?.zabbix_host_id || '',
    grafana_dashboard_uid: device?.grafana_dashboard_uid || '',
  });

  const isGrafanaConfigured = !!grafanaConfig?.grafana_url && !!grafanaConfig?.datasource_uid;

  // Reset form when device changes
  useEffect(() => {
    if (open) {
      setFormData({
        device_id: device?.device_id || '',
        hostname: device?.hostname || '',
        customer_name: device?.customer_name || '',
        notes: device?.notes || '',
        is_active: device?.is_active ?? true,
        zabbix_host_id: device?.zabbix_host_id || '',
        grafana_dashboard_uid: device?.grafana_dashboard_uid || '',
      });
    }
  }, [device, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (device) {
      onSave({ 
        id: device.id, 
        ...formData,
        data_source_type: 'grafana'
      });
    } else {
      onSave({
        ...formData,
        data_source_type: 'grafana'
      });
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {device ? 'Editar Dispositivo' : 'Adicionar Dispositivo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device_id">Device ID *</Label>
                <Input
                  id="device_id"
                  value={formData.device_id}
                  onChange={(e) => handleChange('device_id', e.target.value)}
                  placeholder="Ex: iw-01"
                  required
                  disabled={!!device}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  value={formData.hostname}
                  onChange={(e) => handleChange('hostname', e.target.value)}
                  placeholder="Ex: MikroTik-Core"
                />
              </div>
            </div>

            {/* Grafana/Zabbix Configuration */}
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Configuração Grafana/Zabbix</h4>
              </div>

              {!grafanaLoading && !isGrafanaConfigured ? (
                <Alert variant="destructive" className="py-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">Configure a integração Grafana/Zabbix primeiro.</span>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setGrafanaDialogOpen(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Host do Zabbix *</Label>
                    <ZabbixHostSelector
                      value={formData.zabbix_host_id}
                      onChange={(value) => handleChange('zabbix_host_id', value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Selecione o host no Zabbix para coletar métricas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grafana_dashboard_uid">Dashboard UID (opcional)</Label>
                    <Input
                      id="grafana_dashboard_uid"
                      value={formData.grafana_dashboard_uid}
                      onChange={(e) => handleChange('grafana_dashboard_uid', e.target.value)}
                      placeholder="Ex: abc123xyz"
                    />
                    <p className="text-xs text-muted-foreground">
                      UID do dashboard Grafana para exibição de métricas detalhadas
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Cliente</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Notas adicionais sobre o dispositivo"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Monitoramento Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || (!isGrafanaConfigured && !device)}
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grafana Config Dialog */}
      <GrafanaConfigDialog
        open={grafanaDialogOpen}
        onOpenChange={setGrafanaDialogOpen}
      />
    </>
  );
}
