import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  device_id: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();
  const results: SyncResult[] = [];
  let triggeredBy = 'manual';

  try {
    // Parse request body if present
    try {
      const body = await req.json();
      triggeredBy = body.triggered_by || 'manual';
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`[sync-all-devices] Starting sync, triggered by: ${triggeredBy}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active devices
    const { data: devices, error: fetchError } = await supabase
      .from('monitored_devices')
      .select('id, device_id, hostname, is_active, server_address, api_token, data_source_type')
      .eq('is_active', true);

    if (fetchError) {
      console.error('[sync-all-devices] Error fetching devices:', fetchError);
      throw new Error(`Failed to fetch devices: ${fetchError.message}`);
    }

    if (!devices || devices.length === 0) {
      console.log('[sync-all-devices] No active devices found');
      
      // Log sync completion
      await supabase.from('sync_logs').insert({
        triggered_by: triggeredBy,
        devices_synced: 0,
        devices_failed: 0,
        success: true,
        details: { message: 'No active devices to sync' },
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'No active devices to sync', synced: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-all-devices] Found ${devices.length} active devices`);

    // Process devices in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (device) => {
        try {
          console.log(`[sync-all-devices] Syncing device: ${device.hostname || device.device_id}`);

          // For Grafana/Zabbix devices, use sync-zabbix-data function
          if (device.data_source_type === 'grafana' || device.data_source_type === 'zabbix') {
            console.log(`[sync-all-devices] Device ${device.device_id} uses ${device.data_source_type}, calling sync-zabbix-data`);
            
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-zabbix-data', {
              body: { device_id: device.device_id }
            });

            if (syncError) {
              console.error(`[sync-all-devices] Error syncing Zabbix device ${device.device_id}:`, syncError);
              results.push({ 
                device_id: device.device_id, 
                success: false, 
                error: syncError.message 
              });
            } else {
              console.log(`[sync-all-devices] Zabbix sync result for ${device.device_id}:`, syncResult);
              results.push({ 
                device_id: device.device_id, 
                success: syncResult?.success || false,
                error: syncResult?.error
              });
            }
            return;
          }

          // Skip devices without server_address or api_token
          if (!device.server_address || !device.api_token) {
            console.log(`[sync-all-devices] Device ${device.device_id} missing server_address or api_token, skipping`);
            results.push({ device_id: device.device_id, success: true });
            return;
          }

          // Call monitor-proxy to collect data for this device
          const { error: invokeError } = await supabase.functions.invoke('monitor-proxy', {
            body: { 
              device_id: device.device_id, 
              action: 'collect' 
            }
          });

          if (invokeError) {
            console.error(`[sync-all-devices] Error syncing device ${device.device_id}:`, invokeError);
            results.push({ 
              device_id: device.device_id, 
              success: false, 
              error: invokeError.message 
            });
          } else {
            console.log(`[sync-all-devices] Successfully synced device: ${device.device_id}`);
            results.push({ device_id: device.device_id, success: true });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[sync-all-devices] Exception syncing device ${device.device_id}:`, err);
          results.push({ 
            device_id: device.device_id, 
            success: false, 
            error: errorMessage 
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < devices.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const completedAt = new Date();
    const duration = completedAt.getTime() - startTime.getTime();

    console.log(`[sync-all-devices] Sync completed. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}ms`);

    // Log sync completion
    const { error: logError } = await supabase.from('sync_logs').insert({
      triggered_by: triggeredBy,
      devices_synced: successCount,
      devices_failed: failedCount,
      success: failedCount === 0,
      details: {
        total_devices: devices.length,
        duration_ms: duration,
        results: results.filter(r => !r.success), // Only log failures for debugging
      },
      completed_at: completedAt.toISOString(),
    });

    if (logError) {
      console.error('[sync-all-devices] Error logging sync result:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        synced: successCount,
        failed: failedCount,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-all-devices] Fatal error:', error);

    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('sync_logs').insert({
        triggered_by: triggeredBy,
        devices_synced: results.filter(r => r.success).length,
        devices_failed: results.filter(r => !r.success).length,
        success: false,
        error_message: errorMessage,
        details: { results },
        completed_at: new Date().toISOString(),
      });
    } catch {
      console.error('[sync-all-devices] Failed to log error to database');
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
