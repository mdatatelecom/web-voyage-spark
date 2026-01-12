import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GrafanaConfig {
  grafana_url: string;
  grafana_org_id: number;
  datasource_name: string;
  datasource_uid: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, grafana_url, api_key, datasource_uid, host_id, zabbix_host_id, query } = await req.json();

    console.log(`Grafana proxy action: ${action}`);

    // For actions that need config from database
    const getConfigAndApiKey = async () => {
      // Get Grafana config from database
      const { data: configData } = await supabase
        .from('grafana_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!configData) {
        throw new Error('Grafana configuration not found');
      }

      // Get API key from system_settings
      const { data: apiKeyData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'grafana_api_key')
        .maybeSingle();

      const apiKeyValue = (apiKeyData?.setting_value as { key?: string })?.key;
      if (!apiKeyValue) {
        throw new Error('Grafana API key not configured');
      }

      return { config: configData, apiKey: apiKeyValue };
    };

    switch (action) {
      case 'get-host-status': {
        // Get host status from Zabbix via Grafana - uses stored config
        const hostId = zabbix_host_id || host_id;
        if (!hostId) {
          return new Response(JSON.stringify({ 
            success: false, 
            is_online: false,
            device: null,
            collected_at: new Date().toISOString(),
            error: 'zabbix_host_id is required' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const { config, apiKey: storedApiKey } = await getConfigAndApiKey();
          const grafanaUrl = config.grafana_url;
          const dsUid = config.datasource_uid;

          // Get host info from Zabbix
          const hostResponse = await fetch(`${grafanaUrl}/api/datasources/uid/${dsUid}/resources/zabbix-api`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${storedApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status', 'available', 'snmp_available', 'description'],
                hostids: hostId,
                selectInterfaces: ['ip', 'type', 'available'],
              },
              id: 1,
            }),
          });

          if (!hostResponse.ok) {
            console.error('Failed to get host status:', hostResponse.status);
            return new Response(JSON.stringify({ 
              success: false, 
              is_online: false,
              device: null,
              collected_at: new Date().toISOString(),
              error: `Grafana error: ${hostResponse.status}` 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const hostData = await hostResponse.json();
          const host = hostData.result?.[0];

          if (!host) {
            return new Response(JSON.stringify({ 
              success: false, 
              is_online: false,
              device: null,
              collected_at: new Date().toISOString(),
              error: 'Host not found in Zabbix' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Determine online status
          // available: 0=unknown, 1=available, 2=unavailable
          // snmp_available: same
          // status: 0=monitored, 1=unmonitored
          const isOnline = host.available === '1' || host.snmp_available === '1';
          const interfaces = host.interfaces || [];
          const ip = interfaces.find((i: any) => i.ip)?.ip || 'N/A';

          return new Response(JSON.stringify({ 
            success: true, 
            is_online: isOnline,
            device: {
              hostname: host.name || host.host,
              vendor: 'Zabbix',
              model: host.description || 'Unknown',
              uptime: 'N/A',
              status: isOnline ? 'online' : 'offline',
              ip_address: ip,
              collected_at: new Date().toISOString(),
            },
            collected_at: new Date().toISOString(),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('Error getting host status:', errorMsg);
          return new Response(JSON.stringify({ 
            success: false, 
            is_online: false,
            device: null,
            collected_at: new Date().toISOString(),
            error: errorMsg 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'test-connection': {
        // Test connection to Grafana
        const response = await fetch(`${grafana_url}/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Grafana connection failed:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Connection failed: ${response.status} ${response.statusText}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const health = await response.json();
        console.log('Grafana health check:', health);

        return new Response(JSON.stringify({ 
          success: true, 
          data: health 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'diagnose': {
        // Comprehensive Zabbix integration diagnosis
        console.log('=== Starting Zabbix Integration Diagnosis ===');
        const diagnosis = {
          grafana: { status: 'unknown', version: null as string | null, error: null as string | null },
          datasource: { status: 'unknown', info: null as any, error: null as string | null },
          zabbixApi: { status: 'unknown', version: null as string | null, error: null as string | null },
          hostTest: { status: 'unknown', count: null as number | null, sample: [] as any[], error: null as string | null },
          endpoints: [] as any[],
          recommendation: ''
        };

        // 1. Test Grafana connection
        try {
          console.log(`Testing Grafana at: ${grafana_url}`);
          const healthRes = await fetch(`${grafana_url}/api/health`, {
            headers: { 'Authorization': `Bearer ${api_key}` }
          });
          if (healthRes.ok) {
            const healthData = await healthRes.json();
            diagnosis.grafana = { status: 'ok', version: healthData.version || 'unknown', error: null };
            console.log('Grafana OK:', JSON.stringify(healthData));
          } else {
            const errorText = await healthRes.text();
            diagnosis.grafana = { status: 'error', version: null, error: `HTTP ${healthRes.status}: ${errorText.substring(0, 100)}` };
            console.error('Grafana health failed:', errorText);
          }
        } catch (err) {
          diagnosis.grafana = { status: 'error', version: null, error: (err as Error).message };
          console.error('Grafana connection error:', err);
        }

        // 2. Get datasource info
        try {
          console.log(`Getting datasource info: ${datasource_uid}`);
          const dsRes = await fetch(`${grafana_url}/api/datasources/uid/${datasource_uid}`, {
            headers: { 'Authorization': `Bearer ${api_key}` }
          });
          if (dsRes.ok) {
            const dsData = await dsRes.json();
            diagnosis.datasource = { 
              status: 'ok', 
              info: {
                name: dsData.name,
                type: dsData.type,
                url: dsData.url,
                access: dsData.access,
                basicAuth: dsData.basicAuth,
                jsonData: dsData.jsonData ? Object.keys(dsData.jsonData) : []
              }, 
              error: null 
            };
            console.log('Datasource info:', JSON.stringify(dsData));
          } else {
            const errorText = await dsRes.text();
            diagnosis.datasource = { status: 'error', info: null, error: `HTTP ${dsRes.status}: ${errorText.substring(0, 100)}` };
            console.error('Datasource fetch failed:', errorText);
          }
        } catch (err) {
          diagnosis.datasource = { status: 'error', info: null, error: (err as Error).message };
          console.error('Datasource error:', err);
        }

        // 3. Test Zabbix API version via different endpoints
        const endpoints = [
          { 
            name: 'proxy-jsonrpc', 
            url: `${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`,
            contentType: 'application/json-rpc'
          },
          { 
            name: 'proxy-json', 
            url: `${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`,
            contentType: 'application/json'
          },
          { 
            name: 'resources-zabbix-api', 
            url: `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`,
            contentType: 'application/json'
          }
        ];

        for (const endpoint of endpoints) {
          console.log(`\n--- Testing endpoint: ${endpoint.name} ---`);
          console.log(`URL: ${endpoint.url}`);
          
          const testResult: any = { name: endpoint.name, url: endpoint.url, versionTest: null, hostTest: null };
          
          try {
            // Test apiinfo.version
            const versionBody = JSON.stringify({
              jsonrpc: '2.0',
              method: 'apiinfo.version',
              params: {},
              id: 1
            });
            console.log(`Request body: ${versionBody}`);
            
            const versionRes = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': endpoint.contentType
              },
              body: versionBody
            });
            
            const versionText = await versionRes.text();
            console.log(`Response status: ${versionRes.status}`);
            console.log(`Response body: ${versionText.substring(0, 500)}`);
            
            if (versionRes.ok && !versionText.startsWith('<!DOCTYPE')) {
              try {
                const versionData = JSON.parse(versionText);
                testResult.versionTest = { 
                  status: 'ok', 
                  version: versionData.result || null,
                  error: versionData.error || null
                };
                
                if (versionData.result && !diagnosis.zabbixApi.version) {
                  diagnosis.zabbixApi = { status: 'ok', version: versionData.result, error: null };
                }
              } catch (parseErr) {
                const parseError = parseErr as Error;
                testResult.versionTest = { status: 'parse-error', error: parseError.message, raw: versionText.substring(0, 200) };
              }
            } else {
              testResult.versionTest = { status: 'error', httpStatus: versionRes.status, raw: versionText.substring(0, 200) };
            }

            // Test host.get
            const hostBody = JSON.stringify({
              jsonrpc: '2.0',
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status'],
                selectInterfaces: ['ip', 'dns', 'type'],
                limit: 5
              },
              id: 2
            });
            console.log(`Host request body: ${hostBody}`);
            
            const hostRes = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': endpoint.contentType
              },
              body: hostBody
            });
            
            const hostText = await hostRes.text();
            console.log(`Host response status: ${hostRes.status}`);
            console.log(`Host response body: ${hostText.substring(0, 500)}`);
            
            if (hostRes.ok && !hostText.startsWith('<!DOCTYPE')) {
              try {
                const hostData = JSON.parse(hostText);
                if (hostData.result && Array.isArray(hostData.result)) {
                  testResult.hostTest = { 
                    status: 'ok', 
                    count: hostData.result.length,
                    sample: hostData.result.slice(0, 2)
                  };
                  
                  if (hostData.result.length > 0 && !diagnosis.hostTest.count) {
                    diagnosis.hostTest = { 
                      status: 'ok', 
                      count: hostData.result.length, 
                      sample: hostData.result.slice(0, 2),
                      error: null 
                    };
                  }
                } else if (hostData.error) {
                  testResult.hostTest = { status: 'zabbix-error', error: hostData.error };
                  if (!diagnosis.zabbixApi.error) {
                    diagnosis.zabbixApi.error = `Zabbix Error: ${JSON.stringify(hostData.error)}`;
                    diagnosis.zabbixApi.status = 'error';
                  }
                } else {
                  testResult.hostTest = { status: 'unexpected', response: hostData };
                }
              } catch (parseErr) {
                const parseError = parseErr as Error;
                testResult.hostTest = { status: 'parse-error', error: parseError.message, raw: hostText.substring(0, 200) };
              }
            } else {
              testResult.hostTest = { status: 'error', httpStatus: hostRes.status, raw: hostText.substring(0, 200) };
            }
          } catch (err) {
            const e = err as Error;
            testResult.versionTest = { status: 'exception', error: e.message };
            console.error(`Endpoint ${endpoint.name} error:`, e);
          }
          
          diagnosis.endpoints.push(testResult);
        }

        // Generate recommendation
        if (diagnosis.grafana.status !== 'ok') {
          diagnosis.recommendation = 'Grafana não está acessível. Verifique a URL e a API Key.';
        } else if (diagnosis.datasource.status !== 'ok') {
          diagnosis.recommendation = 'Datasource Zabbix não encontrado. Verifique o UID do datasource.';
        } else if (diagnosis.zabbixApi.error) {
          diagnosis.recommendation = `Erro na API do Zabbix: ${diagnosis.zabbixApi.error}. Verifique as credenciais do Zabbix no datasource do Grafana.`;
        } else if (diagnosis.hostTest.count === 0 || diagnosis.hostTest.status !== 'ok') {
          diagnosis.recommendation = 'Nenhum host encontrado. Verifique se o usuário do Zabbix tem permissão para visualizar hosts.';
        } else {
          diagnosis.recommendation = `Conexão OK! ${diagnosis.hostTest.count} hosts encontrados.`;
        }

        console.log('=== Diagnosis Complete ===');
        console.log(JSON.stringify(diagnosis, null, 2));

        return new Response(JSON.stringify({ 
          success: true, 
          diagnosis 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'datasources': {
        // List all datasources
        const response = await fetch(`${grafana_url}/api/datasources`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch datasources:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch datasources: ${response.status}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const datasources = await response.json();
        // Filter only Zabbix datasources
        const zabbixDatasources = datasources.filter((ds: any) => 
          ds.type === 'alexanderzobnin-zabbix-datasource' || 
          ds.type === 'zabbix' ||
          ds.name.toLowerCase().includes('zabbix')
        );

        console.log(`Found ${zabbixDatasources.length} Zabbix datasources`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: zabbixDatasources 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'zabbix-hosts': {
        // Get hosts from Zabbix via Grafana Zabbix plugin API
        console.log('Fetching Zabbix hosts via Grafana plugin...');
        console.log(`Datasource UID: ${datasource_uid}`);
        
        // Try multiple endpoints
        const endpoints = [
          { 
            url: `${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`,
            contentType: 'application/json-rpc'
          },
          { 
            url: `${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`,
            contentType: 'application/json'
          },
          { 
            url: `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`,
            contentType: 'application/json'
          }
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint.url} with Content-Type: ${endpoint.contentType}`);
            
            const zabbixRequest = {
              jsonrpc: '2.0',
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status', 'description'],
                selectGroups: ['groupid', 'name'],
                selectInterfaces: ['interfaceid', 'ip', 'dns', 'port', 'type'],
                limit: 1000,
              },
              id: 1,
            };

            console.log('Zabbix request:', JSON.stringify(zabbixRequest));

            const response = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': endpoint.contentType,
              },
              body: JSON.stringify(zabbixRequest),
            });

            const responseText = await response.text();
            console.log('Response status:', response.status);
            console.log('Response body (first 500 chars):', responseText.substring(0, 500));

            if (!response.ok || responseText.startsWith('<!DOCTYPE')) {
              console.log('Endpoint failed, trying next...');
              continue;
            }

            const data = JSON.parse(responseText);
            
            if (data.error) {
              console.error('Zabbix API error:', data.error);
              continue;
            }

            const hosts = data.result || [];
            console.log(`Successfully fetched ${hosts.length} hosts from Zabbix`);

            return new Response(JSON.stringify({ 
              success: true, 
              data: hosts 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch (err) {
            const e = err as Error;
            console.error(`Endpoint failed with error: ${e.message}`);
            continue;
          }
        }

        // All endpoints failed
        console.error('All endpoints failed to fetch hosts');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch hosts from Zabbix. Use diagnose action for details.',
          data: []
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'host-metrics': {
        // Get metrics for a specific host
        if (!host_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'host_id is required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use correct endpoint: resources/zabbix-api
        const metricsUrl = `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`;
        const metricsBody = JSON.stringify({
          jsonrpc: '2.0',
          method: 'item.get',
          params: {
            output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock', 'status'],
            hostids: host_id,
            filter: { status: 0 },
            sortfield: 'name',
          },
          id: 1,
        });
        
        console.log(`Fetching metrics from: ${metricsUrl}`);
        console.log(`Request body: ${metricsBody}`);

        const response = await fetch(metricsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: metricsBody,
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}`);
        console.log(`Response body: ${responseText.substring(0, 500)}`);

        if (!response.ok) {
          console.error('Failed to fetch host metrics:', responseText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch metrics: ${response.status}`,
            data: []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const data = JSON.parse(responseText);
          
          if (data.error) {
            console.error('Zabbix API error:', data.error);
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Zabbix error: ${data.error.message || JSON.stringify(data.error)}`,
              data: []
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`Fetched ${data.result?.length || 0} metrics for host ${host_id}`);

          return new Response(JSON.stringify({ 
            success: true, 
            data: data.result || [] 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseErr) {
          console.error('Failed to parse metrics response:', parseErr);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to parse Zabbix response',
            data: []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'host-alerts': {
        // Get active alerts/problems for a host
        if (!host_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'host_id is required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use correct endpoint: resources/zabbix-api
        const alertsUrl = `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`;
        const alertsBody = JSON.stringify({
          jsonrpc: '2.0',
          method: 'problem.get',
          params: {
            output: 'extend',
            hostids: host_id,
            recent: true,
            sortfield: ['eventid'],
            sortorder: 'DESC',
            selectAcknowledges: 'count',
            selectTags: 'extend',
          },
          id: 1,
        });

        console.log(`Fetching alerts from: ${alertsUrl}`);
        console.log(`Request body: ${alertsBody}`);

        const response = await fetch(alertsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: alertsBody,
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}`);
        console.log(`Response body: ${responseText.substring(0, 500)}`);

        if (!response.ok) {
          console.error('Failed to fetch host alerts:', responseText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch alerts: ${response.status}`,
            data: []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const data = JSON.parse(responseText);
          
          if (data.error) {
            console.error('Zabbix API error:', data.error);
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Zabbix error: ${data.error.message || JSON.stringify(data.error)}`,
              data: []
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`Fetched ${data.result?.length || 0} alerts for host ${host_id}`);

          return new Response(JSON.stringify({ 
            success: true, 
            data: data.result || [] 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseErr) {
          console.error('Failed to parse alerts response:', parseErr);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to parse Zabbix response',
            data: []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'metric-history': {
        // Get metric history for charts
        if (!host_id || !query?.item_key) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'host_id and query.item_key are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const timeFrom = query.time_from || Math.floor(Date.now() / 1000) - 3600;
        const timeTill = query.time_till || Math.floor(Date.now() / 1000);

        // Use correct endpoint: resources/zabbix-api
        const historyApiUrl = `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`;

        // First get item ID from key
        console.log(`Fetching item ID for key: ${query.item_key}`);
        const itemResponse = await fetch(historyApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'item.get',
            params: {
              output: ['itemid'],
              hostids: host_id,
              search: { key_: query.item_key },
            },
            id: 1,
          }),
        });

        if (!itemResponse.ok) {
          console.error('Failed to get item ID:', itemResponse.status);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to get item ID' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const itemText = await itemResponse.text();
        console.log(`Item response: ${itemText.substring(0, 300)}`);
        
        let itemData;
        try {
          itemData = JSON.parse(itemText);
        } catch {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to parse item response' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const itemId = itemData.result?.[0]?.itemid;

        if (!itemId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Item not found' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get history
        console.log(`Fetching history for item ${itemId}`);
        const historyResponse = await fetch(historyApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'history.get',
            params: {
              output: 'extend',
              itemids: itemId,
              time_from: timeFrom,
              time_till: timeTill,
              sortfield: 'clock',
              sortorder: 'ASC',
            },
            id: 1,
          }),
        });

        if (!historyResponse.ok) {
          console.error('Failed to get history:', historyResponse.status);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to get history' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const historyText = await historyResponse.text();
        console.log(`History response: ${historyText.substring(0, 300)}`);
        
        let historyData;
        try {
          historyData = JSON.parse(historyText);
        } catch {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to parse history response' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Fetched ${historyData.result?.length || 0} history points`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: historyData.result || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'dashboards': {
        // List available dashboards
        const response = await fetch(`${grafana_url}/api/search?type=dash-db`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch dashboards: ${response.status}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const dashboards = await response.json();
        console.log(`Found ${dashboards.length} dashboards`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: dashboards 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: `Unknown action: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in grafana-proxy:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
