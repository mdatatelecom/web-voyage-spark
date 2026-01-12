import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SyncResult {
  device_id: string;
  success: boolean;
  is_online: boolean;
  error?: string;
}

export function useDeviceBatchSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const queryClient = useQueryClient();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncDevice = async (device: { device_id: string; is_active: boolean; data_source_type?: string | null; api_token?: string | null }): Promise<SyncResult> => {
    if (!device.is_active) {
      return { device_id: device.device_id, success: true, is_online: false };
    }

    if (!device.device_id) {
      console.warn('Device missing device_id, skipping');
      return { device_id: 'unknown', success: false, is_online: false, error: 'Missing device_id' };
    }

    // Skip Grafana/Zabbix devices - they use a different sync mechanism
    if (device.data_source_type === 'grafana' || device.data_source_type === 'zabbix') {
      console.log(`Skipping SNMP sync for ${device.device_id} (uses ${device.data_source_type})`);
      return { device_id: device.device_id, success: true, is_online: true };
    }

    // Skip devices without API token (they can't be synced via SNMP)
    if (!device.api_token) {
      console.warn(`Device ${device.device_id} has no API token, skipping SNMP sync`);
      return { device_id: device.device_id, success: true, is_online: false };
    }

    try {
      console.log(`Syncing SNMP device: ${device.device_id}`);
      
      const { data, error } = await supabase.functions.invoke('monitor-proxy', {
        body: { device_id: device.device_id, action: 'collect' }
      });

      if (error) {
        console.error(`Sync failed for ${device.device_id}:`, error);
        return { device_id: device.device_id, success: false, is_online: false, error: error.message };
      }

      console.log(`Sync result for ${device.device_id}:`, data);
      return {
        device_id: device.device_id,
        success: true,
        is_online: data?.is_online || false
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Sync error for ${device.device_id}:`, errorMsg);
      return { device_id: device.device_id, success: false, is_online: false, error: errorMsg };
    }
  };

  const syncAllDevices = useCallback(async (showToast = true) => {
    setIsSyncing(true);

    try {
      // Buscar dispositivos ativos com informações de tipo
      const { data: devices, error } = await supabase
        .from('monitored_devices')
        .select('device_id, is_active, data_source_type, api_token')
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch devices:', error);
        if (showToast) toast.error('Erro ao buscar dispositivos');
        return;
      }

      if (!devices || devices.length === 0) {
        if (showToast) toast.info('Nenhum dispositivo ativo para sincronizar');
        setIsSyncing(false);
        return;
      }

      // Sincronizar todos em paralelo (máximo 5 simultâneos)
      const results: SyncResult[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < devices.length; i += batchSize) {
        const batch = devices.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(syncDevice));
        results.push(...batchResults);
      }

      setSyncResults(results);
      setLastSyncTime(new Date());

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['monitored-devices'] });

      const onlineCount = results.filter(r => r.is_online).length;
      const failedCount = results.filter(r => !r.success).length;

      if (showToast) {
        if (failedCount > 0) {
          toast.warning(`Sincronização concluída: ${onlineCount}/${devices.length} online, ${failedCount} falhas`);
        } else {
          toast.success(`Sincronização concluída: ${onlineCount}/${devices.length} online`);
        }
      }
    } catch (err) {
      console.error('Batch sync error:', err);
      if (showToast) toast.error('Erro ao sincronizar dispositivos');
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  const startAutoSync = useCallback((intervalMs = 60000) => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Primeira sincronização
    syncAllDevices(false);

    // Configurar intervalo
    syncIntervalRef.current = setInterval(() => {
      syncAllDevices(false);
    }, intervalMs);
  }, [syncAllDevices]);

  const stopAutoSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    syncResults,
    syncAllDevices,
    startAutoSync,
    stopAutoSync
  };
}
