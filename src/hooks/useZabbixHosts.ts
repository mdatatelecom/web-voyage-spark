import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGrafanaConfig } from './useGrafanaConfig';

export interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  description?: string;
  groups?: { groupid: string; name: string }[];
  interfaces?: { interfaceid: string; ip: string; dns: string; port: string; type: string }[];
}

export interface CachedZabbixHost {
  id: string;
  host_id: string;
  host_name: string;
  host_display_name: string | null;
  groups: any;
  interfaces: any;
  status: string;
  last_synced: string;
  created_at: string;
}

export function useZabbixHosts() {
  const queryClient = useQueryClient();
  const { config } = useGrafanaConfig();

  // Get cached hosts from database
  const { data: cachedHosts, isLoading: cacheLoading } = useQuery({
    queryKey: ['zabbix-hosts-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zabbix_hosts_cache')
        .select('*')
        .order('host_name');

      if (error) throw error;
      return data as CachedZabbixHost[];
    },
  });

  const getApiKey = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grafana_api_key')
      .maybeSingle();
    
    const settingValue = data?.setting_value as Record<string, unknown> | null;
    return (settingValue?.key as string) || null;
  };

  // Sync hosts from Zabbix via Grafana
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!config) throw new Error('Grafana não configurado');
      
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('API Key do Grafana não configurada');

      const response = await supabase.functions.invoke('grafana-proxy', {
        body: {
          action: 'zabbix-hosts',
          grafana_url: config.grafana_url,
          api_key: apiKey,
          datasource_uid: config.datasource_uid,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      const hosts: ZabbixHost[] = response.data.data || [];
      
      // Update cache
      for (const host of hosts) {
        const { error } = await supabase
          .from('zabbix_hosts_cache')
          .upsert({
            host_id: host.hostid,
            host_name: host.host,
            host_display_name: host.name,
            groups: host.groups || [],
            interfaces: host.interfaces || [],
            status: host.status === '0' ? 'enabled' : 'disabled',
            last_synced: new Date().toISOString(),
          }, {
            onConflict: 'host_id',
          });

        if (error) {
          console.error('Error caching host:', error);
        }
      }

      return hosts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['zabbix-hosts-cache'] });
      toast.success(`${count} hosts sincronizados do Zabbix`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar hosts: ${error.message}`);
    },
  });

  // Search hosts (uses cache first, then API if needed)
  const searchHosts = async (searchTerm: string): Promise<CachedZabbixHost[]> => {
    if (!searchTerm) return cachedHosts || [];
    
    const term = searchTerm.toLowerCase();
    return (cachedHosts || []).filter(host => 
      host.host_name.toLowerCase().includes(term) ||
      host.host_display_name?.toLowerCase().includes(term)
    );
  };

  // Get host by ID
  const getHostById = (hostId: string): CachedZabbixHost | undefined => {
    return cachedHosts?.find(h => h.host_id === hostId);
  };

  return {
    hosts: cachedHosts || [],
    isLoading: cacheLoading,
    syncHosts: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    searchHosts,
    getHostById,
    lastSyncTime: cachedHosts?.[0]?.last_synced,
  };
}
