import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSystemStats } from '@/hooks/useSystemStats';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  PlayCircle,
  Send,
  Terminal,
  TestTube,
  Trash2,
  Users,
  Palette,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Wifi,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ColorPicker } from '@/components/system/ColorPicker';
import { ChartPreview } from '@/components/system/ChartPreview';
import { ContrastValidator } from '@/components/system/ContrastValidator';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { COLOR_PRESETS, type ColorPreset } from '@/constants/colorPresets';
import { LOGO_PRESETS, LOGO_CATEGORIES } from '@/constants/logoPresets';
import { useVpnSettings } from '@/hooks/useVpnSettings';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

export default function System() {
  const { toast } = useToast();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const {
    systemHealth,
    alertStats,
    usageStats,
    accessLogs,
    runCapacityCheck,
    isRunningCheck,
    createTestAlert,
    sendTestEmail,
    isSendingEmail,
    cleanOldData,
  } = useSystemStats();

  const [testSeverity, setTestSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [testEmail, setTestEmail] = useState('');
  
  const { 
    branding, 
    themeColors, 
    saveBranding, 
    saveThemeColors, 
    uploadImage
  } = useSystemSettings();

  const DEFAULT_COLORS = {
    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',
    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',
    iconColor: '222.2 47.4% 11.2%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarPrimary: '240 5.9% 10%',
    sidebarAccent: '240 4.8% 95.9%',
    sidebarAccentForeground: '240 5.9% 10%',
    sidebarBorder: '220 13% 91%',
    chart1: '222.2 47.4% 11.2%',
    chart2: '142.1 76.2% 36.3%',
    chart3: '47.9 95.8% 53.1%',
    chart4: '262.1 83.3% 57.8%',
    chart5: '24.6 95% 53.1%',
  };
  
  const [localBranding, setLocalBranding] = useState(branding);
  const [localColors, setLocalColors] = useState(themeColors);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);

  // VPN Settings
  const { vpnSettings, isLoading: vpnLoading, saveSettings: saveVpnSettings } = useVpnSettings();
  const [localVpnSettings, setLocalVpnSettings] = useState(vpnSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [relayTestStatus, setRelayTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [relayTestMessage, setRelayTestMessage] = useState<string>('');

  // WhatsApp Settings
  const { settings: whatsAppSettings, isLoading: whatsAppLoading, isTesting: whatsAppTesting, saveSettings: saveWhatsAppSettings, testConnection: testWhatsAppConnection } = useWhatsAppSettings();
  const [localWhatsAppSettings, setLocalWhatsAppSettings] = useState(whatsAppSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [whatsAppTestStatus, setWhatsAppTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [whatsAppTestMessage, setWhatsAppTestMessage] = useState<string>('');

  useEffect(() => {
    setLocalVpnSettings(vpnSettings);
  }, [vpnSettings]);

  useEffect(() => {
    setLocalWhatsAppSettings(whatsAppSettings);
  }, [whatsAppSettings]);

  // Test relay connection via WebSocket (bypasses Mixed Content issues)
  const testRelayConnection = async () => {
    if (!localVpnSettings.sshRelayUrl) {
      setRelayTestStatus('error');
      setRelayTestMessage('Configure a URL do relay primeiro');
      return;
    }

    setRelayTestStatus('testing');
    setRelayTestMessage('Testando conexão WebSocket...');

    try {
      const ws = new WebSocket(localVpnSettings.sshRelayUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        setRelayTestStatus('error');
        setRelayTestMessage('Timeout: Servidor não respondeu em 10 segundos');
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        // Send a ping to verify the relay responds correctly
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Wait for pong or any response
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            setRelayTestStatus('success');
            setRelayTestMessage('Relay online e acessível via WebSocket');
          }
        }, 1000);
      };

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' || data.type === 'connected' || data.type === 'error') {
            ws.close();
            setRelayTestStatus('success');
            setRelayTestMessage(`Relay respondeu: ${data.type}`);
          }
        } catch {
          // Even if not JSON, receiving data means connection works
          ws.close();
          setRelayTestStatus('success');
          setRelayTestMessage('Relay acessível (resposta recebida)');
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setRelayTestStatus('error');
        if (localVpnSettings.sshRelayUrl.startsWith('ws://')) {
          setRelayTestMessage('Falha na conexão. Se você está em HTTPS, use wss:// ou configure SSL no relay.');
        } else {
          setRelayTestMessage('Falha na conexão. Verifique se o servidor está online.');
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (relayTestStatus === 'testing') {
          if (event.code === 1000 || event.code === 1001) {
            setRelayTestStatus('success');
            setRelayTestMessage('Conexão fechada normalmente - relay acessível');
          } else {
            setRelayTestStatus('error');
            setRelayTestMessage(`Conexão fechada: código ${event.code}`);
          }
        }
      };
    } catch (err) {
      setRelayTestStatus('error');
      setRelayTestMessage(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const applyPreset = async (preset: ColorPreset) => {
    setApplyingPreset(true);
    setLocalColors(preset.colors);
    await saveThemeColors(preset.colors);
    setTimeout(() => setApplyingPreset(false), 300);
  };

  useEffect(() => {
    setLocalBranding(branding);
  }, [branding]);

  useEffect(() => {
    setLocalColors(themeColors);
  }, [themeColors]);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sistema</h1>
          <p className="text-muted-foreground">
            Monitoramento, logs e ferramentas de administração
          </p>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList>
            <TabsTrigger value="status">Status do Sistema</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="scans">Analytics de Scans</TabsTrigger>
            <TabsTrigger value="tests">Testes Manuais</TabsTrigger>
            <TabsTrigger value="vpn">
              <Globe className="w-4 h-4 mr-2" />
              VPN
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="customization">
              <Palette className="w-4 h-4 mr-2" />
              Personalização
            </TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Tab: Status do Sistema */}
          <TabsContent value="status" className="space-y-6">
            {/* Health Check */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Status do Banco</div>
                    <div className="text-2xl font-bold mt-1">
                      {systemHealth?.database === 'ok' ? (
                        <span className="text-green-600">OK</span>
                      ) : (
                        <span className="text-red-600">Erro</span>
                      )}
                    </div>
                  </div>
                  {systemHealth?.database === 'ok' ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Tempo de Resposta</div>
                    <div className="text-2xl font-bold mt-1">
                      {systemHealth?.responseTime}ms
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Última Atualização</div>
                    <div className="text-sm font-semibold mt-1">
                      {systemHealth?.timestamp
                        ? new Date(systemHealth.timestamp).toLocaleTimeString('pt-BR')
                        : '-'}
                    </div>
                  </div>
                  <Activity className="w-8 h-8 text-primary" />
                </div>
              </Card>
            </div>

            {/* Alert Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Estatísticas de Alertas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-3xl font-bold">{alertStats?.total || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ativos</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {alertStats?.active || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Info</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {alertStats?.bySeverity.info || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avisos</div>
                  <div className="text-3xl font-bold text-yellow-600">
                    {alertStats?.bySeverity.warning || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Críticos</div>
                  <div className="text-3xl font-bold text-red-600">
                    {alertStats?.bySeverity.critical || 0}
                  </div>
                </div>
              </div>
            </Card>

            {/* Usage Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Estatísticas de Uso
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Usuários</div>
                  <div className="text-3xl font-bold">{usageStats?.users || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Conexões</div>
                  <div className="text-3xl font-bold">{usageStats?.connections || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Equipamentos</div>
                  <div className="text-3xl font-bold">{usageStats?.equipment || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Racks</div>
                  <div className="text-3xl font-bold">{usageStats?.racks || 0}</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Logs */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Logs de Acesso Recentes
                </h3>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Atualizar
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessLogs && accessLogs.length > 0 ? (
                    accessLogs.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          Sistema
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum log disponível
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab: Testes Manuais */}
          <TabsContent value="tests" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Verificação de Capacidade */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Verificação de Capacidade
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Execute manualmente a verificação de capacidade de racks e portas
                </p>
                <Button
                  onClick={() => runCapacityCheck()}
                  disabled={isRunningCheck}
                  className="w-full"
                >
                  {isRunningCheck ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Executar Verificação
                    </>
                  )}
                </Button>
              </Card>

              {/* Criar Alerta de Teste */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Criar Alerta de Teste
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie um alerta de teste para verificar notificações
                </p>
                <div className="space-y-3">
                  <Select
                    value={testSeverity}
                    onValueChange={(value: any) => setTestSeverity(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => createTestAlert(testSeverity)}
                    variant="outline"
                    className="w-full"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Criar Alerta
                  </Button>
                </div>
              </Card>

              {/* Enviar Email de Teste */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Enviar Email de Teste
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Envie um email de teste para verificar configurações
                </p>
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    onClick={() => sendTestEmail(testEmail)}
                    disabled={!testEmail || isSendingEmail}
                    variant="outline"
                    className="w-full"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Email
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: VPN */}
          <TabsContent value="vpn" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configurações de VPN / SSH
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure as credenciais para acesso remoto via terminal CLI.
              </p>
              
              {vpnLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="vpnHost">Endereço do Servidor (IP ou Hostname)</Label>
                      <Input
                        id="vpnHost"
                        value={localVpnSettings.vpnHost}
                        onChange={(e) => setLocalVpnSettings({ ...localVpnSettings, vpnHost: e.target.value })}
                        placeholder="192.168.1.100 ou servidor.exemplo.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sshPort">Porta SSH</Label>
                      <Input
                        id="sshPort"
                        type="number"
                        value={localVpnSettings.sshPort}
                        onChange={(e) => setLocalVpnSettings({ ...localVpnSettings, sshPort: parseInt(e.target.value) || 22 })}
                        placeholder="22"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="vpnUser">Usuário</Label>
                      <Input
                        id="vpnUser"
                        value={localVpnSettings.vpnUser}
                        onChange={(e) => setLocalVpnSettings({ ...localVpnSettings, vpnUser: e.target.value })}
                        placeholder="admin"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="vpnPassword">Senha</Label>
                      <div className="relative">
                        <Input
                          id="vpnPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={localVpnSettings.vpnPassword}
                          onChange={(e) => setLocalVpnSettings({ ...localVpnSettings, vpnPassword: e.target.value })}
                          placeholder="••••••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* SSH Relay Configuration */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      SSH WebSocket Relay (Conexão Real)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Para conexões SSH reais, configure um servidor relay WebSocket externo.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <Switch
                        id="useExternalRelay"
                        checked={localVpnSettings.useExternalRelay}
                        onCheckedChange={(checked) => setLocalVpnSettings({ ...localVpnSettings, useExternalRelay: checked })}
                      />
                      <Label htmlFor="useExternalRelay">Usar SSH Relay Externo</Label>
                    </div>
                    
                    {localVpnSettings.useExternalRelay && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sshRelayUrl">URL do SSH Relay WebSocket</Label>
                          <div className="flex gap-2">
                            <Input
                              id="sshRelayUrl"
                              value={localVpnSettings.sshRelayUrl}
                              onChange={(e) => {
                                setLocalVpnSettings({ ...localVpnSettings, sshRelayUrl: e.target.value });
                                setRelayTestStatus('idle');
                                setRelayTestMessage('');
                              }}
                              placeholder="wss://seu-servidor.com/ssh ou ws://192.168.1.100:8080/ssh"
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              onClick={testRelayConnection}
                              disabled={!localVpnSettings.sshRelayUrl || relayTestStatus === 'testing'}
                              className="min-w-[100px]"
                            >
                              {relayTestStatus === 'testing' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : relayTestStatus === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : relayTestStatus === 'error' ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Wifi className="w-4 h-4" />
                              )}
                              <span className="ml-2">
                                {relayTestStatus === 'testing' ? 'Testando...' : 'Testar'}
                              </span>
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Exemplo: wss://meu-vps.com:8080/ssh ou ws://192.168.1.100:3000/ssh
                          </p>
                        </div>
                        
                        {/* Test result message */}
                        {relayTestMessage && (
                          <Alert variant={relayTestStatus === 'error' ? 'destructive' : 'default'}>
                            {relayTestStatus === 'success' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : relayTestStatus === 'error' ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <Wifi className="h-4 w-4" />
                            )}
                            <AlertDescription>{relayTestMessage}</AlertDescription>
                          </Alert>
                        )}
                        
                        {/* Mixed Content Warning */}
                        {localVpnSettings.sshRelayUrl?.startsWith('ws://') && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Conexão não segura</AlertTitle>
                            <AlertDescription>
                              Você está usando ws:// (não criptografado). Para maior segurança em produção, 
                              configure HTTPS/WSS no seu servidor relay com certificado SSL.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveVpnSettings(localVpnSettings)}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocalVpnSettings(vpnSettings)}
                    >
                      Restaurar
                    </Button>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Como usar SSH Real:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Instale o servidor relay em um VPS: <code className="bg-background px-1 rounded">npm install ssh2 ws</code></li>
                      <li>Execute o relay que aceita WebSocket e conecta via SSH</li>
                      <li>Configure a URL do relay acima (ex: wss://seu-vps:8080/ssh)</li>
                      <li>Ative "Usar SSH Relay Externo" e salve</li>
                    </ol>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: WhatsApp */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Integração WhatsApp (Evolution API)
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure a integração com Evolution API para enviar notificações de chamados via WhatsApp.
              </p>
              
              {whatsAppLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Toggle de habilitação */}
                  <div className="flex items-center gap-4">
                    <Switch
                      id="whatsappEnabled"
                      checked={localWhatsAppSettings.isEnabled}
                      onCheckedChange={(checked) => setLocalWhatsAppSettings({ 
                        ...localWhatsAppSettings, 
                        isEnabled: checked 
                      })}
                    />
                    <Label htmlFor="whatsappEnabled">Habilitar integração WhatsApp</Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* URL da Evolution API */}
                    <div className="space-y-2">
                      <Label htmlFor="evolutionUrl">URL da Evolution API</Label>
                      <Input
                        id="evolutionUrl"
                        value={localWhatsAppSettings.evolutionApiUrl}
                        onChange={(e) => setLocalWhatsAppSettings({ 
                          ...localWhatsAppSettings, 
                          evolutionApiUrl: e.target.value 
                        })}
                        placeholder="https://evolution.seudominio.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL do servidor onde a Evolution API está instalada
                      </p>
                    </div>
                    
                    {/* Nome da Instância */}
                    <div className="space-y-2">
                      <Label htmlFor="evolutionInstance">Nome da Instância</Label>
                      <Input
                        id="evolutionInstance"
                        value={localWhatsAppSettings.evolutionInstance}
                        onChange={(e) => setLocalWhatsAppSettings({ 
                          ...localWhatsAppSettings, 
                          evolutionInstance: e.target.value 
                        })}
                        placeholder="chamados"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nome da instância do WhatsApp configurada na Evolution
                      </p>
                    </div>
                    
                    {/* API Key */}
                    <div className="space-y-2">
                      <Label htmlFor="evolutionApiKey">API Key</Label>
                      <div className="relative">
                        <Input
                          id="evolutionApiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={localWhatsAppSettings.evolutionApiKey}
                          onChange={(e) => setLocalWhatsAppSettings({ 
                            ...localWhatsAppSettings, 
                            evolutionApiKey: e.target.value 
                          })}
                          placeholder="••••••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Chave de autenticação configurada na Evolution API
                      </p>
                    </div>
                    
                    {/* Código do País */}
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Código do País Padrão</Label>
                      <Input
                        id="countryCode"
                        value={localWhatsAppSettings.defaultCountryCode}
                        onChange={(e) => setLocalWhatsAppSettings({ 
                          ...localWhatsAppSettings, 
                          defaultCountryCode: e.target.value 
                        })}
                        placeholder="55"
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Será adicionado automaticamente se o número não tiver código do país
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setWhatsAppTestStatus('testing');
                        const result = await testWhatsAppConnection(localWhatsAppSettings);
                        setWhatsAppTestStatus(result.success ? 'success' : 'error');
                        setWhatsAppTestMessage(result.message);
                      }}
                      disabled={!localWhatsAppSettings.evolutionApiUrl || whatsAppTesting || whatsAppTestStatus === 'testing'}
                    >
                      {whatsAppTestStatus === 'testing' || whatsAppTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : whatsAppTestStatus === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      ) : whatsAppTestStatus === 'error' ? (
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                      ) : (
                        <Wifi className="w-4 h-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                    
                    <Button
                      onClick={() => saveWhatsAppSettings(localWhatsAppSettings)}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setLocalWhatsAppSettings(whatsAppSettings)}
                    >
                      Restaurar
                    </Button>
                  </div>
                  
                  {/* Mensagem de resultado do teste */}
                  {whatsAppTestMessage && (
                    <Alert variant={whatsAppTestStatus === 'error' ? 'destructive' : 'default'}>
                      {whatsAppTestStatus === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{whatsAppTestMessage}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Instruções */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Como configurar a Evolution API:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Instale a Evolution API em um servidor (Docker ou manual)</li>
                      <li>Crie uma instância e conecte escaneando o QR Code</li>
                      <li>Copie a API Key e nome da instância para os campos acima</li>
                      <li>Teste a conexão antes de salvar</li>
                    </ol>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Personalização */}
          <TabsContent value="customization" className="space-y-6">
            {/* Paletas Predefinidas */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Branding
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Sistema</Label>
                  <Input
                    value={localBranding.systemName}
                    onChange={(e) => setLocalBranding({ ...localBranding, systemName: e.target.value })}
                    placeholder="InfraConnexus"
                    className="mt-2"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="logo">Ou faça upload do seu logo</Label>
                  <div className="flex gap-4 items-start">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const previewUrl = URL.createObjectURL(file);
                          setLogoPreview(previewUrl);
                          
                          const url = await uploadImage(file, 'logo');
                          if (url) {
                            setLocalBranding({ ...localBranding, logoUrl: url });
                          } else {
                            setLogoPreview(null);
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    
                    {(logoPreview || localBranding.logoUrl) && (
                      <Card className="p-4 bg-gradient-to-br from-background via-background to-primary/5 shrink-0">
                        <div className="text-center space-y-3">
                          <p className="text-xs text-muted-foreground font-medium">
                            Preview da Tela de Login
                          </p>
                          <div className="bg-white rounded-lg p-6 shadow-sm border">
                            <img
                              src={logoPreview || localBranding.logoUrl!}
                              alt="Preview"
                              className="h-16 w-auto mx-auto object-contain"
                            />
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Favicon</Label>
                  <div className="flex gap-3 items-center mt-2">
                    {localBranding.faviconUrl && (
                      <img src={localBranding.faviconUrl} alt="Favicon" className="h-8 w-8 border rounded" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadImage(file, 'favicon');
                          if (url) setLocalBranding({ ...localBranding, faviconUrl: url });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      await saveBranding(localBranding);
                      setLogoPreview(null);
                    }} 
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Salvar Branding
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recarregar
                  </Button>
                </div>
              </div>
            </Card>

            {/* Paletas Predefinidas */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Paletas Predefinidas</h3>
                  <p className="text-sm text-muted-foreground">
                    Aplique esquemas de cores prontos com um clique
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COLOR_PRESETS.map((preset) => (
                    <Card 
                      key={preset.name} 
                      className={`cursor-pointer hover:border-primary hover:shadow-md transition-all ${
                        applyingPreset ? 'opacity-50' : ''
                      }`}
                      onClick={() => applyPreset(preset)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{preset.name}</CardTitle>
                        <CardDescription className="text-xs">{preset.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {[preset.colors.primary, preset.colors.secondary, preset.colors.accent, preset.colors.iconColor].map((color, i) => (
                            <div
                              key={i}
                              className="h-8 w-8 rounded-md border"
                              style={{ backgroundColor: `hsl(${color})` }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Personalização Avançada de Cores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorPicker
                  label="Cor Primária"
                  description="Cor principal do sistema (botões, links)"
                  value={localColors.primary}
                  onChange={(v) => setLocalColors({ ...localColors, primary: v })}
                />
                <ColorPicker
                  label="Texto da Cor Primária"
                  description="Cor do texto sobre a cor primária"
                  value={localColors.primaryForeground}
                  onChange={(v) => setLocalColors({ ...localColors, primaryForeground: v })}
                />
                <ColorPicker
                  label="Cor Secundária"
                  description="Cor de elementos secundários"
                  value={localColors.secondary}
                  onChange={(v) => setLocalColors({ ...localColors, secondary: v })}
                />
                <ColorPicker
                  label="Cor de Destaque"
                  description="Cor de hover e elementos destacados"
                  value={localColors.accent}
                  onChange={(v) => setLocalColors({ ...localColors, accent: v })}
                />
              </div>

              <Separator className="my-6" />

              <h4 className="font-semibold mb-4">Cores do Menu Lateral</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ColorPicker
                    label="Cor de Fundo do Menu"
                    description="Cor de fundo do menu lateral"
                    value={localColors.sidebarBackground}
                    onChange={(v) => setLocalColors({ ...localColors, sidebarBackground: v })}
                  />
                  <ColorPicker
                    label="Cor do Texto do Menu"
                    description="Cor dos itens do menu lateral (inativos)"
                    value={localColors.sidebarForeground}
                    onChange={(v) => setLocalColors({ ...localColors, sidebarForeground: v })}
                  />
                  <ColorPicker
                    label="Cor do Item Ativo"
                    description="Cor do texto do item selecionado no menu"
                    value={localColors.sidebarPrimary}
                    onChange={(v) => setLocalColors({ ...localColors, sidebarPrimary: v })}
                  />
                  <ColorPicker
                    label="Cor de Hover do Menu"
                    description="Cor de fundo ao passar o mouse sobre itens"
                    value={localColors.sidebarAccent}
                    onChange={(v) => setLocalColors({ ...localColors, sidebarAccent: v })}
                  />
              </div>

              <Separator className="my-6" />

              <h4 className="font-semibold mb-4">Ícones do Sistema</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorPicker
                  label="Cor dos Ícones"
                  description="Cor dos ícones do sistema e menu"
                  value={localColors.iconColor}
                  onChange={(v) => setLocalColors({ ...localColors, iconColor: v })}
                />
              </div>

              <Separator className="my-6" />

              <h4 className="font-semibold mb-4">Cores dos Gráficos</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Personalize as cores usadas nos gráficos do Dashboard
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ColorPicker
                  label="Chart 1 (Principal)"
                  description="Cor primária dos gráficos"
                  value={localColors.chart1}
                  onChange={(v) => setLocalColors({ ...localColors, chart1: v })}
                />
                <ColorPicker
                  label="Chart 2 (Sucesso)"
                  description="Conexões ativas, indicadores positivos"
                  value={localColors.chart2}
                  onChange={(v) => setLocalColors({ ...localColors, chart2: v })}
                />
                <ColorPicker
                  label="Chart 3 (Alerta)"
                  description="Itens em teste, avisos"
                  value={localColors.chart3}
                  onChange={(v) => setLocalColors({ ...localColors, chart3: v })}
                />
                <ColorPicker
                  label="Chart 4 (Info)"
                  description="Itens reservados, informações"
                  value={localColors.chart4}
                  onChange={(v) => setLocalColors({ ...localColors, chart4: v })}
                />
                <ColorPicker
                  label="Chart 5 (Secundário)"
                  description="Outras categorias, complemento"
                  value={localColors.chart5}
                  onChange={(v) => setLocalColors({ ...localColors, chart5: v })}
                />
              </div>

              {/* Preview ao vivo */}
              <div className="mt-6">
                <ChartPreview colors={{
                  chart1: localColors.chart1,
                  chart2: localColors.chart2,
                  chart3: localColors.chart3,
                  chart4: localColors.chart4,
                  chart5: localColors.chart5,
                }} />
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => saveThemeColors(localColors)} 
                  className="flex-1"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Salvar Cores
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocalColors(DEFAULT_COLORS)}
                >
                  Restaurar Padrão
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Avançado */}
          <TabsContent value="advanced" className="space-y-6">
            {/* Configurar Cron Externo */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configurar Verificações Automáticas</h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure um serviço de cron externo para executar verificações automáticas de
                  capacidade a cada 15 minutos.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div>
                    <div className="text-sm font-semibold mb-1">URL da Edge Function:</div>
                    <code className="text-xs bg-background p-2 rounded block">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-capacity-alerts
                    </code>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Header de Autorização:</div>
                    <code className="text-xs bg-background p-2 rounded block break-all">
                      Authorization: Bearer {import.meta.env.VITE_SUPABASE_ANON_KEY}
                    </code>
                  </div>
                </div>
                <div className="text-sm space-y-2">
                  <p className="font-semibold">Serviços recomendados:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <a
                        href="https://cron-job.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Cron-Job.org
                      </a>{' '}
                      - Gratuito e fácil de configurar
                    </li>
                    <li>
                      <a
                        href="https://easycron.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        EasyCron
                      </a>{' '}
                      - Interface simples
                    </li>
                    <li>GitHub Actions - Use workflows agendados</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Limpar Dados Antigos */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Limpar Dados Antigos
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => cleanOldData({ type: 'logs', days: 90 })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Logs &gt; 90 dias
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => cleanOldData({ type: 'alerts', days: 30 })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Alertas Resolvidos &gt; 30 dias
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  ⚠️ Esta ação não pode ser desfeita. Os dados serão permanentemente removidos.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
