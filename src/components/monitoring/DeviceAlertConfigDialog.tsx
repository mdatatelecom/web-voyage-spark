import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDeviceAlertConfig } from '@/hooks/useDeviceAlertConfig';
import { Bell, MessageCircle, Mail, Loader2 } from 'lucide-react';

interface DeviceAlertConfigDialogProps {
  deviceUuid: string;
  deviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceAlertConfigDialog({
  deviceUuid,
  deviceName,
  open,
  onOpenChange,
}: DeviceAlertConfigDialogProps) {
  const { config, isLoading, saveConfig, isSaving } = useDeviceAlertConfig(deviceUuid);

  const [thresholdMinutes, setThresholdMinutes] = useState(5);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (config) {
      setThresholdMinutes(config.offline_threshold_minutes);
      setWhatsappEnabled(config.whatsapp_enabled);
      setEmailEnabled(config.email_enabled);
      setIsActive(config.is_active);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig({
      device_uuid: deviceUuid,
      offline_threshold_minutes: thresholdMinutes,
      whatsapp_enabled: whatsappEnabled,
      email_enabled: emailEnabled,
      is_active: isActive,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Alerta
          </DialogTitle>
          <DialogDescription>
            Configure quando e como receber alertas para {deviceName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertas Ativos</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar/desativar alertas para este dispositivo
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Tempo Offline para Alertar (minutos)</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={60}
                value={thresholdMinutes}
                onChange={(e) => setThresholdMinutes(parseInt(e.target.value) || 5)}
                disabled={!isActive}
              />
              <p className="text-sm text-muted-foreground">
                Alerta será enviado após {thresholdMinutes} minuto(s) offline
              </p>
            </div>

            <div className="space-y-4">
              <Label>Canais de Notificação</Label>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar para grupos configurados
                    </p>
                  </div>
                </div>
                <Switch
                  checked={whatsappEnabled}
                  onCheckedChange={setWhatsappEnabled}
                  disabled={!isActive}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar para admins
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                  disabled={!isActive}
                />
              </div>
            </div>

            {config?.last_alert_sent_at && (
              <p className="text-sm text-muted-foreground">
                Último alerta: {new Date(config.last_alert_sent_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
