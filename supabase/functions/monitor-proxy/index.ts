import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviceData {
  hostname: string;
  vendor: string;
  model: string;
  uptime: string;
  status: string;
  collected_at: string;
}

interface InterfaceData {
  name: string;
  type: string;
  status: string;
  rx_bytes: number;
  tx_bytes: number;
  speed: string;
  mac_address: string;
}

interface VlanData {
  vlan_id: number;
  name: string;
  interfaces: string[];
}

interface ApiResponse {
  device: DeviceData;
  interfaces: InterfaceData[];
  vlans: VlanData[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { device_id, api_token, action } = await req.json();

    if (!device_id) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dispositivo do banco
    const { data: deviceData } = await supabase
      .from('monitored_devices')
      .select('id, api_token, ip_address, protocol')
      .eq('device_id', device_id)
      .single();

    const token = api_token || deviceData?.api_token;
    const deviceUuid = deviceData?.id || null;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'API token not found for device' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir URL dinâmica baseada nos dados do dispositivo
    const protocol = deviceData?.protocol || 'http';
    const ipAddress = deviceData?.ip_address || '86.48.3.172:3000';
    const apiUrl = `${protocol}://${ipAddress}/api/monitor/${device_id}`;
    
    console.log(`Device config: protocol=${protocol}, ip=${ipAddress}`);
    const startTime = Date.now();

    console.log(`Fetching data from: ${apiUrl}`);

    // Chamar API externa com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let apiResponse: Response;
    let isOnline = false;
    let responseData: ApiResponse | null = null;

    try {
      apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (apiResponse.ok) {
        responseData = await apiResponse.json();
        isOnline = true;
        console.log(`Device ${device_id} is online. Response time: ${responseTime}ms`);

        // Atualizar dispositivo no banco
        if (deviceUuid) {
          await supabase
            .from('monitored_devices')
            .update({
              status: 'online',
              last_seen: new Date().toISOString(),
              hostname: responseData?.device?.hostname,
              vendor: responseData?.device?.vendor,
              model: responseData?.device?.model,
              uptime_raw: responseData?.device?.uptime,
            })
            .eq('id', deviceUuid);

          // Inserir histórico
          await supabase
            .from('device_uptime_history')
            .insert({
              device_uuid: deviceUuid,
              is_online: true,
              uptime_raw: responseData?.device?.uptime,
              response_time_ms: responseTime,
            });

          // Atualizar interfaces
          if (responseData?.interfaces) {
            for (const iface of responseData.interfaces) {
              await supabase
                .from('monitored_interfaces')
                .upsert({
                  device_uuid: deviceUuid,
                  interface_name: iface.name,
                  interface_type: iface.type || 'ethernet',
                  status: iface.status || 'unknown',
                  rx_bytes: iface.rx_bytes || 0,
                  tx_bytes: iface.tx_bytes || 0,
                  speed: iface.speed,
                  mac_address: iface.mac_address,
                  last_updated: new Date().toISOString(),
                }, {
                  onConflict: 'device_uuid,interface_name',
                });
            }
          }

          // Atualizar VLANs
          if (responseData?.vlans) {
            for (const vlan of responseData.vlans) {
              await supabase
                .from('monitored_vlans')
                .upsert({
                  device_uuid: deviceUuid,
                  vlan_id: vlan.vlan_id,
                  vlan_name: vlan.name,
                  interfaces: vlan.interfaces || [],
                  last_updated: new Date().toISOString(),
                }, {
                  onConflict: 'device_uuid,vlan_id',
                });
            }
          }
        }
      } else {
        console.error(`API returned status: ${apiResponse.status}`);
        isOnline = false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`Failed to fetch device ${device_id}:`, fetchError);
      isOnline = false;

      // Registrar como offline
      if (deviceUuid) {
        await supabase
          .from('monitored_devices')
          .update({ status: 'offline' })
          .eq('id', deviceUuid);

        await supabase
          .from('device_uptime_history')
          .insert({
            device_uuid: deviceUuid,
            is_online: false,
            response_time_ms: null,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_online: isOnline,
        device: responseData?.device || null,
        interfaces: responseData?.interfaces || [],
        vlans: responseData?.vlans || [],
        collected_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monitor-proxy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
