import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, RotateCcw, Save, Video, Camera, Cable, Network, MessageSquare, CheckCircle, Clock, Radar, ExternalLink, HardHat, Phone, Users } from 'lucide-react';
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

  // Ticket deadline settings
  const [ticketDeadlineWarningHours, setTicketDeadlineWarningHours] = useState(24);
  const [ticketDeadlineCriticalHours, setTicketDeadlineCriticalHours] = useState(4);
  const [ticketAutoEscalationEnabled, setTicketAutoEscalationEnabled] = useState(true);
  const [ticketDeadlineWhatsappEnabled, setTicketDeadlineWhatsappEnabled] = useState(true);

  // Zabbix settings
  const [zabbixEnabled, setZabbixEnabled] = useState(true);
  const [zabbixWhatsappEnabled, setZabbixWhatsappEnabled] = useState(true);
  const [zabbixMinSeverity, setZabbixMinSeverity] = useState(2);
  const [zabbixBaseUrl, setZabbixBaseUrl] = useState('');
  const [loadingZabbixUrl, setLoadingZabbixUrl] = useState(true);

  // EPI settings
  const [epiEnabled, setEpiEnabled] = useState(true);
  const [epiWhatsappEnabled, setEpiWhatsappEnabled] = useState(true);
  const [epiMinSeverity, setEpiMinSeverity] = useState(2);
  const [epiTargetType, setEpiTargetType] = useState<'individual' | 'group'>('individual');
  const [epiPhone, setEpiPhone] = useState('');
  const [epiGroupId, setEpiGroupId] = useState('');
  const [loadingEpiTarget, setLoadingEpiTarget] = useState(true);
  const [whatsappGroups, setWhatsappGroups] = useState<Array<{ id: string; subject: string }>>([]);

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

      // Ticket deadline settings
      setTicketDeadlineWarningHours(getSetting('ticket_deadline_warning_hours')?.setting_value || 24);
      setTicketDeadlineCriticalHours(getSetting('ticket_deadline_critical_hours')?.setting_value || 4);
      setTicketAutoEscalationEnabled((getSetting('ticket_auto_escalation_enabled')?.setting_value ?? 1) === 1);
      setTicketDeadlineWhatsappEnabled((getSetting('ticket_deadline_whatsapp_enabled')?.setting_value ?? 1) === 1);

      // Zabbix settings
      setZabbixEnabled((getSetting('zabbix_enabled')?.setting_value ?? 1) === 1);
      setZabbixWhatsappEnabled((getSetting('zabbix_whatsapp_enabled')?.setting_value ?? 1) === 1);
      setZabbixMinSeverity(getSetting('zabbix_min_severity')?.setting_value || 2);

      // EPI settings
      setEpiEnabled((getSetting('epi_enabled')?.setting_value ?? 1) === 1);
      setEpiWhatsappEnabled((getSetting('epi_whatsapp_enabled')?.setting_value ?? 1) === 1);
      setEpiMinSeverity(getSetting('epi_min_severity')?.setting_value || 2);
    }
  }, [settings, getSetting]);

  // Load Zabbix base URL from system_settings
  useEffect(() => {
    const loadZabbixUrl = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'zabbix_base_url')
        .single();

      if (data?.setting_value) {
        const url = typeof data.setting_value === 'string' ? data.setting_value.replace(/^"|"$/g, '') : '';
        setZabbixBaseUrl(url);
      }
      setLoadingZabbixUrl(false);
    };

    loadZabbixUrl();
  }, []);

  // Load EPI WhatsApp target and groups
  useEffect(() => {
    const loadEpiTarget = async () => {
      const [{ data: epiTarget }, { data: groups }] = await Promise.all([
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'epi_whatsapp_target')
          .single(),
        supabase
          .from('whatsapp_groups')
          .select('id, subject')
          .order('subject'),
      ]);

      if (epiTarget?.setting_value) {
        const val = epiTarget.setting_value as any;
        setEpiTargetType(val.targetType || 'individual');
        setEpiPhone(val.phone || '');
        setEpiGroupId(val.groupId || '');
      }
      if (groups) {
        setWhatsappGroups(groups);
      }
      setLoadingEpiTarget(false);
    };

    loadEpiTarget();
  }, []);

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

  const handleSave = async () => {
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

    // Ticket deadline settings
    updateSetting({ key: 'ticket_deadline_warning_hours', value: ticketDeadlineWarningHours });
    updateSetting({ key: 'ticket_deadline_critical_hours', value: ticketDeadlineCriticalHours });
    updateSetting({ key: 'ticket_auto_escalation_enabled', value: ticketAutoEscalationEnabled ? 1 : 0 });
    updateSetting({ key: 'ticket_deadline_whatsapp_enabled', value: ticketDeadlineWhatsappEnabled ? 1 : 0 });

    // Zabbix settings
    updateSetting({ key: 'zabbix_enabled', value: zabbixEnabled ? 1 : 0 });
    updateSetting({ key: 'zabbix_whatsapp_enabled', value: zabbixWhatsappEnabled ? 1 : 0 });
    updateSetting({ key: 'zabbix_min_severity', value: zabbixMinSeverity });

    // EPI settings
    updateSetting({ key: 'epi_enabled', value: epiEnabled ? 1 : 0 });
    updateSetting({ key: 'epi_whatsapp_enabled', value: epiWhatsappEnabled ? 1 : 0 });
    updateSetting({ key: 'epi_min_severity', value: epiMinSeverity });

    // Save Zabbix base URL to system_settings
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'zabbix_base_url',
        setting_value: JSON.stringify(zabbixBaseUrl),
      }, { onConflict: 'setting_key' });

    if (error) {
      toast.error('Erro ao salvar URL do Zabbix');
    }

    // Save EPI WhatsApp target to system_settings
    const { error: epiError } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'epi_whatsapp_target',
        setting_value: {
          targetType: epiTargetType,
          phone: epiPhone,
          groupId: epiGroupId,
        },
      }, { onConflict: 'setting_key' });

    if (epiError) {
      toast.error('Erro ao salvar configurações EPI WhatsApp');
    }
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

        {/* EPI Monitor Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HardHat className="w-5 h-5" />
            EPI Monitor
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardHat className="w-5 h-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>
                  Habilite e configure alertas do EPI Monitor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="epi-enabled">Integração habilitada</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas do EPI Monitor via webhook
                    </p>
                  </div>
                  <Switch
                    id="epi-enabled"
                    checked={epiEnabled}
                    onCheckedChange={setEpiEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="epi-whatsapp">Notificar via WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar alertas EPI para WhatsApp
                    </p>
                  </div>
                  <Switch
                    id="epi-whatsapp"
                    checked={epiWhatsappEnabled}
                    onCheckedChange={setEpiWhatsappEnabled}
                    disabled={!epiEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severidade mínima para notificar</Label>
                  <Select
                    value={String(epiMinSeverity)}
                    onValueChange={(v) => setEpiMinSeverity(Number(v))}
                    disabled={!epiEnabled || !epiWhatsappEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Info (todas)</SelectItem>
                      <SelectItem value="2">Warning (aviso e crítico)</SelectItem>
                      <SelectItem value="3">Critical (apenas crítico)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Destino WhatsApp EPI
                </CardTitle>
                <CardDescription>
                  Escolha para onde enviar os alertas de EPI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de destino</Label>
                  <Select
                    value={epiTargetType}
                    onValueChange={(v) => setEpiTargetType(v as 'individual' | 'group')}
                    disabled={!epiEnabled || !epiWhatsappEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        <span className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          Número individual
                        </span>
                      </SelectItem>
                      <SelectItem value="group">
                        <span className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          Grupo do WhatsApp
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {epiTargetType === 'individual' ? (
                  <div className="space-y-2">
                    <Label htmlFor="epi-phone">Telefone para Alertas EPI</Label>
                    <Input
                      id="epi-phone"
                      type="tel"
                      placeholder="5511999999999"
                      value={epiPhone}
                      onChange={(e) => setEpiPhone(e.target.value)}
                      disabled={!epiEnabled || !epiWhatsappEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: código do país + DDD + número
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Grupo do WhatsApp</Label>
                    <Select
                      value={epiGroupId}
                      onValueChange={setEpiGroupId}
                      disabled={!epiEnabled || !epiWhatsappEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappGroups.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhum grupo sincronizado
                          </SelectItem>
                        ) : (
                          whatsappGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.subject}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Grupos sincronizados via Configurações do Sistema &gt; WhatsApp
                    </p>
                  </div>
                )}

                {!epiEnabled || !epiWhatsappEnabled ? (
                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                    Habilite a integração EPI e notificações WhatsApp para configurar o destino
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg text-xs">
                    <p>Os alertas de EPI com imagens serão enviados como foto + legenda no WhatsApp</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuração do Webhook EPI</CardTitle>
              <CardDescription>
                Configure o EPI Monitor para enviar alertas para esta URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-mono break-all">
                  https://gszsufxjstgpsxikgeeb.supabase.co/functions/v1/zabbix-webhook
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Parâmetros aceitos (EPI Monitor):</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><code className="bg-muted px-1 rounded">source</code> - "epi_monitor"</li>
                  <li><code className="bg-muted px-1 rounded">message</code> - Mensagem do alerta</li>
                  <li><code className="bg-muted px-1 rounded">severity</code> - Severidade (critical, warning, info)</li>
                  <li><code className="bg-muted px-1 rounded">camera</code> - Nome da câmera</li>
                  <li><code className="bg-muted px-1 rounded">risk</code> - Tipo de risco identificado</li>
                  <li><code className="bg-muted px-1 rounded">image</code> - URL ou Base64 da imagem/screenshot</li>
                  <li><code className="bg-muted px-1 rounded">employee_name</code> - Nome do funcionário</li>
                  <li><code className="bg-muted px-1 rounded">department</code> - Departamento</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Zabbix Integration Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Integração Zabbix
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radar className="w-5 h-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>
                  Habilite e configure a integração com o Zabbix
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="zabbix-enabled">Integração habilitada</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas do Zabbix via webhook
                    </p>
                  </div>
                  <Switch
                    id="zabbix-enabled"
                    checked={zabbixEnabled}
                    onCheckedChange={setZabbixEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zabbix-url">URL base do Zabbix</Label>
                  <Input
                    id="zabbix-url"
                    type="url"
                    placeholder="https://zabbix.empresa.com"
                    value={zabbixBaseUrl}
                    onChange={(e) => setZabbixBaseUrl(e.target.value)}
                    disabled={loadingZabbixUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para criar links diretos para hosts no Zabbix
                  </p>
                </div>
                {zabbixBaseUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(zabbixBaseUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Testar URL
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Notificações WhatsApp
                </CardTitle>
                <CardDescription>
                  Configure notificações WhatsApp para alertas Zabbix
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="zabbix-whatsapp">Notificar via WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar alertas Zabbix para o grupo de WhatsApp
                    </p>
                  </div>
                  <Switch
                    id="zabbix-whatsapp"
                    checked={zabbixWhatsappEnabled}
                    onCheckedChange={setZabbixWhatsappEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severidade mínima para notificar</Label>
                  <Select
                    value={String(zabbixMinSeverity)}
                    onValueChange={(v) => setZabbixMinSeverity(Number(v))}
                    disabled={!zabbixWhatsappEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Info (todas)</SelectItem>
                      <SelectItem value="2">Warning (aviso e crítico)</SelectItem>
                      <SelectItem value="3">Critical (apenas crítico)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Apenas alertas com severidade igual ou maior serão notificados
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuração do Webhook</CardTitle>
              <CardDescription>
                Configure o Zabbix para enviar alertas para esta URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-mono break-all">
                  https://gszsufxjstgpsxikgeeb.supabase.co/functions/v1/zabbix-webhook
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Parâmetros aceitos:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><code className="bg-muted px-1 rounded">host</code> ou <code className="bg-muted px-1 rounded">hostname</code> - Nome do host</li>
                  <li><code className="bg-muted px-1 rounded">trigger</code> ou <code className="bg-muted px-1 rounded">trigger_name</code> - Nome do trigger</li>
                  <li><code className="bg-muted px-1 rounded">severity</code> - Severidade (texto ou número)</li>
                  <li><code className="bg-muted px-1 rounded">status</code> - Status (PROBLEM, OK)</li>
                  <li><code className="bg-muted px-1 rounded">eventid</code> - ID do evento</li>
                  <li><code className="bg-muted px-1 rounded">ip</code> - IP do host</li>
                  <li><code className="bg-muted px-1 rounded">message</code> - Mensagem detalhada</li>
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
