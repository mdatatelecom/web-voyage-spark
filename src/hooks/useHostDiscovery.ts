import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiscoveredHost {
  host: string;
  status?: string;
  lastSeen?: string;
}

export interface ServerTestResult {
  success: boolean;
  message: string;
  hosts?: DiscoveredHost[];
}

export function useHostDiscovery() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);

  const testServerConnection = async (
    serverAddress: string,
    apiToken: string
  ): Promise<ServerTestResult> => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-proxy', {
        body: {
          action: 'test-server',
          server_address: serverAddress,
          api_token: apiToken,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: data?.success ?? false,
        message: data?.message ?? 'Conexão testada',
      };
    } catch (err) {
      return { success: false, message: 'Erro ao testar conexão' };
    } finally {
      setIsTesting(false);
    }
  };

  const discoverHosts = async (
    serverAddress: string,
    apiToken: string
  ): Promise<DiscoveredHost[]> => {
    setIsDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-proxy', {
        body: {
          action: 'discover',
          server_address: serverAddress,
          api_token: apiToken,
        },
      });

      if (error) {
        toast.error(`Erro ao descobrir hosts: ${error.message}`);
        return [];
      }

      const hosts = data?.hosts || [];
      setDiscoveredHosts(hosts);
      
      if (hosts.length === 0) {
        toast.info('Nenhum host encontrado no servidor');
      } else {
        toast.success(`${hosts.length} host(s) encontrado(s)`);
      }
      
      return hosts;
    } catch (err) {
      toast.error('Erro ao descobrir hosts');
      return [];
    } finally {
      setIsDiscovering(false);
    }
  };

  const testHost = async (
    serverAddress: string,
    apiToken: string,
    host: string
  ): Promise<ServerTestResult> => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-proxy', {
        body: {
          action: 'test-host',
          server_address: serverAddress,
          api_token: apiToken,
          host,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: data?.success ?? false,
        message: data?.message ?? 'Host testado',
      };
    } catch (err) {
      return { success: false, message: 'Erro ao testar host' };
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isDiscovering,
    isTesting,
    discoveredHosts,
    testServerConnection,
    discoverHosts,
    testHost,
    clearHosts: () => setDiscoveredHosts([]),
  };
}
