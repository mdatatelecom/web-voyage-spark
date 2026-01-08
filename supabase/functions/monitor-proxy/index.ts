import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Estrutura da resposta real da API /metrics/:host
interface MetricsResponse {
  host: string;
  data: {
    interfaces: Array<{ oid: string; value: string }>;
    cpu: Array<{ oid: string; value: string }>;
    memoria: Array<{ oid: string; value: string }>;
    trafego: Array<{ oid: string; value: string }>;
    outros: Array<{ oid: string; value: string }>;
  };
}

// Estrutura da resposta /status
interface StatusResponse {
  status: string;
  hosts_monitored: number;
  last_update: string;
}

// Estrutura da resposta /hosts
interface HostsResponse {
  hosts: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { device_id, api_token, action, server_address, host } = body;

    // ========== DIRECT SERVER ACTIONS (without device lookup) ==========
    
    // Test server connection
    if (action === 'test-server' && server_address) {
      try {
        const cleanAddress = server_address.replace(/^https?:\/\//, '');
        const testUrl = `http://${cleanAddress}/status`;
        
        console.log('Testing server connection:', testUrl);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(testUrl, {
          headers: body.api_token ? { 'Authorization': body.api_token } : {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        
        return new Response(JSON.stringify({
          success: response.ok,
          message: response.ok ? 'Servidor conectado' : `Erro: ${response.status}`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({
          success: false,
          message: errorMsg.includes('abort') ? 'Timeout na conexão' : 'Falha ao conectar',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Discover hosts
    if (action === 'discover' && server_address) {
      try {
        const cleanAddress = server_address.replace(/^https?:\/\//, '');
        const hostsUrl = `http://${cleanAddress}/hosts`;
        
        console.log('Discovering hosts at:', hostsUrl);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(hostsUrl, {
          headers: body.api_token ? { 'Authorization': body.api_token } : {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
          console.log('Hosts endpoint returned:', response.status);
          return new Response(JSON.stringify({
            success: false,
            hosts: [],
            message: `Endpoint /hosts retornou ${response.status}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const data = await response.json();
        console.log('Hosts response:', data);
        
        // Handle different response formats
        let hosts: Array<{ host: string; status?: string }> = [];
        if (Array.isArray(data)) {
          hosts = data.map((h: unknown) => typeof h === 'string' ? { host: h } : h as { host: string });
        } else if (data.hosts && Array.isArray(data.hosts)) {
          hosts = data.hosts.map((h: unknown) => typeof h === 'string' ? { host: h } : h as { host: string });
        }
        
        return new Response(JSON.stringify({
          success: true,
          hosts,
          message: `${hosts.length} host(s) encontrado(s)`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Discover error:', errorMsg);
        return new Response(JSON.stringify({
          success: false,
          hosts: [],
          message: errorMsg.includes('abort') ? 'Timeout' : 'Erro ao descobrir hosts',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Test specific host
    if (action === 'test-host' && server_address && host) {
      try {
        const cleanAddress = server_address.replace(/^https?:\/\//, '');
        const testUrl = `http://${cleanAddress}/metrics/${host}`;
        
        console.log('Testing host:', testUrl);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(testUrl, {
          headers: body.api_token ? { 'Authorization': body.api_token } : {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        
        return new Response(JSON.stringify({
          success: response.ok,
          message: response.ok ? 'Host respondendo' : `Host não encontrado (${response.status})`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({
          success: false,
          message: errorMsg.includes('abort') ? 'Timeout' : 'Erro ao testar host',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ========== DEVICE-BASED ACTIONS ==========
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!device_id && action !== 'status') {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dispositivo do banco
    const { data: deviceData } = await supabase
      .from('monitored_devices')
      .select('id, api_token, ip_address, protocol, server_address, monitored_host')
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

    // Configurar endereços - agora separamos servidor da API e host monitorado
    const protocol = deviceData?.protocol || 'http';
    const serverAddress = deviceData?.server_address || '86.48.3.172:3000';
    const monitoredHost = deviceData?.monitored_host || deviceData?.ip_address;

    console.log(`Device config: protocol=${protocol}, server=${serverAddress}, host=${monitoredHost}`);

    // ========== ACTION: STATUS ==========
    if (action === 'status') {
      const statusUrl = `${protocol}://${serverAddress}/status`;
      console.log(`Checking API status: ${statusUrl}`);

      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Authorization': token },
        });

        if (response.ok) {
          const statusData: StatusResponse = await response.json();
          return new Response(
            JSON.stringify({ success: true, ...statusData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'API offline', status: response.status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Status check failed:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to connect to API' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== ACTION: DISCOVER ==========
    if (action === 'discover') {
      const hostsUrl = `${protocol}://${serverAddress}/hosts`;
      console.log(`Discovering hosts: ${hostsUrl}`);

      try {
        const response = await fetch(hostsUrl, {
          method: 'GET',
          headers: { 'Authorization': token },
        });

        if (response.ok) {
          const hostsData: HostsResponse = await response.json();
          return new Response(
            JSON.stringify({ success: true, hosts: hostsData.hosts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to get hosts', status: response.status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Host discovery failed:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to connect to API' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== ACTION: COLLECT (default) ==========
    // Endpoint correto: GET /metrics/:host
    const apiUrl = `${protocol}://${serverAddress}/metrics/${monitoredHost}`;
    const startTime = Date.now();

    console.log(`Fetching metrics from: ${apiUrl}`);

    // Chamar API externa com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let isOnline = false;
    let responseData: MetricsResponse | null = null;

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (apiResponse.ok) {
        responseData = await apiResponse.json();
        isOnline = true;
        console.log(`Device ${device_id} (host: ${monitoredHost}) is online. Response time: ${responseTime}ms`);

        // Atualizar dispositivo no banco
        if (deviceUuid) {
          await supabase
            .from('monitored_devices')
            .update({
              status: 'online',
              last_seen: new Date().toISOString(),
            })
            .eq('id', deviceUuid);

          // Inserir histórico de uptime
          await supabase
            .from('device_uptime_history')
            .insert({
              device_uuid: deviceUuid,
              is_online: true,
              response_time_ms: responseTime,
            });

          // Processar e armazenar métricas SNMP
          if (responseData?.data) {
            const metricsToInsert = [];
            const categories = ['interfaces', 'cpu', 'memoria', 'trafego', 'outros'] as const;

            for (const category of categories) {
              const items = responseData.data[category] || [];
              for (const item of items) {
                metricsToInsert.push({
                  device_uuid: deviceUuid,
                  oid: item.oid,
                  value: item.value,
                  category: category,
                  collected_at: new Date().toISOString(),
                });
              }
            }

            // Inserir métricas em lote
            if (metricsToInsert.length > 0) {
              const { error: metricsError } = await supabase
                .from('snmp_metrics')
                .insert(metricsToInsert);

              if (metricsError) {
                console.error('Error inserting SNMP metrics:', metricsError);
              } else {
                console.log(`Inserted ${metricsToInsert.length} SNMP metrics`);
              }
            }

            // Calcular contagem de interfaces para referência
            const interfaceCount = responseData.data.interfaces?.length || 0;
            console.log(`Found ${interfaceCount} interface OIDs`);
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
        host: responseData?.host || monitoredHost,
        data: responseData?.data || null,
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
