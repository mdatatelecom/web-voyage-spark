import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  device_id: string;
  hostname?: string;
  is_online?: boolean;
  interfaces_count?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { device_id, device_uuid } = await req.json();
    
    if (!device_id && !device_uuid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'device_id or device_uuid is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[sync-zabbix-data] Starting sync for device: ${device_id || device_uuid}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get device info
    const deviceQuery = supabase
      .from('monitored_devices')
      .select('*');
    
    if (device_uuid) {
      deviceQuery.eq('id', device_uuid);
    } else {
      deviceQuery.eq('device_id', device_id);
    }

    const { data: device, error: deviceError } = await deviceQuery.single();

    if (deviceError || !device) {
      console.error('[sync-zabbix-data] Device not found:', deviceError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Device not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Zabbix host ID
    const zabbixHostId = device.zabbix_host_id || device.grafana_host_id;
    if (!zabbixHostId) {
      console.error('[sync-zabbix-data] Device has no Zabbix host ID');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Device has no Zabbix host ID configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Grafana config
    const { data: configData } = await supabase
      .from('grafana_config')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!configData) {
      console.error('[sync-zabbix-data] Grafana config not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Grafana configuration not found' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get API key
    const { data: apiKeyData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grafana_api_key')
      .maybeSingle();

    const apiKey = (apiKeyData?.setting_value as { key?: string })?.key;
    if (!apiKey) {
      console.error('[sync-zabbix-data] Grafana API key not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Grafana API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const grafanaUrl = configData.grafana_url;
    const dsUid = configData.datasource_uid;
    const zabbixApiUrl = `${grafanaUrl}/api/datasources/uid/${dsUid}/resources/zabbix-api`;

    console.log(`[sync-zabbix-data] Fetching data for Zabbix host: ${zabbixHostId}`);

    // 1. Get host info from Zabbix
    const hostResponse = await fetch(zabbixApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'host.get',
        params: {
          output: ['hostid', 'host', 'name', 'status', 'available', 'snmp_available', 'description'],
          hostids: zabbixHostId,
          selectInterfaces: ['interfaceid', 'ip', 'dns', 'port', 'type', 'available', 'main'],
        },
        id: 1,
      }),
    });

    if (!hostResponse.ok) {
      const errorText = await hostResponse.text();
      console.error('[sync-zabbix-data] Failed to get host:', errorText);
      throw new Error(`Failed to get host from Zabbix: ${hostResponse.status}`);
    }

    const hostData = await hostResponse.json();
    const host = hostData.result?.[0];

    if (!host) {
      console.error('[sync-zabbix-data] Host not found in Zabbix');
      throw new Error('Host not found in Zabbix');
    }

    // Determine online status more accurately
    // status: 0=monitored (active), 1=unmonitored (disabled)
    // available: 0=unknown, 1=available, 2=unavailable
    // snmp_available: 0=unknown, 1=available, 2=unavailable
    const isMonitored = host.status === '0' || host.status === 0;
    const agentAvailable = host.available === '1' || host.available === 1;
    const snmpAvailable = host.snmp_available === '1' || host.snmp_available === 1;
    
    // If we successfully fetched data and the host is monitored, consider it online
    // This is more reliable than the available flags which may not be set correctly
    const isOnline = isMonitored; // If we can query data, the device is reachable
    
    const interfaces = host.interfaces || [];
    const mainInterface = interfaces.find((i: any) => i.main === '1') || interfaces[0];
    const ip = mainInterface?.ip || 'N/A';

    console.log(`[sync-zabbix-data] Host status - monitored: ${isMonitored}, agent: ${agentAvailable}, snmp: ${snmpAvailable}, online: ${isOnline}, IP: ${ip}`);

    // 2. Get interface names (ifDescr) to map interface indices to real names
    const ifNamesResponse = await fetch(zabbixApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.get',
        params: {
          output: ['itemid', 'name', 'key_', 'lastvalue'],
          hostids: zabbixHostId,
          search: { key_: 'ifDescr' },
          filter: { status: 0 },
          limit: 200,
        },
        id: 2,
      }),
    });

    // Build mapping of interface index to name
    const interfaceNameMap = new Map<string, string>();
    if (ifNamesResponse.ok) {
      const ifNamesData = await ifNamesResponse.json();
      const ifNameItems = ifNamesData.result || [];
      for (const item of ifNameItems) {
        // key_ format: ifDescr.10 -> index 10, value is the name
        const match = item.key_.match(/ifDescr\.(\d+)/);
        if (match && item.lastvalue) {
          interfaceNameMap.set(match[1], item.lastvalue);
        }
      }
      console.log(`[sync-zabbix-data] Found ${interfaceNameMap.size} interface names`);
    }

    // 3. Get network interfaces (items with net.if.* or ifHC*)
    const interfacesResponse = await fetch(zabbixApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.get',
        params: {
          output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock'],
          hostids: zabbixHostId,
          search: { key_: 'if' }, // Match ifHCInOctets, ifOperStatus, etc.
          filter: { status: 0 },
          limit: 500,
        },
        id: 3,
      }),
    });

    let networkItems: any[] = [];
    if (interfacesResponse.ok) {
      const interfacesData = await interfacesResponse.json();
      networkItems = interfacesData.result || [];
      console.log(`[sync-zabbix-data] Found ${networkItems.length} network interface items`);
    }

    // 3. Get system info (uptime, CPU, memory)
    const systemResponse = await fetch(zabbixApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.get',
        params: {
          output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock'],
          hostids: zabbixHostId,
          search: { key_: 'system' },
          filter: { status: 0 },
          limit: 100,
        },
        id: 3,
      }),
    });

    let systemItems: any[] = [];
    let uptimeRaw = '';
    if (systemResponse.ok) {
      const systemData = await systemResponse.json();
      systemItems = systemData.result || [];
      
      // Find uptime item
      const uptimeItem = systemItems.find((i: any) => 
        i.key_.includes('system.uptime') || i.key_.includes('sysUpTime')
      );
      if (uptimeItem) {
        uptimeRaw = uptimeItem.lastvalue;
      }
      console.log(`[sync-zabbix-data] Found ${systemItems.length} system items, uptime: ${uptimeRaw}`);
    }

    // 4. Update device info in database
    // ALWAYS update last_seen - it represents last sync attempt, not last online time
    const updateData: any = {
      status: isOnline ? 'online' : 'offline',
      last_seen: new Date().toISOString(), // Always update - indicates last check
      hostname: host.name || host.host || device.hostname,
      ip_address: ip !== 'N/A' ? ip : device.ip_address,
      uptime_raw: uptimeRaw || device.uptime_raw,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('monitored_devices')
      .update(updateData)
      .eq('id', device.id);

    if (updateError) {
      console.error('[sync-zabbix-data] Failed to update device:', updateError);
    } else {
      console.log('[sync-zabbix-data] Device updated successfully');
    }

    // 5. Save uptime history
    const { error: uptimeError } = await supabase
      .from('device_uptime_history')
      .insert({
        device_uuid: device.id,
        is_online: isOnline,
        uptime_raw: uptimeRaw || null,
        collected_at: new Date().toISOString(),
      });

    if (uptimeError) {
      console.error('[sync-zabbix-data] Failed to save uptime history:', uptimeError);
    }

    // 6. Process and save network interfaces
    const interfaceMap = new Map<string, any>();
    
    for (const item of networkItems) {
      // Extract interface index from key like ifHCInOctets.10 or net.if.in[eth0]
      let ifIndex: string | null = null;
      let ifName: string | null = null;
      
      // Try ifHCInOctets.X / ifHCOutOctets.X format
      const snmpMatch = item.key_.match(/if(?:HC)?(?:In|Out)Octets\.(\d+)/);
      if (snmpMatch) {
        ifIndex = snmpMatch[1];
        // Get the real name from the map, fallback to a readable format
        ifName = interfaceNameMap.get(ifIndex!) || `Interface ${ifIndex}`;
      }
      
      // Try ifOperStatus.X format for status
      const statusMatch = item.key_.match(/ifOperStatus\.(\d+)/);
      if (statusMatch) {
        ifIndex = statusMatch[1];
        ifName = interfaceNameMap.get(ifIndex!) || `Interface ${ifIndex}`;
      }
      
      // Try net.if.in[eth0] format
      const netMatch = item.key_.match(/net\.if\.[^[]+\[([^\]]+)/);
      if (netMatch) {
        ifName = netMatch[1].split(',')[0];
      }
      
      if (!ifName) continue;
      
      if (!interfaceMap.has(ifName)) {
        interfaceMap.set(ifName, {
          interface_name: ifName,
          rx_bytes: null,
          tx_bytes: null,
          status: 'up',
          speed: null,
        });
      }
      
      const ifData = interfaceMap.get(ifName);
      if (item.key_.includes('InOctets') || item.key_.includes('.in[')) {
        ifData.rx_bytes = parseInt(item.lastvalue) || 0;
      } else if (item.key_.includes('OutOctets') || item.key_.includes('.out[')) {
        ifData.tx_bytes = parseInt(item.lastvalue) || 0;
      } else if (item.key_.includes('OperStatus') || item.key_.includes('.status')) {
        // ifOperStatus: 1=up, 2=down, 3=testing, etc.
        ifData.status = item.lastvalue === '1' || item.lastvalue === 'up' ? 'up' : 'down';
      } else if (item.key_.includes('.speed') || item.key_.includes('Speed')) {
        ifData.speed = item.lastvalue;
      }
    }

    // Upsert interfaces
    const interfacesToSave = Array.from(interfaceMap.values());
    let savedInterfaces = 0;

    for (const iface of interfacesToSave) {
      const { error: ifError } = await supabase
        .from('monitored_interfaces')
        .upsert({
          device_uuid: device.id,
          interface_name: iface.interface_name,
          status: iface.status,
          rx_bytes: iface.rx_bytes,
          tx_bytes: iface.tx_bytes,
          speed: iface.speed,
          is_monitored: true,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'device_uuid,interface_name',
        });

      if (!ifError) {
        savedInterfaces++;
      } else {
        console.error(`[sync-zabbix-data] Failed to save interface ${iface.interface_name}:`, ifError);
      }
    }

    console.log(`[sync-zabbix-data] Saved ${savedInterfaces} interfaces`);

    // 7. Save metrics to snmp_metrics table
    const allItems = [...networkItems, ...systemItems];
    let savedMetrics = 0;

    for (const item of allItems.slice(0, 100)) { // Limit to 100 metrics
      const { error: metricError } = await supabase
        .from('snmp_metrics')
        .insert({
          device_uuid: device.id,
          oid: item.key_,
          oid_name: item.name,
          value: item.lastvalue,
          category: item.key_.startsWith('net.if') ? 'network' : 
                   item.key_.startsWith('system') ? 'system' : 'other',
          collected_at: new Date(parseInt(item.lastclock) * 1000).toISOString(),
        });

      if (!metricError) {
        savedMetrics++;
      }
    }

    console.log(`[sync-zabbix-data] Saved ${savedMetrics} metrics`);

    const duration = Date.now() - startTime;
    console.log(`[sync-zabbix-data] Sync completed in ${duration}ms`);

    const result: SyncResult = {
      success: true,
      device_id: device.device_id,
      hostname: host.name || host.host,
      is_online: isOnline,
      interfaces_count: savedInterfaces,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-zabbix-data] Error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
