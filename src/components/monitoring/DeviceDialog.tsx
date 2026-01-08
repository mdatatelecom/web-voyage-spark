import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonitoredDevice, CreateDeviceInput } from '@/hooks/useMonitoredDevices';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
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

          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="server_address">Servidor da API (IP:Porta)</Label>
              <Input
                id="server_address"
                value={formData.server_address}
                onChange={(e) => handleChange('server_address', e.target.value)}
                placeholder="Ex: 86.48.3.172:3000"
              />
              <p className="text-xs text-muted-foreground">
                Endereço do servidor que hospeda a API de monitoramento
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitored_host">Host Monitorado (IP) *</Label>
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
            <Label htmlFor="api_token">Token de API *</Label>
            <Input
              id="api_token"
              type="password"
              value={formData.api_token}
              onChange={(e) => handleChange('api_token', e.target.value)}
              placeholder="Token para autenticação na API"
              required={!device}
            />
            <p className="text-xs text-muted-foreground">
              Token para autenticar na API (sem "Bearer")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionais sobre o dispositivo"
              rows={3}
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
