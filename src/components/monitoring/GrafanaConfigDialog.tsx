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
  const [apiKeyError, setApiKeyError] = useState('');

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

  // Validate API Key format
  const validateApiKey = (key: string): boolean => {
    if (!key || key === '••••••••••••••••') return false;
    if (!key.startsWith('glsa_')) {
      setApiKeyError('API Key deve começar com "glsa_". Gere uma nova Service Account Token no Grafana.');
      return false;
    }
    if (key.length < 20) {
      setApiKeyError('API Key muito curta. Verifique se copiou o token completo.');
      return false;
    }
    setApiKeyError('');
    return true;
  };

  // Get error message details
  const getErrorDetails = (error: string): { message: string; solution: string } => {
    if (error.includes('401') || error.includes('Unauthorized') || error.includes('Invalid API key')) {
      return {
        message: 'API Key inválida ou expirada',
        solution: 'Gere uma nova Service Account Token no Grafana (Administration → Service Accounts)'
      };
    }
    if (error.includes('403') || error.includes('Forbidden')) {
      return {
        message: 'Sem permissão de acesso',
        solution: 'Verifique se a Service Account tem role "Admin" ou "Editor"'
      };
    }
    if (error.includes('404')) {
      return {
        message: 'Endpoint não encontrado',
        solution: 'Verifique se a URL do Grafana está correta'
      };
    }
    if (error.includes('ECONNREFUSED') || error.includes('Failed to fetch') || error.includes('NetworkError')) {
      return {
        message: 'Não foi possível conectar ao Grafana',
        solution: 'Verifique se o Grafana está online e acessível'
      };
    }
    return {
      message: error,
      solution: 'Verifique as configurações e tente novamente'
    };
  };

  const handleTestConnection = async () => {
    if (!grafanaUrl) {
      toast.error('Informe a URL do Grafana');
      return;
    }
    
    if (!apiKey || apiKey === '••••••••••••••••') {
      toast.error('Informe a API Key do Grafana');
      return;
    }

    if (!validateApiKey(apiKey)) {
      toast.error(apiKeyError || 'API Key inválida');
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
      const errorDetails = getErrorDetails(result.error || 'Erro desconhecido');
      setConnectionError(`${errorDetails.message}. ${errorDetails.solution}`);
      toast.error(`Falha: ${errorDetails.message}`);
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
              API Key (Service Account Token)
            </Label>
            <Input
              id="api_key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setConnectionStatus('idle');
                setApiKeyError('');
              }}
              placeholder="glsa_xxxxxxxxxxxxxx"
              className={apiKeyError ? 'border-red-500' : ''}
            />
            {apiKeyError ? (
              <p className="text-xs text-red-500">{apiKeyError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Token deve começar com "glsa_" e ter role Admin
              </p>
            )}
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

          {/* Help Links */}
          <div className="pt-2 border-t space-y-2">
            <a 
              href={grafanaUrl ? `${grafanaUrl}/admin/serviceaccounts` : 'https://grafana.com/docs/grafana/latest/administration/service-accounts/'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {grafanaUrl ? 'Abrir Service Accounts no seu Grafana' : 'Como criar uma Service Account'}
            </a>
            <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium">Passos para criar token:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Acesse Administration → Service Accounts</li>
                <li>Clique em "Add service account"</li>
                <li>Role: selecione <strong>Admin</strong></li>
                <li>Clique em "Add service account token"</li>
                <li>Copie o token gerado (glsa_...)</li>
              </ol>
            </div>
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
