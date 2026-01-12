import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGrafanaConfig } from '@/hooks/useGrafanaConfig';
import { ZabbixHostSelector } from './ZabbixHostSelector';
import { GrafanaConfigDialog } from './GrafanaConfigDialog';
import { Settings, AlertTriangle, Link, PanelTop, ExternalLink } from 'lucide-react';

interface MonitoredDevice {
  id: string;
  device_id: string;
  hostname?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  zabbix_host_id?: string | null;
  grafana_dashboard_uid?: string | null;
  external_panel_url?: string | null;
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
  external_panel_url?: string;
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
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    device_id: device?.device_id || '',
    hostname: device?.hostname || '',
    customer_name: device?.customer_name || '',
    notes: device?.notes || '',
    is_active: device?.is_active ?? true,
    zabbix_host_id: device?.zabbix_host_id || '',
    grafana_dashboard_uid: device?.grafana_dashboard_uid || '',
    external_panel_url: device?.external_panel_url || '',
  });

  const isGrafanaConfigured = !!grafanaConfig?.grafana_url && !!grafanaConfig?.datasource_uid;

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
        external_panel_url: device?.external_panel_url || '',
      });
      setActiveTab('general');
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {device ? 'Editar Dispositivo' : 'Adicionar Dispositivo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="integration" className="gap-2">
                  <Link className="h-4 w-4" />
                  Integração
                </TabsTrigger>
                <TabsTrigger value="panel" className="gap-2">
                  <PanelTop className="h-4 w-4" />
                  Painel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
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
                    placeholder="Notas adicionais"
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
              </TabsContent>

              <TabsContent value="integration" className="space-y-4 mt-4">
                {!grafanaLoading && !isGrafanaConfigured ? (
                  <Alert variant="destructive" className="py-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-sm">Configure a integração Grafana/Zabbix primeiro.</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setGrafanaDialogOpen(true)}>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grafana_dashboard_uid">Dashboard UID (opcional)</Label>
                      <Input
                        id="grafana_dashboard_uid"
                        value={formData.grafana_dashboard_uid}
                        onChange={(e) => handleChange('grafana_dashboard_uid', e.target.value)}
                        placeholder="Ex: abc123xyz"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="panel" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="external_panel_url">URL do Painel Externo</Label>
                  <Input
                    id="external_panel_url"
                    value={formData.external_panel_url}
                    onChange={(e) => handleChange('external_panel_url', e.target.value)}
                    placeholder="https://grafana.exemplo.com/d/abc123?kiosk"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL compartilhável do painel Grafana para exibir em popup.
                  </p>
                </div>
                {formData.external_panel_url && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-xs truncate">{formData.external_panel_url}</code>
                    <Button type="button" variant="ghost" size="sm" onClick={() => window.open(formData.external_panel_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading || (!isGrafanaConfigured && !device)}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <GrafanaConfigDialog open={grafanaDialogOpen} onOpenChange={setGrafanaDialogOpen} />
    </>
  );
}
