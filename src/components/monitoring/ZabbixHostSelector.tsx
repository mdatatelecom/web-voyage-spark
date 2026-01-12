import { useState } from 'react';
import { Check, ChevronsUpDown, RefreshCw, Search, Loader2, AlertTriangle, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useZabbixHosts, CachedZabbixHost } from '@/hooks/useZabbixHosts';
import { useGrafanaConfig } from '@/hooks/useGrafanaConfig';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ZabbixHostSelectorProps {
  value?: string;
  onChange: (hostId: string, host?: CachedZabbixHost) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface DiagnosisResult {
  grafana: { status: string; version: string | null; error: string | null };
  datasource: { status: string; info: any; error: string | null };
  zabbixApi: { status: string; version: string | null; error: string | null };
  hostTest: { status: string; count: number | null; sample: any[]; error: string | null };
  endpoints: any[];
  recommendation: string;
}

export function ZabbixHostSelector({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Selecione um host do Zabbix" 
}: ZabbixHostSelectorProps) {
  const { hosts, isLoading, syncHosts, isSyncing, getHostById, lastSyncTime } = useZabbixHosts();
  const { config, isLoading: configLoading } = useGrafanaConfig();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);

  const isGrafanaConfigured = !!config?.grafana_url && !!config?.datasource_uid;
  const selectedHost = value ? getHostById(value) : undefined;

  const filteredHosts = hosts.filter(host => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      host.host_name.toLowerCase().includes(term) ||
      host.host_display_name?.toLowerCase().includes(term) ||
      host.host_id.includes(term)
    );
  });

  // Get IP from first interface
  const getHostIP = (host: CachedZabbixHost): string => {
    const interfaces = host.interfaces as any[] || [];
    const firstInterface = interfaces.find(i => i.ip);
    return firstInterface?.ip || 'N/A';
  };

  // Format last sync time
  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Nunca sincronizado';
    const date = new Date(lastSyncTime);
    return `Última sync: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Run diagnosis
  const runDiagnosis = async () => {
    if (!config?.grafana_url || !config?.datasource_uid) {
      toast.error('Configuração do Grafana incompleta');
      return;
    }

    setDiagnosing(true);
    setDiagnosisOpen(true);
    setDiagnosis(null);

    try {
      // Get API key from system_settings
      const { data: apiKeyData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'grafana_api_key')
        .maybeSingle();

      const apiKey = apiKeyData?.setting_value;
      if (!apiKey) {
        toast.error('API Key do Grafana não configurada');
        setDiagnosing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'diagnose',
          grafana_url: config.grafana_url,
          api_key: apiKey,
          datasource_uid: config.datasource_uid
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.diagnosis) {
        setDiagnosis(data.diagnosis);
      } else {
        toast.error('Falha no diagnóstico');
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setDiagnosing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  // Show config warning if Grafana is not configured
  if (!configLoading && !isGrafanaConfigured) {
    return (
      <Alert variant="destructive" className="py-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">Configure a integração Grafana primeiro no Dashboard de Monitoramento.</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                !value && "text-muted-foreground"
              )}
              disabled={disabled || isLoading}
            >
              {selectedHost ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{selectedHost.host_display_name || selectedHost.host_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getHostIP(selectedHost)}
                  </Badge>
                </div>
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Buscar host..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : filteredHosts.length === 0 ? (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Nenhum host encontrado</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => syncHosts()}
                          disabled={isSyncing}
                        >
                          Sincronizar hosts
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={runDiagnosis}
                          disabled={diagnosing}
                        >
                          Diagnosticar
                        </Button>
                      </div>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredHosts.map((host) => {
                      const groups = (host.groups as any[]) || [];
                      return (
                        <CommandItem
                          key={host.host_id}
                          value={host.host_id}
                          onSelect={() => {
                            onChange(host.host_id, host);
                            setOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {host.host_display_name || host.host_name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{host.host_name}</span>
                              <span>•</span>
                              <span>{getHostIP(host)}</span>
                              {groups.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{groups[0]?.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={host.status === 'enabled' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {host.status === 'enabled' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Check
                              className={cn(
                                "h-4 w-4",
                                value === host.host_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
              
              {/* Footer with sync info */}
              <div className="border-t p-2 flex items-center justify-between bg-muted/50">
                <span className="text-xs text-muted-foreground">
                  {formatSyncTime()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hosts.length} host(s)
                </span>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => syncHosts()}
              disabled={isSyncing || disabled}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Sincronizar hosts do Zabbix
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={runDiagnosis}
              disabled={diagnosing || disabled}
            >
              {diagnosing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stethoscope className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Diagnosticar conexão Zabbix
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Diagnosis Dialog */}
      <Dialog open={diagnosisOpen} onOpenChange={setDiagnosisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Diagnóstico Zabbix/Grafana</DialogTitle>
            <DialogDescription>
              Análise detalhada da conexão com o Zabbix via Grafana
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {diagnosing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Executando diagnóstico...</span>
              </div>
            ) : diagnosis ? (
              <div className="space-y-4 pr-4">
                {/* Recommendation */}
                <Alert className={diagnosis.hostTest.status === 'ok' && diagnosis.hostTest.count && diagnosis.hostTest.count > 0 ? 'border-green-500' : 'border-yellow-500'}>
                  <AlertDescription className="font-medium">
                    {diagnosis.recommendation}
                  </AlertDescription>
                </Alert>

                {/* Grafana Status */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Grafana</h4>
                    {getStatusBadge(diagnosis.grafana.status)}
                  </div>
                  {diagnosis.grafana.version && (
                    <p className="text-sm text-muted-foreground">Versão: {diagnosis.grafana.version}</p>
                  )}
                  {diagnosis.grafana.error && (
                    <p className="text-sm text-destructive">{diagnosis.grafana.error}</p>
                  )}
                </div>

                {/* Datasource Status */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Datasource Zabbix</h4>
                    {getStatusBadge(diagnosis.datasource.status)}
                  </div>
                  {diagnosis.datasource.info && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Nome: {diagnosis.datasource.info.name}</p>
                      <p>Tipo: {diagnosis.datasource.info.type}</p>
                      <p>URL: {diagnosis.datasource.info.url}</p>
                      <p>Acesso: {diagnosis.datasource.info.access}</p>
                    </div>
                  )}
                  {diagnosis.datasource.error && (
                    <p className="text-sm text-destructive">{diagnosis.datasource.error}</p>
                  )}
                </div>

                {/* Zabbix API Status */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">API Zabbix</h4>
                    {getStatusBadge(diagnosis.zabbixApi.status)}
                  </div>
                  {diagnosis.zabbixApi.version && (
                    <p className="text-sm text-muted-foreground">Versão: {diagnosis.zabbixApi.version}</p>
                  )}
                  {diagnosis.zabbixApi.error && (
                    <p className="text-sm text-destructive">{diagnosis.zabbixApi.error}</p>
                  )}
                </div>

                {/* Host Test */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Teste de Hosts</h4>
                    {getStatusBadge(diagnosis.hostTest.status)}
                  </div>
                  {diagnosis.hostTest.count !== null && (
                    <p className="text-sm text-muted-foreground">Hosts encontrados: {diagnosis.hostTest.count}</p>
                  )}
                  {diagnosis.hostTest.sample && diagnosis.hostTest.sample.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Amostra:</p>
                      <div className="bg-muted rounded p-2 text-xs font-mono">
                        {diagnosis.hostTest.sample.map((h: any, i: number) => (
                          <div key={i}>{h.name || h.host} - {h.hostid}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {diagnosis.hostTest.error && (
                    <p className="text-sm text-destructive">{diagnosis.hostTest.error}</p>
                  )}
                </div>

                {/* Endpoints Detail */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Detalhes dos Endpoints</h4>
                  <div className="space-y-3">
                    {diagnosis.endpoints.map((ep: any, i: number) => (
                      <div key={i} className="text-xs border-b pb-2 last:border-b-0">
                        <p className="font-medium">{ep.name}</p>
                        <p className="text-muted-foreground truncate">{ep.url}</p>
                        <div className="flex gap-4 mt-1">
                          <span>Versão: {ep.versionTest?.status || 'N/A'}</span>
                          <span>Hosts: {ep.hostTest?.status || 'N/A'} {ep.hostTest?.count !== undefined ? `(${ep.hostTest.count})` : ''}</span>
                        </div>
                        {ep.hostTest?.error && (
                          <p className="text-destructive mt-1">{JSON.stringify(ep.hostTest.error)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Clique em Diagnosticar para analisar a conexão
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
