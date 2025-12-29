import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, RotateCcw, Save, Video, Camera, Cable, Network, MessageSquare, CheckCircle } from 'lucide-react';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AlertSettings() {
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings, isLoading, getSetting, updateSetting, isUpdating, resetToDefaults, isResetting } = useAlertSettings();
  
  const [rackWarning, setRackWarning] = useState(80);
  const [rackCritical, setRackCritical] = useState(95);
  const [portWarning, setPortWarning] = useState(80);
  const [portCritical, setPortCritical] = useState(95);
  const [poeWarning, setPoeWarning] = useState(80);
  const [poeCritical, setPoeCritical] = useState(90);
  
  const [nvrWarning, setNvrWarning] = useState(80);
  const [nvrCritical, setNvrCritical] = useState(100);
  const [cameraOrphanEnabled, setCameraOrphanEnabled] = useState(true);
  const [connectionFaultyEnabled, setConnectionFaultyEnabled] = useState(true);
  const [testingMaxDays, setTestingMaxDays] = useState(7);
  const [equipmentNoIpEnabled, setEquipmentNoIpEnabled] = useState(true);
  
  const [whatsappResolvedEnabled, setWhatsappResolvedEnabled] = useState(false);
  const [loadingNotifSettings, setLoadingNotifSettings] = useState(true);

  useEffect(() => {
    if (settings) {
      setRackWarning(getSetting('rack_warning_threshold')?.setting_value || 80);
      setRackCritical(getSetting('rack_critical_threshold')?.setting_value || 95);
      setPortWarning(getSetting('port_warning_threshold')?.setting_value || 80);
      setPortCritical(getSetting('port_critical_threshold')?.setting_value || 95);
      setPoeWarning(getSetting('poe_warning_threshold')?.setting_value || 80);
      setPoeCritical(getSetting('poe_critical_threshold')?.setting_value || 90);
      
      setNvrWarning(getSetting('nvr_warning_threshold')?.setting_value || 80);
      setNvrCritical(getSetting('nvr_critical_threshold')?.setting_value || 100);
      setCameraOrphanEnabled((getSetting('camera_orphan_alert_enabled')?.setting_value || 1) === 1);
      setConnectionFaultyEnabled((getSetting('connection_faulty_alert_enabled')?.setting_value || 1) === 1);
      setTestingMaxDays(getSetting('testing_max_days')?.setting_value || 7);
      setEquipmentNoIpEnabled((getSetting('equipment_no_ip_alert_enabled')?.setting_value || 1) === 1);
    }
  }, [settings, getSetting]);

  // Load notification settings for resolved alerts toggle
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('notification_settings')
        .select('whatsapp_alert_resolved')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setWhatsappResolvedEnabled(data.whatsapp_alert_resolved ?? false);
      }
      setLoadingNotifSettings(false);
    };

    loadNotificationSettings();
  }, [user]);

  const handleWhatsappResolvedChange = async (checked: boolean) => {
    if (!user) return;
    
    setWhatsappResolvedEnabled(checked);
    
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        whatsapp_alert_resolved: checked,
      }, { onConflict: 'user_id' });

    if (error) {
      toast.error('Erro ao salvar preferência de notificação');
      setWhatsappResolvedEnabled(!checked);
    } else {
      toast.success('Preferência de notificação atualizada');
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Apenas administradores podem acessar as configurações de alertas.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          Voltar ao Dashboard
        </Button>
      </AppLayout>
    );
  }

  const handleSave = () => {
    updateSetting({ key: 'rack_warning_threshold', value: rackWarning });
    updateSetting({ key: 'rack_critical_threshold', value: rackCritical });
    updateSetting({ key: 'port_warning_threshold', value: portWarning });
    updateSetting({ key: 'port_critical_threshold', value: portCritical });
    updateSetting({ key: 'poe_warning_threshold', value: poeWarning });
    updateSetting({ key: 'poe_critical_threshold', value: poeCritical });
    
    updateSetting({ key: 'nvr_warning_threshold', value: nvrWarning });
    updateSetting({ key: 'nvr_critical_threshold', value: nvrCritical });
    updateSetting({ key: 'camera_orphan_alert_enabled', value: cameraOrphanEnabled ? 1 : 0 });
    updateSetting({ key: 'connection_faulty_alert_enabled', value: connectionFaultyEnabled ? 1 : 0 });
    updateSetting({ key: 'testing_max_days', value: testingMaxDays });
    updateSetting({ key: 'equipment_no_ip_alert_enabled', value: equipmentNoIpEnabled ? 1 : 0 });
  };

  const handleReset = () => {
    resetToDefaults();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando configurações...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Configurações de Alertas
            </h1>
            <p className="text-muted-foreground">
              Configure os limites para disparo de alertas de capacidade e auditoria
            </p>
          </div>
        </div>

        <Alert>
          <AlertTitle>Como funcionam os alertas?</AlertTitle>
          <AlertDescription>
            O sistema verifica automaticamente a capacidade de racks, portas, PoE, NVR/DVR, câmeras e conexões periodicamente. 
            Quando os limites configurados são atingidos, alertas são criados e notificações são enviadas.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Alertas de Capacidade</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ocupação de Racks</CardTitle>
                <CardDescription>
                  Configure os limites de ocupação para alertas de racks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rack-warning">Limite de Warning (%)</Label>
                  <Input
                    id="rack-warning"
                    type="number"
                    min="0"
                    max="100"
                    value={rackWarning}
                    onChange={(e) => setRackWarning(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rack-critical">Limite de Critical (%)</Label>
                  <Input
                    id="rack-critical"
                    type="number"
                    min="0"
                    max="100"
                    value={rackCritical}
                    onChange={(e) => setRackCritical(Number(e.target.value))}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <div className="space-y-1 text-xs">
                    <p>• 0% - {rackWarning - 1}%: Sem alerta</p>
                    <p className="text-yellow-600">• {rackWarning}% - {rackCritical - 1}%: Warning</p>
                    <p className="text-red-600">• {rackCritical}% - 100%: Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso de Portas</CardTitle>
                <CardDescription>
                  Configure os limites de uso para alertas de portas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="port-warning">Limite de Warning (%)</Label>
                  <Input
                    id="port-warning"
                    type="number"
                    min="0"
                    max="100"
                    value={portWarning}
                    onChange={(e) => setPortWarning(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port-critical">Limite de Critical (%)</Label>
                  <Input
                    id="port-critical"
                    type="number"
                    min="0"
                    max="100"
                    value={portCritical}
                    onChange={(e) => setPortCritical(Number(e.target.value))}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <div className="space-y-1 text-xs">
                    <p>• 0% - {portWarning - 1}%: Sem alerta</p>
                    <p className="text-yellow-600">• {portWarning}% - {portCritical - 1}%: Warning</p>
                    <p className="text-red-600">• {portCritical}% - 100%: Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>PoE Budget</CardTitle>
              <CardDescription>
                Configure os limites de uso para alertas de PoE em switches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="poe-warning">Limite de Warning (%)</Label>
                  <Input
                    id="poe-warning"
                    type="number"
                    min="0"
                    max="100"
                    value={poeWarning}
                    onChange={(e) => setPoeWarning(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poe-critical">Limite de Critical (%)</Label>
                  <Input
                    id="poe-critical"
                    type="number"
                    min="0"
                    max="100"
                    value={poeCritical}
                    onChange={(e) => setPoeCritical(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="space-y-1 text-xs">
                  <p>• 0% - {poeWarning - 1}%: Sem alerta</p>
                  <p className="text-yellow-600">• {poeWarning}% - {poeCritical - 1}%: Warning</p>
                  <p className="text-red-600">• {poeCritical}% - 100%: Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Alertas de Auditoria</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  NVR/DVR - Canais
                </CardTitle>
                <CardDescription>
                  Configure os limites de ocupação de canais para NVR e DVR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nvr-warning">Limite de Warning (%)</Label>
                  <Input
                    id="nvr-warning"
                    type="number"
                    min="0"
                    max="100"
                    value={nvrWarning}
                    onChange={(e) => setNvrWarning(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nvr-critical">Limite de Critical (%)</Label>
                  <Input
                    id="nvr-critical"
                    type="number"
                    min="0"
                    max="100"
                    value={nvrCritical}
                    onChange={(e) => setNvrCritical(Number(e.target.value))}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs">
                  <p>Gera alerta quando canais de NVR/DVR atingem o limite configurado</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Câmeras sem NVR
                </CardTitle>
                <CardDescription>
                  Alertar sobre câmeras IP não conectadas a NVR/DVR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="camera-orphan">Habilitar alerta</Label>
                  <Switch
                    id="camera-orphan"
                    checked={cameraOrphanEnabled}
                    onCheckedChange={setCameraOrphanEnabled}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs">
                  <p>Quando habilitado, gera alerta de warning para cada câmera IP que não está conectada a um NVR ou DVR</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cable className="w-5 h-5" />
                  Conexões com Defeito
                </CardTitle>
                <CardDescription>
                  Alertar sobre conexões marcadas como defeituosas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="connection-faulty">Habilitar alerta</Label>
                  <Switch
                    id="connection-faulty"
                    checked={connectionFaultyEnabled}
                    onCheckedChange={setConnectionFaultyEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testing-days">Dias máximos em "Testing"</Label>
                  <Input
                    id="testing-days"
                    type="number"
                    min="1"
                    max="365"
                    value={testingMaxDays}
                    onChange={(e) => setTestingMaxDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta se conexão está em testing por mais dias que o configurado
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Equipamentos sem IP
                </CardTitle>
                <CardDescription>
                  Alertar sobre equipamentos de rede sem endereço IP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="no-ip">Habilitar alerta</Label>
                  <Switch
                    id="no-ip"
                    checked={equipmentNoIpEnabled}
                    onCheckedChange={setEquipmentNoIpEnabled}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs">
                  <p>Gera alerta informativo para switches, routers, firewalls, servidores, NVRs e câmeras IP sem IP configurado</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notificações WhatsApp</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Alertas Resolvidos
              </CardTitle>
              <CardDescription>
                Receber notificação quando um alerta é automaticamente resolvido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="whatsapp-resolved" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Notificar alertas resolvidos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envia mensagem WhatsApp quando um alerta é resolvido automaticamente
                  </p>
                </div>
                <Switch
                  id="whatsapp-resolved"
                  checked={whatsappResolvedEnabled}
                  onCheckedChange={handleWhatsappResolvedChange}
                  disabled={loadingNotifSettings}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-xs">
                <p className="font-medium mb-1">Auto-resolução acontece quando:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Ocupação de rack cai abaixo do limite de warning</li>
                  <li>Uso de portas cai abaixo do limite de warning</li>
                  <li>Consumo PoE cai abaixo do limite de warning</li>
                  <li>Canais de NVR/DVR caem abaixo do limite</li>
                  <li>Câmera é conectada a um NVR/DVR</li>
                  <li>Conexão defeituosa é corrigida (status = active)</li>
                  <li>Conexão em testing é ativada ou removida</li>
                  <li>Equipamento recebe endereço IP</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Verificação Automática</CardTitle>
            <CardDescription>
              O sistema verifica automaticamente todas as condições a cada 15 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              A Edge Function <code className="bg-muted px-1 py-0.5 rounded">check-capacity-alerts</code> verifica 
              capacidade de racks, portas, PoE, NVR/DVR, câmeras órfãs, conexões e equipamentos sem IP, 
              além de auto-resolver alertas quando o problema é corrigido.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://gszsufxjstgpsxikgeeb.supabase.co/functions/v1/check-capacity-alerts', '_blank')}
            >
              Testar Verificação Manualmente
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={isUpdating}>
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isResetting}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {isResetting ? 'Restaurando...' : 'Restaurar Padrões'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
