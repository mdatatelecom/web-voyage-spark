import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, RotateCcw, Save } from 'lucide-react';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

export default function AlertSettings() {
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { settings, isLoading, getSetting, updateSetting, isUpdating, resetToDefaults, isResetting } = useAlertSettings();
  
  const [rackWarning, setRackWarning] = useState(80);
  const [rackCritical, setRackCritical] = useState(95);
  const [portWarning, setPortWarning] = useState(80);
  const [portCritical, setPortCritical] = useState(95);
  const [poeWarning, setPoeWarning] = useState(80);
  const [poeCritical, setPoeCritical] = useState(90);

  useEffect(() => {
    if (settings) {
      setRackWarning(getSetting('rack_warning_threshold')?.setting_value || 80);
      setRackCritical(getSetting('rack_critical_threshold')?.setting_value || 95);
      setPortWarning(getSetting('port_warning_threshold')?.setting_value || 80);
      setPortCritical(getSetting('port_critical_threshold')?.setting_value || 95);
      setPoeWarning(getSetting('poe_warning_threshold')?.setting_value || 80);
      setPoeCritical(getSetting('poe_critical_threshold')?.setting_value || 90);
    }
  }, [settings, getSetting]);

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
              Configure os limites para disparo de alertas de capacidade
            </p>
          </div>
        </div>

        <Alert>
          <AlertTitle>Como funcionam os alertas?</AlertTitle>
          <AlertDescription>
            O sistema verifica automaticamente a capacidade de racks e portas a cada 15 minutos. 
            Quando os limites configurados são atingidos, alertas são criados e notificações em tempo real são enviadas.
          </AlertDescription>
        </Alert>

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
                <Label htmlFor="rack-warning">
                  Limite de Warning (%)
                </Label>
                <Input
                  id="rack-warning"
                  type="number"
                  min="0"
                  max="100"
                  value={rackWarning}
                  onChange={(e) => setRackWarning(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta de aviso será criado quando a ocupação atingir este valor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rack-critical">
                  Limite de Critical (%)
                </Label>
                <Input
                  id="rack-critical"
                  type="number"
                  min="0"
                  max="100"
                  value={rackCritical}
                  onChange={(e) => setRackCritical(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta crítico será criado quando a ocupação atingir este valor
                </p>
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
                <Label htmlFor="port-warning">
                  Limite de Warning (%)
                </Label>
                <Input
                  id="port-warning"
                  type="number"
                  min="0"
                  max="100"
                  value={portWarning}
                  onChange={(e) => setPortWarning(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta de aviso quando portas em uso atingirem este valor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port-critical">
                  Limite de Critical (%)
                </Label>
                <Input
                  id="port-critical"
                  type="number"
                  min="0"
                  max="100"
                  value={portCritical}
                  onChange={(e) => setPortCritical(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta crítico quando portas em uso atingirem este valor
                </p>
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
              <div className="space-y-2">
                <Label htmlFor="poe-warning">
                  Limite de Warning (%)
                </Label>
                <Input
                  id="poe-warning"
                  type="number"
                  min="0"
                  max="100"
                  value={poeWarning}
                  onChange={(e) => setPoeWarning(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta de aviso quando consumo PoE atingir este valor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poe-critical">
                  Limite de Critical (%)
                </Label>
                <Input
                  id="poe-critical"
                  type="number"
                  min="0"
                  max="100"
                  value={poeCritical}
                  onChange={(e) => setPoeCritical(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta crítico quando consumo PoE atingir este valor
                </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Verificação Automática</CardTitle>
            <CardDescription>
              O sistema verifica automaticamente a capacidade a cada 15 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O Edge Function <code className="bg-muted px-1 py-0.5 rounded">check-capacity-alerts</code> é executado 
              automaticamente para verificar as capacidades e criar alertas quando necessário.
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
