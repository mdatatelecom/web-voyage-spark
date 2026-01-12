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

    const { action, grafana_url, api_key, datasource_uid, host_id, query } = await req.json();

    console.log(`Grafana proxy action: ${action}`);

    switch (action) {
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
        
        // Use Grafana's Zabbix plugin API endpoint
        const zabbixApiUrl = `${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`;
        console.log(`Zabbix API URL: ${zabbixApiUrl}`);

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

        const response = await fetch(zabbixApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json-rpc',
          },
          body: JSON.stringify(zabbixRequest),
        });

        const responseText = await response.text();
        console.log('Zabbix response status:', response.status);
        console.log('Zabbix response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
        console.log('Zabbix response body (first 1000 chars):', responseText.substring(0, 1000));

        if (!response.ok) {
          console.error('Failed to fetch Zabbix hosts, status:', response.status);
          
          // Try alternative: use Grafana's resource API for Zabbix plugin
          console.log('Trying Grafana resource API...');
          const resourceUrl = `${grafana_url}/api/datasources/uid/${datasource_uid}/resources/zabbix-api`;
          console.log(`Resource URL: ${resourceUrl}`);
          
          const resourceResponse = await fetch(resourceUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status', 'description'],
                selectGroups: ['groupid', 'name'],
                selectInterfaces: ['interfaceid', 'ip', 'dns', 'port', 'type'],
              }
            }),
          });

          const resourceText = await resourceResponse.text();
          console.log('Resource response status:', resourceResponse.status);
          console.log('Resource response body (first 1000 chars):', resourceText.substring(0, 1000));

          if (!resourceResponse.ok) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Failed to fetch hosts. Proxy: ${response.status}, Resource: ${resourceResponse.status}`,
              details: {
                proxyResponse: responseText.substring(0, 500),
                resourceResponse: resourceText.substring(0, 500)
              }
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          try {
            const resourceData = JSON.parse(resourceText);
            const hosts = resourceData.result || resourceData || [];
            console.log(`Fetched ${Array.isArray(hosts) ? hosts.length : 0} hosts via resource API`);
            
            return new Response(JSON.stringify({ 
              success: true, 
              data: Array.isArray(hosts) ? hosts : [] 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch (e) {
            console.error('Failed to parse resource response:', e);
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Invalid response from Zabbix API' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Parse the response
        try {
          const data = JSON.parse(responseText);
          
          // Check for Zabbix API error
          if (data.error) {
            console.error('Zabbix API error:', data.error);
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Zabbix API error: ${data.error.message || data.error.data || JSON.stringify(data.error)}` 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const hosts = data.result || [];
          console.log(`Successfully fetched ${hosts.length} hosts from Zabbix`);

          return new Response(JSON.stringify({ 
            success: true, 
            data: hosts 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('Failed to parse Zabbix response:', e);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Invalid JSON response from Zabbix' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
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

        // Fetch items (metrics) for the host
        const response = await fetch(`${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'item.get',
            params: {
              output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock', 'status'],
              hostids: host_id,
              filter: { status: 0 },
              sortfield: 'name',
            },
            id: 1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch host metrics:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch metrics: ${response.status}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        console.log(`Fetched ${data.result?.length || 0} metrics for host ${host_id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: data.result || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

        const response = await fetch(`${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch host alerts:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch alerts: ${response.status}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        console.log(`Fetched ${data.result?.length || 0} alerts for host ${host_id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: data.result || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

        // First get item ID from key
        const itemResponse = await fetch(`${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`, {
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
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to get item ID' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const itemData = await itemResponse.json();
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
        const historyResponse = await fetch(`${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`, {
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
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to get history' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const historyData = await historyResponse.json();
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
