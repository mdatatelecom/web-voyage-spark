import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGrafanaConfig, Datasource } from '@/hooks/useGrafanaConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, RefreshCw, ExternalLink, Key, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GrafanaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrafanaConfigDialog({ open, onOpenChange }: GrafanaConfigDialogProps) {
  const { config, saveConfig, isSaving, testConnection, fetchDatasources } = useGrafanaConfig();
  
  const [grafanaUrl, setGrafanaUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedDatasource, setSelectedDatasource] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [isLoadingDatasources, setIsLoadingDatasources] = useState(false);

  useEffect(() => {
    if (config) {
      setGrafanaUrl(config.grafana_url);
      setSelectedDatasource(config.datasource_uid || '');
    }
  }, [config]);

  // Load saved API key
  useEffect(() => {
    const loadApiKey = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'grafana_api_key')
        .maybeSingle();
      
      const settingValue = data?.setting_value as Record<string, unknown> | null;
      if (settingValue?.key) {
        setApiKey('••••••••••••••••');
      }
    };
    
    if (open) {
      loadApiKey();
    }
  }, [open]);

  const handleTestConnection = async () => {
    if (!grafanaUrl) {
      toast.error('Informe a URL do Grafana');
      return;
    }
    
    if (!apiKey || apiKey === '••••••••••••••••') {
      toast.error('Informe a API Key do Grafana');
      return;
    }

    setConnectionStatus('testing');
    setConnectionError('');

    const result = await testConnection(grafanaUrl, apiKey);
    
    if (result.success) {
      setConnectionStatus('success');
      toast.success('Conexão com Grafana estabelecida!');
      
      // Auto-fetch datasources after successful connection
      handleFetchDatasources();
    } else {
      setConnectionStatus('error');
      setConnectionError(result.error || 'Erro desconhecido');
      toast.error(`Falha na conexão: ${result.error}`);
    }
  };

  const handleFetchDatasources = async () => {
    if (!grafanaUrl || (!apiKey && apiKey !== '••••••••••••••••')) return;
    
    setIsLoadingDatasources(true);
    
    // Get actual API key if masked
    let actualKey = apiKey;
    if (apiKey === '••••••••••••••••') {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'grafana_api_key')
        .maybeSingle();
      const settingValue = data?.setting_value as Record<string, unknown> | null;
      actualKey = (settingValue?.key as string) || '';
    }
    
    const result = await fetchDatasources(grafanaUrl, actualKey);
    
    setIsLoadingDatasources(false);
    
    if (result.success && result.data) {
      setDatasources(result.data);
      if (result.data.length === 0) {
        toast.warning('Nenhum datasource Zabbix encontrado');
      } else {
        toast.success(`${result.data.length} datasource(s) Zabbix encontrado(s)`);
      }
    } else {
      toast.error(`Erro ao buscar datasources: ${result.error}`);
    }
  };

  const handleSave = async () => {
    if (!grafanaUrl) {
      toast.error('Informe a URL do Grafana');
      return;
    }

    // Save API key to system_settings if changed
    if (apiKey && apiKey !== '••••••••••••••••') {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'grafana_api_key',
          setting_value: { key: apiKey },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) {
        toast.error(`Erro ao salvar API Key: ${error.message}`);
        return;
      }
    }

    const selectedDs = datasources.find(ds => ds.uid === selectedDatasource);
    
    saveConfig({
      grafana_url: grafanaUrl,
      datasource_uid: selectedDatasource || null,
      datasource_name: selectedDs?.name || 'Zabbix',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuração do Grafana
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com o Grafana para buscar métricas do Zabbix
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Grafana URL */}
          <div className="space-y-2">
            <Label htmlFor="grafana_url">URL do Grafana</Label>
            <Input
              id="grafana_url"
              value={grafanaUrl}
              onChange={(e) => setGrafanaUrl(e.target.value)}
              placeholder="https://grafana.example.com"
            />
            <p className="text-xs text-muted-foreground">
              URL completa do seu servidor Grafana
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="api_key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setConnectionStatus('idle');
              }}
              placeholder="glsa_xxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Service Account Token com permissão de leitura
            </p>
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={connectionStatus === 'testing'}
            >
              {connectionStatus === 'testing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : connectionStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              ) : connectionStatus === 'error' ? (
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
              ) : null}
              Testar Conexão
            </Button>
            
            {connectionStatus === 'success' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Conectado
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Falha
              </Badge>
            )}
          </div>

          {connectionError && (
            <p className="text-sm text-red-500">{connectionError}</p>
          )}

          {/* Datasource Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Datasource Zabbix</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchDatasources}
                disabled={isLoadingDatasources}
              >
                {isLoadingDatasources ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Select value={selectedDatasource} onValueChange={setSelectedDatasource}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o datasource Zabbix" />
              </SelectTrigger>
              <SelectContent>
                {datasources.map((ds) => (
                  <SelectItem key={ds.uid} value={ds.uid}>
                    {ds.name} ({ds.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {datasources.length === 0 && !isLoadingDatasources && (
              <p className="text-xs text-muted-foreground">
                Clique em testar conexão para buscar datasources disponíveis
              </p>
            )}
          </div>

          {/* Help Link */}
          <div className="pt-2 border-t">
            <a 
              href="https://grafana.com/docs/grafana/latest/administration/service-accounts/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Como criar uma Service Account no Grafana
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
