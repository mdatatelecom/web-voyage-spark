import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
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
  CheckCircle,
  Clock,
  Database,
  FileText,
  Loader2,
  PlayCircle,
  Send,
  TestTube,
  Trash2,
  Users,
  Palette,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ColorPicker } from '@/components/system/ColorPicker';
import { ContrastValidator } from '@/components/system/ContrastValidator';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  };
  
  const [localBranding, setLocalBranding] = useState(branding);
  const [localColors, setLocalColors] = useState(themeColors);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo Principal</Label>
                  <div className="flex gap-4 items-start">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // ✨ CRIAR PREVIEW IMEDIATO
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
                    
                    {/* ✨ PREVIEW AO VIVO */}
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
                  {localBranding.logoUrl && (
                    <p className="text-sm text-muted-foreground">
                      Logo atual: <a href={localBranding.logoUrl} target="_blank" className="text-primary hover:underline">Ver imagem</a>
                    </p>
                  )}
                </div>

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

                <Button 
                  onClick={async () => {
                    await saveBranding(localBranding);
                    setLogoPreview(null);
                    toast({ title: 'Branding atualizado! Faça logout para ver as mudanças no login.' });
                  }} 
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Salvar Branding
                </Button>
              </div>
            </Card>

            {/* Preview em Tempo Real */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Preview em Tempo Real</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Veja como as cores ficam antes de salvar
              </p>
              <div className="border rounded-lg p-6 space-y-6" style={{ backgroundColor: `hsl(${localColors.secondary})` }}>
                {/* Sidebar Preview */}
                <div 
                  className="rounded-lg p-4 space-y-2"
                  style={{ backgroundColor: `hsl(${localColors.sidebarBackground})` }}
                >
                  <div 
                    className="text-sm px-3 py-2 rounded"
                    style={{ color: `hsl(${localColors.sidebarForeground})` }}
                  >
                    Menu Item Inativo
                  </div>
                  <div 
                    className="text-sm px-3 py-2 rounded font-medium"
                    style={{ 
                      backgroundColor: `hsl(${localColors.sidebarAccent})`,
                      color: `hsl(${localColors.sidebarPrimary})`
                    }}
                  >
                    Menu Item Ativo
                  </div>
                </div>

                {/* Buttons Preview */}
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-4 py-2 rounded font-medium"
                    style={{ 
                      backgroundColor: `hsl(${localColors.primary})`,
                      color: `hsl(${localColors.primaryForeground})`
                    }}
                  >
                    Botão Primário
                  </button>
                  <button 
                    className="px-4 py-2 rounded font-medium"
                    style={{ 
                      backgroundColor: `hsl(${localColors.secondary})`,
                      color: `hsl(${localColors.secondaryForeground})`
                    }}
                  >
                    Botão Secundário
                  </button>
                  <button 
                    className="px-4 py-2 rounded font-medium border-2"
                    style={{ 
                      borderColor: `hsl(${localColors.primary})`,
                      color: `hsl(${localColors.primary})`
                    }}
                  >
                    Botão Outline
                  </button>
                </div>

                {/* Badge Preview */}
                <div className="flex gap-2">
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: `hsl(${localColors.accent})`,
                      color: `hsl(${localColors.accentForeground})`
                    }}
                  >
                    Badge de Destaque
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    setLocalColors(DEFAULT_COLORS);
                    await saveThemeColors(DEFAULT_COLORS);
                  }}
                  className="flex-1"
                >
                  Resetar para Cores Padrão
                </Button>
                <Button 
                  onClick={() => saveThemeColors(localColors)} 
                  className="flex-1"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Salvar Cores
                </Button>
              </div>
            </Card>

            {/* Validação de Contraste WCAG */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Validação de Contraste (WCAG)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Verificação automática de acessibilidade das cores selecionadas
              </p>
              <div className="space-y-3">
                <ContrastValidator
                  foreground={localColors.primaryForeground}
                  background={localColors.primary}
                  label="Botão Primário"
                />
                <ContrastValidator
                  foreground={localColors.sidebarForeground}
                  background={localColors.sidebarBackground}
                  label="Menu Lateral"
                />
                <ContrastValidator
                  foreground={localColors.sidebarPrimary}
                  background={localColors.sidebarAccent}
                  label="Item Ativo do Menu"
                />
                <ContrastValidator
                  foreground={localColors.accentForeground}
                  background={localColors.accent}
                  label="Elementos de Destaque"
                />
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
