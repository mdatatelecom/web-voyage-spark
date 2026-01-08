import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonitoredDevice, CreateDeviceInput } from '@/hooks/useMonitoredDevices';
import { useHostDiscovery, DiscoveredHost } from '@/hooks/useHostDiscovery';
import { Loader2, Search, Server, CheckCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: MonitoredDevice | null;
  onSave: (data: CreateDeviceInput | Partial<MonitoredDevice>) => void;
  isLoading: boolean;
}

export function DeviceDialog({ open, onOpenChange, device, onSave, isLoading }: DeviceDialogProps) {
  const [formData, setFormData] = useState({
    device_id: device?.device_id || '',
    hostname: device?.hostname || '',
    protocol: device?.protocol || 'http',
    server_address: device?.server_address || '86.48.3.172:3000',
    monitored_host: device?.monitored_host || '',
    api_token: device?.api_token || '',
    customer_name: device?.customer_name || '',
    notes: device?.notes || '',
    is_active: device?.is_active ?? true,
  });

  const [serverStatus, setServerStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showHostList, setShowHostList] = useState(false);
  
  const { isDiscovering, isTesting, discoveredHosts, testServerConnection, discoverHosts, clearHosts } = useHostDiscovery();

  // Reset form when device changes
  useEffect(() => {
    if (open) {
      setFormData({
        device_id: device?.device_id || '',
        hostname: device?.hostname || '',
        protocol: device?.protocol || 'http',
        server_address: device?.server_address || '86.48.3.172:3000',
        monitored_host: device?.monitored_host || '',
        api_token: device?.api_token || '',
        customer_name: device?.customer_name || '',
        notes: device?.notes || '',
        is_active: device?.is_active ?? true,
      });
      setServerStatus('idle');
      setShowHostList(false);
      clearHosts();
    }
  }, [device, open, clearHosts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (device) {
      onSave({ id: device.id, ...formData });
    } else {
      onSave(formData);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestServer = async () => {
    const result = await testServerConnection(formData.server_address, formData.api_token);
    setServerStatus(result.success ? 'success' : 'error');
  };

  const handleDiscoverHosts = async () => {
    setShowHostList(true);
    await discoverHosts(formData.server_address, formData.api_token);
  };

  const handleSelectHost = (host: string) => {
    setFormData(prev => ({ ...prev, monitored_host: host }));
    setShowHostList(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          {/* Server Configuration */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <h4 className="font-medium text-sm">Configuração do Servidor SNMP</h4>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocolo</Label>
                <Select 
                  value={formData.protocol} 
                  onValueChange={(value) => handleChange('protocol', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Protocolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="server_address">Servidor (IP:Porta)</Label>
                <Input
                  id="server_address"
                  value={formData.server_address}
                  onChange={(e) => handleChange('server_address', e.target.value)}
                  placeholder="86.48.3.172:3000"
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestServer}
                  disabled={isTesting || !formData.server_address}
                  className="w-full"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_token">Token de API *</Label>
              <Input
                id="api_token"
                type="password"
                value={formData.api_token}
                onChange={(e) => handleChange('api_token', e.target.value)}
                placeholder="Token para autenticação na API"
                required={!device}
              />
            </div>

            {serverStatus !== 'idle' && (
              <div className={`flex items-center gap-2 text-sm ${serverStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {serverStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Servidor conectado
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Falha na conexão
                  </>
                )}
              </div>
            )}
          </div>

          {/* Host Monitorado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="monitored_host">Host Monitorado (IP) *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscoverHosts}
                disabled={isDiscovering || !formData.server_address}
              >
                {isDiscovering ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Descobrir
              </Button>
            </div>
            <Input
              id="monitored_host"
              value={formData.monitored_host}
              onChange={(e) => handleChange('monitored_host', e.target.value)}
              placeholder="Ex: 179.124.212.112"
              required={!device}
            />
            <p className="text-xs text-muted-foreground">
              IP do dispositivo que será monitorado via SNMP
            </p>
          </div>

          {/* Lista de hosts descobertos */}
          {showHostList && (
            <div className="space-y-2">
              <Label>Hosts Descobertos ({discoveredHosts.length})</Label>
              {discoveredHosts.length > 0 ? (
                <ScrollArea className="h-32 rounded-md border">
                  <div className="p-2 space-y-1">
                    {discoveredHosts.map((host, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start font-mono text-sm"
                        onClick={() => handleSelectHost(host.host)}
                      >
                        <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                        {host.host}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : isDiscovering ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando hosts...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum host encontrado. Verifique o endpoint /hosts do servidor.
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
