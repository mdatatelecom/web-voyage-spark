import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  Pause,
  Play,
  Send,
  Trash2,
  Users,
  Upload,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Wifi,
  XCircle,
  MessageCircle,
  Plus,
  Shield,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { useSecuritySettings } from '@/hooks/useDevToolsProtection';
import { WhatsAppTemplateEditor } from '@/components/whatsapp/WhatsAppTemplateEditor';
import { WhatsAppGroupSelector } from '@/components/whatsapp/WhatsAppGroupSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle as AlertTriangleIcon } from 'lucide-react';

export default function System() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [searchParams] = useSearchParams();
  const {
    systemHealth,
    alertStats,
    usageStats,
    runCapacityCheck,
    isRunningCheck,
    cleanOldData,
  } = useSystemStats();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'status');

  // Security Settings
  const {
    settings: securitySettings,
    setSettings: setLocalSecuritySettings,
    isLoading: securityLoading,
    isSaving: securitySaving,
    saveSettings: saveSecuritySettings
  } = useSecuritySettings();

  // WhatsApp Settings
  const { 
    settings: whatsAppSettings, 
    isLoading: whatsAppLoading, 
    isTesting: whatsAppTesting, 
    isSendingTest: whatsAppSendingTest,
    instances: whatsAppInstances,
    isLoadingInstances: whatsAppLoadingInstances,
    isCreatingInstance: whatsAppCreatingInstance,
    isDeletingInstance: whatsAppDeletingInstance,
    lastInstanceRefresh: whatsAppLastRefresh,
    saveSettings: saveWhatsAppSettings, 
    testConnection: testWhatsAppConnection,
    listInstances: listWhatsAppInstances,
    refreshInstances: refreshWhatsAppInstances,
    createInstance: createWhatsAppInstance,
    deleteInstance: deleteWhatsAppInstance,
    logoutInstance: logoutWhatsAppInstance,
    connectInstance: connectWhatsAppInstance,
    sendTestMessage: sendWhatsAppTestMessage,
    configureWebhook: configureWhatsAppWebhook,
    isConfiguringWebhook: whatsAppConfiguringWebhook
  } = useWhatsAppSettings();
  const [localWhatsAppSettings, setLocalWhatsAppSettings] = useState(whatsAppSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [whatsAppTestStatus, setWhatsAppTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [whatsAppTestMessage, setWhatsAppTestMessage] = useState<string>('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  
  // Create Instance Dialog
  const [showCreateInstanceDialog, setShowCreateInstanceDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [createdQrCode, setCreatedQrCode] = useState<string | null>(null);

  // Delete/Logout Instance Dialog
  const [showDeleteInstanceDialog, setShowDeleteInstanceDialog] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'logout'>('logout');
  const [instanceToDelete, setInstanceToDelete] = useState<string>('');

  // Reconnect Instance Dialog
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [reconnectQrCode, setReconnectQrCode] = useState<string | null>(null);
  const [instanceToReconnect, setInstanceToReconnect] = useState<string>('');

  // Test Message Dialog
  const [showTestMessageDialog, setShowTestMessageDialog] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessageContent, setTestMessageContent] = useState('');
  const [testMessageStatus, setTestMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testMessageResult, setTestMessageResult] = useState<string>('');

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    
    const result = await createWhatsAppInstance(
      newInstanceName.trim().replace(/\s+/g, '_'),
      localWhatsAppSettings.evolutionApiUrl,
      localWhatsAppSettings.evolutionApiKey
    );
    
    if (result.success) {
      if (result.qrcode) {
        setCreatedQrCode(result.qrcode);
      } else {
        setShowCreateInstanceDialog(false);
        setNewInstanceName('');
        listWhatsAppInstances(
          localWhatsAppSettings.evolutionApiUrl,
          localWhatsAppSettings.evolutionApiKey
        );
      }
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateInstanceDialog(false);
    setNewInstanceName('');
    setCreatedQrCode(null);
    if (localWhatsAppSettings.evolutionApiUrl && localWhatsAppSettings.evolutionApiKey) {
      listWhatsAppInstances(
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    }
  };

  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return;
    
    let result;
    if (deleteAction === 'delete') {
      result = await deleteWhatsAppInstance(
        instanceToDelete,
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    } else {
      result = await logoutWhatsAppInstance(
        instanceToDelete,
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    }
    
    if (result.success) {
      setShowDeleteInstanceDialog(false);
      setInstanceToDelete('');
      setDeleteAction('logout');
      
      if (deleteAction === 'delete' && localWhatsAppSettings.evolutionInstance === instanceToDelete) {
        setLocalWhatsAppSettings({
          ...localWhatsAppSettings,
          evolutionInstance: ''
        });
      }
      
      listWhatsAppInstances(
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    }
  };

  const handleOpenDeleteDialog = () => {
    if (localWhatsAppSettings.evolutionInstance) {
      setInstanceToDelete(localWhatsAppSettings.evolutionInstance);
      setDeleteAction('logout');
      setShowDeleteInstanceDialog(true);
    }
  };

  const handleReconnectInstance = async () => {
    if (!instanceToReconnect) return;
    
    const result = await connectWhatsAppInstance(
      instanceToReconnect,
      localWhatsAppSettings.evolutionApiUrl,
      localWhatsAppSettings.evolutionApiKey
    );
    
    if (result.success && result.qrcode) {
      setReconnectQrCode(result.qrcode);
    }
  };

  const handleOpenReconnectDialog = () => {
    if (localWhatsAppSettings.evolutionInstance) {
      setInstanceToReconnect(localWhatsAppSettings.evolutionInstance);
      setReconnectQrCode(null);
      setShowReconnectDialog(true);
    }
  };

  const handleCloseReconnectDialog = () => {
    setShowReconnectDialog(false);
    setInstanceToReconnect('');
    setReconnectQrCode(null);
    if (localWhatsAppSettings.evolutionApiUrl && localWhatsAppSettings.evolutionApiKey) {
      listWhatsAppInstances(
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    }
  };

  useEffect(() => {
    setLocalWhatsAppSettings(whatsAppSettings);
  }, [whatsAppSettings]);

  // Auto-refresh WhatsApp instances every 30 seconds
  useEffect(() => {
    if (!localWhatsAppSettings.evolutionApiUrl || 
        !localWhatsAppSettings.evolutionApiKey ||
        !autoRefreshEnabled) {
      return;
    }

    const intervalId = setInterval(() => {
      refreshWhatsAppInstances(
        localWhatsAppSettings.evolutionApiUrl,
        localWhatsAppSettings.evolutionApiKey
      );
    }, 30000);

    return () => clearInterval(intervalId);
  }, [
    localWhatsAppSettings.evolutionApiUrl, 
    localWhatsAppSettings.evolutionApiKey, 
    autoRefreshEnabled,
    refreshWhatsAppInstances
  ]);

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
            Monitoramento e ferramentas de administração
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="status">Status do Sistema</TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Segurança
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
                    
                    {/* Nome da Instância - Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="evolutionInstance">Nome da Instância</Label>
                      <div className="flex gap-2">
                        <Select
                          value={localWhatsAppSettings.evolutionInstance}
                          onValueChange={(value) => setLocalWhatsAppSettings({ 
                            ...localWhatsAppSettings, 
                            evolutionInstance: value 
                          })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione uma instância" />
                          </SelectTrigger>
                          <SelectContent>
                            {whatsAppInstances.length > 0 ? (
                              whatsAppInstances.map((instance) => {
                                const isConnected = instance.state === 'open' || instance.state === 'connected';
                                const needsReconnect = !isConnected && instance.state === 'needs_reconnect';
                                const isDisconnected = !isConnected;
                                
                                return (
                                  <SelectItem key={instance.name} value={instance.name}>
                                    <div className="flex items-center gap-2 w-full">
                                      {isConnected && !needsReconnect ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : needsReconnect ? (
                                        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                                      ) : isDisconnected ? (
                                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                                      )}
                                      <span className="truncate">{instance.name}</span>
                                      {instance.profileName && (
                                        <span className="text-muted-foreground text-xs truncate">
                                          ({instance.profileName})
                                        </span>
                                      )}
                                      <Badge 
                                        variant={
                                          isConnected && !needsReconnect
                                            ? 'default' 
                                            : needsReconnect
                                              ? 'outline'
                                              : 'secondary'
                                        } 
                                        className={`ml-auto text-xs shrink-0 ${needsReconnect ? 'border-yellow-500 text-yellow-600' : ''}`}
                                      >
                                        {isConnected && !needsReconnect
                                          ? 'Conectado' 
                                          : needsReconnect
                                            ? 'Reconexão necessária'
                                            : isDisconnected 
                                              ? 'Desconectado' 
                                              : instance.state || 'Pendente'}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="_empty" disabled>
                                Clique em "Buscar" para listar instâncias
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => listWhatsAppInstances(
                            localWhatsAppSettings.evolutionApiUrl,
                            localWhatsAppSettings.evolutionApiKey
                          )}
                          disabled={!localWhatsAppSettings.evolutionApiUrl || !localWhatsAppSettings.evolutionApiKey || whatsAppLoadingInstances}
                          title="Buscar instâncias disponíveis"
                        >
                          {whatsAppLoadingInstances ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowCreateInstanceDialog(true)}
                          disabled={!localWhatsAppSettings.evolutionApiUrl || !localWhatsAppSettings.evolutionApiKey}
                          title="Criar nova instância"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleOpenReconnectDialog}
                          disabled={!localWhatsAppSettings.evolutionInstance || whatsAppCreatingInstance}
                          title="Reconectar instância (gerar novo QR Code)"
                          className="text-primary hover:text-primary"
                        >
                          <Wifi className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleOpenDeleteDialog}
                          disabled={!localWhatsAppSettings.evolutionInstance}
                          title="Excluir ou desconectar instância"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Buscar (↻), Criar (+), Reconectar (📶) ou Excluir (🗑️) instâncias
                      </p>
                      
                      {/* Auto-refresh indicator */}
                      {localWhatsAppSettings.evolutionApiUrl && localWhatsAppSettings.evolutionApiKey && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 p-2 rounded-md border border-border/50 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <RefreshCw className={`h-3 w-3 ${autoRefreshEnabled ? 'animate-spin text-green-500' : 'text-muted-foreground'}`} />
                            <span>
                              {whatsAppLastRefresh 
                                ? `Última atualização: ${format(whatsAppLastRefresh, 'HH:mm:ss')}`
                                : 'Aguardando primeira atualização...'
                              }
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                          >
                            {autoRefreshEnabled ? (
                              <>
                                <Pause className="h-3 w-3 mr-1" /> Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" /> Retomar
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {localWhatsAppSettings.evolutionInstance && whatsAppInstances.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/50">
                          {(() => {
                            const selectedInstance = whatsAppInstances.find(i => i.name === localWhatsAppSettings.evolutionInstance);
                            const isConnected = selectedInstance?.state === 'open' || selectedInstance?.state === 'connected';
                            const needsReconnect = !isConnected && selectedInstance?.state === 'needs_reconnect';
                            
                            if (isConnected) {
                              return (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600 dark:text-green-400">WhatsApp conectado</span>
                                </>
                              );
                            } else if (needsReconnect) {
                              return (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                    Reconexão necessária (código {selectedInstance?.disconnectionReasonCode || 'desconhecido'})
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenReconnectDialog}
                                    className="ml-auto h-7 text-xs"
                                  >
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Reconectar
                                  </Button>
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span className="text-sm text-destructive">WhatsApp desconectado</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenReconnectDialog}
                                    className="ml-auto h-7 text-xs"
                                  >
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Reconectar
                                  </Button>
                                </>
                              );
                            }
                          })()}
                        </div>
                      )}
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
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 3);
                          setLocalWhatsAppSettings({ 
                            ...localWhatsAppSettings, 
                            defaultCountryCode: cleaned
                          });
                        }}
                        maxLength={3}
                        placeholder="55"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Código do país para números sem DDI (ex: 55 para Brasil, 1 para EUA)
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Seletor de Grupo */}
                  <WhatsAppGroupSelector
                    settings={localWhatsAppSettings}
                    onSettingsChange={setLocalWhatsAppSettings}
                    disabled={!localWhatsAppSettings.evolutionApiUrl || !localWhatsAppSettings.evolutionApiKey || !localWhatsAppSettings.evolutionInstance}
                  />
                  
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
                      variant="outline"
                      onClick={async () => {
                        await configureWhatsAppWebhook(
                          localWhatsAppSettings.evolutionInstance,
                          localWhatsAppSettings.evolutionApiUrl,
                          localWhatsAppSettings.evolutionApiKey
                        );
                      }}
                      disabled={!localWhatsAppSettings.evolutionApiUrl || !localWhatsAppSettings.evolutionApiKey || !localWhatsAppSettings.evolutionInstance || whatsAppConfiguringWebhook}
                    >
                      {whatsAppConfiguringWebhook ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4 mr-2" />
                      )}
                      Configurar Webhook
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTestPhoneNumber('');
                        setTestMessageContent('');
                        setTestMessageStatus('idle');
                        setTestMessageResult('');
                        setShowTestMessageDialog(true);
                      }}
                      disabled={!localWhatsAppSettings.evolutionApiUrl || !localWhatsAppSettings.evolutionApiKey || !localWhatsAppSettings.evolutionInstance}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Teste
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
                      <li>Clique em + para criar uma nova instância e escaneie o QR Code</li>
                      <li>Ou selecione uma instância existente da lista</li>
                      <li>Teste a conexão antes de salvar</li>
                    </ol>
                  </div>
                  
                  {/* Dialog para criar nova instância */}
                  <Dialog open={showCreateInstanceDialog} onOpenChange={handleCloseCreateDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Criar Nova Instância</DialogTitle>
                        <DialogDescription>
                          Crie uma nova instância do WhatsApp na Evolution API.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {!createdQrCode ? (
                          <div className="space-y-2">
                            <Label htmlFor="newInstanceName">Nome da Instância</Label>
                            <Input
                              id="newInstanceName"
                              value={newInstanceName}
                              onChange={(e) => setNewInstanceName(e.target.value.replace(/\s+/g, '_'))}
                              placeholder="minha_empresa"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use apenas letras, números e underscores (sem espaços)
                            </p>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <Alert>
                              <CheckCircle2 className="h-4 w-4" />
                              <AlertTitle>Instância criada!</AlertTitle>
                              <AlertDescription>
                                Escaneie o QR Code abaixo com o WhatsApp para conectar.
                              </AlertDescription>
                            </Alert>
                            <div className="bg-white p-4 rounded-lg inline-block">
                              <img 
                                src={createdQrCode.startsWith('data:') ? createdQrCode : `data:image/png;base64,${createdQrCode}`} 
                                alt="QR Code" 
                                className="w-64 h-64 mx-auto"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Após escanear, feche este dialog e atualize a lista de instâncias.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={handleCloseCreateDialog}>
                          {createdQrCode ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {!createdQrCode && (
                          <Button 
                            onClick={handleCreateInstance}
                            disabled={!newInstanceName.trim() || whatsAppCreatingInstance}
                          >
                            {whatsAppCreatingInstance && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Criar Instância
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog para excluir/desconectar instância */}
                  <Dialog open={showDeleteInstanceDialog} onOpenChange={setShowDeleteInstanceDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangleIcon className="h-5 w-5" />
                          Gerenciar Instância
                        </DialogTitle>
                        <DialogDescription>
                          O que você deseja fazer com a instância "{instanceToDelete}"?
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <RadioGroup 
                          value={deleteAction} 
                          onValueChange={(v) => setDeleteAction(v as 'delete' | 'logout')}
                        >
                          <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                            <RadioGroupItem value="logout" id="logout" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="logout" className="font-medium cursor-pointer">
                                Apenas Desconectar
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Desconecta o WhatsApp, mas mantém a instância.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border border-destructive/30 rounded-lg cursor-pointer hover:bg-destructive/5">
                            <RadioGroupItem value="delete" id="delete" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="delete" className="font-medium text-destructive cursor-pointer">
                                Excluir Permanentemente
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Remove a instância completamente. Esta ação não pode ser desfeita.
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteInstanceDialog(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          variant={deleteAction === 'delete' ? 'destructive' : 'default'}
                          onClick={handleDeleteInstance}
                          disabled={whatsAppDeletingInstance}
                        >
                          {whatsAppDeletingInstance && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {deleteAction === 'delete' ? 'Excluir' : 'Desconectar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog para reconectar instância */}
                  <Dialog open={showReconnectDialog} onOpenChange={handleCloseReconnectDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Wifi className="h-5 w-5" />
                          Reconectar Instância
                        </DialogTitle>
                        <DialogDescription>
                          Gere um novo QR Code para reconectar a instância "{instanceToReconnect}".
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {!reconnectQrCode ? (
                          <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Clique no botão abaixo para gerar um novo QR Code e reconectar o WhatsApp.
                            </p>
                            <Button 
                              onClick={handleReconnectInstance}
                              disabled={whatsAppCreatingInstance}
                              className="w-full"
                            >
                              {whatsAppCreatingInstance && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Gerar QR Code
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <Alert>
                              <CheckCircle2 className="h-4 w-4" />
                              <AlertTitle>QR Code gerado!</AlertTitle>
                              <AlertDescription>
                                Escaneie o QR Code abaixo com o WhatsApp para reconectar.
                              </AlertDescription>
                            </Alert>
                            <div className="bg-white p-4 rounded-lg inline-block">
                              <img 
                                src={reconnectQrCode.startsWith('data:') ? reconnectQrCode : `data:image/png;base64,${reconnectQrCode}`} 
                                alt="QR Code" 
                                className="w-64 h-64 mx-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={handleCloseReconnectDialog}>
                          {reconnectQrCode ? 'Fechar' : 'Cancelar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog para enviar mensagem de teste */}
                  <Dialog open={showTestMessageDialog} onOpenChange={setShowTestMessageDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          Enviar Mensagem de Teste
                        </DialogTitle>
                        <DialogDescription>
                          Envie uma mensagem de teste para verificar a integração WhatsApp.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="testPhone">Número de Telefone</Label>
                          <Input
                            id="testPhone"
                            value={testPhoneNumber}
                            onChange={(e) => setTestPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="5511999999999"
                          />
                          <p className="text-xs text-muted-foreground">
                            Formato: código do país + DDD + número (apenas números)
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="testMessage">Mensagem (opcional)</Label>
                          <Input
                            id="testMessage"
                            value={testMessageContent}
                            onChange={(e) => setTestMessageContent(e.target.value)}
                            placeholder="✅ Teste de integração WhatsApp!"
                          />
                        </div>
                        
                        {testMessageResult && (
                          <Alert variant={testMessageStatus === 'error' ? 'destructive' : 'default'}>
                            {testMessageStatus === 'success' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>{testMessageResult}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTestMessageDialog(false)}>
                          Fechar
                        </Button>
                        <Button 
                          onClick={async () => {
                            if (!testPhoneNumber) {
                              setTestMessageStatus('error');
                              setTestMessageResult('Informe o número de telefone');
                              return;
                            }
                            
                            setTestMessageStatus('sending');
                            setTestMessageResult('Enviando mensagem...');
                            
                            const result = await sendWhatsAppTestMessage(
                              testPhoneNumber,
                              testMessageContent || undefined,
                              localWhatsAppSettings
                            );
                            
                            setTestMessageStatus(result.success ? 'success' : 'error');
                            setTestMessageResult(result.message);
                          }}
                          disabled={!testPhoneNumber || testMessageStatus === 'sending' || whatsAppSendingTest}
                        >
                          {(testMessageStatus === 'sending' || whatsAppSendingTest) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Enviar Teste
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </Card>
            
            {/* Editor de Templates */}
            <WhatsAppTemplateEditor />
          </TabsContent>

          {/* Tab: Segurança */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Proteção do Sistema
                </CardTitle>
                <CardDescription>
                  Configure proteções para dificultar o acesso ao código fonte e ferramentas de desenvolvedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangleIcon className="w-4 h-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Estas proteções dificultam, mas não impedem totalmente, o acesso ao código fonte. 
                    São úteis para prevenir acesso casual por usuários não técnicos.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="disableContextMenu" className="font-medium">
                        Desabilitar Clique Direito
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Impede que o menu de contexto do navegador seja exibido ao clicar com o botão direito
                      </p>
                    </div>
                    <Switch
                      id="disableContextMenu"
                      checked={securitySettings.disableContextMenu}
                      disabled={securityLoading || securitySaving}
                      onCheckedChange={async (checked) => {
                        const newSettings = { ...securitySettings, disableContextMenu: checked };
                        setLocalSecuritySettings(newSettings);
                        const success = await saveSecuritySettings(newSettings);
                        if (success) {
                          toast({
                            title: '✅ Configuração salva!',
                            description: checked 
                              ? 'Clique direito desabilitado'
                              : 'Clique direito habilitado'
                          });
                        } else {
                          toast({
                            title: 'Erro ao salvar',
                            description: 'Não foi possível salvar a configuração',
                            variant: 'destructive'
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="disableDevTools" className="font-medium">
                        Desabilitar Atalhos de Desenvolvedor
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Bloqueia atalhos como F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C e Ctrl+U
                      </p>
                    </div>
                    <Switch
                      id="disableDevTools"
                      checked={securitySettings.disableDevToolsShortcuts}
                      disabled={securityLoading || securitySaving}
                      onCheckedChange={async (checked) => {
                        const newSettings = { ...securitySettings, disableDevToolsShortcuts: checked };
                        setLocalSecuritySettings(newSettings);
                        const success = await saveSecuritySettings(newSettings);
                        if (success) {
                          toast({
                            title: '✅ Configuração salva!',
                            description: checked 
                              ? 'Atalhos de desenvolvedor desabilitados'
                              : 'Atalhos de desenvolvedor habilitados'
                          });
                        } else {
                          toast({
                            title: 'Erro ao salvar',
                            description: 'Não foi possível salvar a configuração',
                            variant: 'destructive'
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground space-y-2">
                  <h4 className="font-medium text-foreground">Atalhos bloqueados:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">F12</kbd> - Abre DevTools</li>
                    <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+I</kbd> - Abre DevTools</li>
                    <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+J</kbd> - Abre Console</li>
                    <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+C</kbd> - Inspecionar Elemento</li>
                    <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+U</kbd> - Ver Código Fonte</li>
                  </ul>
                </div>
              </CardContent>
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
                      <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Cron-Job.org
                      </a> - Gratuito e fácil de configurar
                    </li>
                    <li>
                      <a href="https://easycron.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        EasyCron
                      </a> - Interface simples
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