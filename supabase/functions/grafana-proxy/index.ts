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
        // Get hosts from Zabbix via Grafana datasource
        const queryBody = {
          queries: [{
            refId: 'A',
            datasource: { uid: datasource_uid },
            queryType: 'zabbixAPI',
            group: { filter: '' },
            host: { filter: '' },
            application: { filter: '' },
            item: { filter: '' },
            functions: [],
            mode: 0,
            options: {
              showDisabledItems: false,
              skipEmptyValues: false,
            },
            // Custom Zabbix API query
            zabbixAPI: {
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status', 'description'],
                selectGroups: ['groupid', 'name'],
                selectInterfaces: ['interfaceid', 'ip', 'dns', 'port', 'type'],
                filter: {},
              }
            }
          }],
          from: 'now-1h',
          to: 'now',
        };

        // Try the Grafana datasource proxy endpoint
        const response = await fetch(`${grafana_url}/api/ds/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryBody),
        });

        if (!response.ok) {
          // Try alternative approach - direct datasource proxy
          console.log('Trying alternative endpoint for Zabbix hosts...');
          
          const altResponse = await fetch(`${grafana_url}/api/datasources/proxy/uid/${datasource_uid}/api_jsonrpc.php`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'host.get',
              params: {
                output: ['hostid', 'host', 'name', 'status', 'description'],
                selectGroups: ['groupid', 'name'],
                selectInterfaces: ['interfaceid', 'ip', 'dns', 'port', 'type'],
              },
              id: 1,
            }),
          });

          if (!altResponse.ok) {
            const errorText = await altResponse.text();
            console.error('Failed to fetch Zabbix hosts:', errorText);
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Failed to fetch hosts: ${altResponse.status}` 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const altData = await altResponse.json();
          console.log(`Fetched ${altData.result?.length || 0} hosts from Zabbix`);

          return new Response(JSON.stringify({ 
            success: true, 
            data: altData.result || [] 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        console.log('Zabbix hosts response:', JSON.stringify(data).substring(0, 500));

        return new Response(JSON.stringify({ 
          success: true, 
          data: data.results?.A?.frames?.[0]?.data || data 
        }), {
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
