import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Settings, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Save, 
  RefreshCw,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
  Maximize2
} from 'lucide-react';
import { useMonitoringPanels, MonitoringPanel } from '@/hooks/useMonitoringPanels';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function MonitoringDashboard() {
  const { panels, isLoading, addPanel, updatePanel, deletePanel, togglePanel } = useMonitoringPanels();
  const [selectedPanel, setSelectedPanel] = useState<MonitoringPanel | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // New panel form state
  const [newPanel, setNewPanel] = useState({
    name: '',
    url: '',
    description: '',
    panel_type: 'grafana' as 'grafana' | 'zabbix' | 'other',
  });

  const handleAddPanel = async () => {
    if (!newPanel.name || !newPanel.url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      await addPanel({
        name: newPanel.name,
        url: newPanel.url,
        description: newPanel.description,
        panel_type: newPanel.panel_type,
        is_active: true,
        display_order: panels.length,
      });
      
      setNewPanel({ name: '', url: '', description: '', panel_type: 'grafana' });
      setIsAddDialogOpen(false);
      toast.success('Painel adicionado com sucesso');
    } catch (error) {
      toast.error('Erro ao adicionar painel');
    }
  };

  const handleDeletePanel = async (id: string) => {
    try {
      await deletePanel(id);
      toast.success('Painel removido');
    } catch (error) {
      toast.error('Erro ao remover painel');
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const activePanels = panels.filter(p => p.is_active);

  // Fullscreen panel view
  if (isFullscreen) {
    const panel = panels.find(p => p.id === isFullscreen);
    if (!panel) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold">{panel.name}</span>
            <Badge variant="outline">{panel.panel_type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(panel.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
            <Button variant="default" size="sm" onClick={() => setIsFullscreen(null)}>
              Sair do Fullscreen
            </Button>
          </div>
        </div>
        <iframe
          key={refreshKey}
          src={panel.url}
          className="w-full h-[calc(100vh-73px)] border-0"
          title={panel.name}
          allow="fullscreen"
        />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Monitoramento</h1>
              <p className="text-muted-foreground">
                Visualize painéis do Grafana, Zabbix e outros sistemas
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Todos
          </Button>
        </div>

        <Tabs defaultValue="panels" className="space-y-4">
          <TabsList>
            <TabsTrigger value="panels" className="gap-2">
              <Monitor className="h-4 w-4" />
              Painéis ({activePanels.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Panels Tab */}
          <TabsContent value="panels" className="space-y-4">
            {activePanels.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum painel configurado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Configure painéis do Grafana ou Zabbix para visualizar aqui
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Painel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {activePanels.map((panel) => (
                  <Card key={panel.id} className="overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-base">{panel.name}</CardTitle>
                            {panel.description && (
                              <CardDescription className="text-xs mt-0.5">
                                {panel.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {panel.panel_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen(panel.id)}
                            title="Tela cheia"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(panel.url, '_blank')}
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="relative bg-muted/20" style={{ height: '500px' }}>
                        <iframe
                          key={`${panel.id}-${refreshKey}`}
                          src={panel.url}
                          className="w-full h-full border-0"
                          title={panel.name}
                          allow="fullscreen"
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Painéis de Monitoramento</CardTitle>
                    <CardDescription>
                      Gerencie os painéis de monitoramento exibidos
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Painel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Painel</DialogTitle>
                        <DialogDescription>
                          Configure um novo painel de monitoramento
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome do Painel</Label>
                          <Input
                            id="name"
                            placeholder="Ex: Dashboard Principal"
                            value={newPanel.name}
                            onChange={(e) => setNewPanel({ ...newPanel, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Tipo</Label>
                          <Select
                            value={newPanel.panel_type}
                            onValueChange={(v: 'grafana' | 'zabbix' | 'other') => 
                              setNewPanel({ ...newPanel, panel_type: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grafana">Grafana</SelectItem>
                              <SelectItem value="zabbix">Zabbix</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="url">URL do Painel</Label>
                          <Input
                            id="url"
                            placeholder="https://grafana.exemplo.com/d/..."
                            value={newPanel.url}
                            onChange={(e) => setNewPanel({ ...newPanel, url: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Para Grafana, use a URL de embed (adicione &kiosk=tv no final)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrição (opcional)</Label>
                          <Textarea
                            id="description"
                            placeholder="Descrição do painel..."
                            value={newPanel.description}
                            onChange={(e) => setNewPanel({ ...newPanel, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddPanel}>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : panels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum painel configurado ainda
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {panels.map((panel) => (
                        <div
                          key={panel.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            <div className="flex items-center gap-3">
                              {panel.is_active ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{panel.name}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                  {panel.url}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">{panel.panel_type}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePanel(panel.id, !panel.is_active)}
                              title={panel.is_active ? 'Ocultar' : 'Mostrar'}
                            >
                              {panel.is_active ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(panel.url, '_blank')}
                              title="Abrir em nova aba"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePanel(panel.id)}
                              className="text-destructive hover:text-destructive"
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dicas de Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Grafana:</strong> Para embedar painéis do Grafana, certifique-se de que a opção 
                    "allow_embedding" está habilitada no grafana.ini e use URLs com o parâmetro &kiosk=tv
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Zabbix:</strong> Dashboards do Zabbix podem ter restrições de CORS. 
                    Configure o servidor para permitir embedding ou use o botão "Abrir em Nova Aba"
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Autenticação:</strong> Se os painéis requerem login, configure SSO ou 
                    tokens de autenticação na URL para acesso direto
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
