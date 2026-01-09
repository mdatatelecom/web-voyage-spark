import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para formatar o header Authorization corretamente
const formatAuthHeader = (token: string): string => {
  if (!token) return '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

// OIDs de sistema SNMP
const SYSTEM_OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',
  sysContact: '1.3.6.1.2.1.1.4.0',
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

// Interface para dados processados
interface ProcessedInterface {
  name: string;
  type: string;
  status: string;
  speed: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
}

interface ProcessedVlan {
  id: number;
  name: string;
  ports: string[];
}

interface SystemInfo {
  description: string | null;
  uptime: string | null;
  uptimeRaw: string | null;
  name: string | null;
  location: string | null;
  contact: string | null;
}

// OIDs conhecidos para interfaces
const INTERFACE_OIDS = {
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifType: '1.3.6.1.2.1.2.2.1.3',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifSpeed: '1.3.6.1.2.1.2.2.1.5',
  ifPhysAddress: '1.3.6.1.2.1.2.2.1.6',
  ifHCInOctets: '1.3.6.1.2.1.31.1.1.1.6',
  ifHCOutOctets: '1.3.6.1.2.1.31.1.1.1.10',
  ifHighSpeed: '1.3.6.1.2.1.31.1.1.1.15',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
};

// Função para extrair índice de interface do OID
function extractInterfaceIndex(oid: string): string | null {
  const parts = oid.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

// Função para formatar uptime de ticks (centésimos de segundo) para string legível
function formatUptime(ticks: number): string {
  const seconds = Math.floor(ticks / 100);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// Função para extrair informações do sistema dos OIDs
function extractSystemInfo(data: MetricsResponse['data']): SystemInfo {
  const outros = data?.outros || [];
  
  const findOid = (oidPrefix: string) => {
    const found = outros.find(o => o.oid.includes(oidPrefix));
    return found?.value || null;
  };
  
  const uptimeTicks = findOid(SYSTEM_OIDS.sysUpTime);
  
  return {
    description: findOid(SYSTEM_OIDS.sysDescr),
    uptime: uptimeTicks ? formatUptime(parseInt(uptimeTicks)) : null,
    uptimeRaw: uptimeTicks,
    name: findOid(SYSTEM_OIDS.sysName),
    location: findOid(SYSTEM_OIDS.sysLocation),
    contact: findOid(SYSTEM_OIDS.sysContact),
  };
}

// Função para extrair timestamp do nome do arquivo de histórico
function extractTimestampFromFilename(filename: string): string | null {
  // Formato esperado: "192.168.1.1_2026-01-09T10-30-00.json"
  const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
  if (match) {
    // Converter de formato de arquivo (2026-01-09T10-30-00) para ISO (2026-01-09T10:30:00)
    return match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
  }
  return null;
}

// Função para processar dados de interfaces
function processInterfaceData(interfaceOids: Array<{ oid: string; value: string }>): ProcessedInterface[] {
  const interfaceMap = new Map<string, Partial<ProcessedInterface>>();
  
  for (const item of interfaceOids) {
    const index = extractInterfaceIndex(item.oid);
    if (!index) continue;
    
    if (!interfaceMap.has(index)) {
      interfaceMap.set(index, { rxBytes: 0, txBytes: 0 });
    }
    
    const iface = interfaceMap.get(index)!;
    
    if (item.oid.includes(INTERFACE_OIDS.ifDescr)) {
      iface.name = item.value;
    } else if (item.oid.includes(INTERFACE_OIDS.ifType)) {
      iface.type = item.value;
    } else if (item.oid.includes(INTERFACE_OIDS.ifOperStatus)) {
      iface.status = item.value === '1' ? 'up' : 'down';
    } else if (item.oid.includes(INTERFACE_OIDS.ifHighSpeed) || item.oid.includes(INTERFACE_OIDS.ifSpeed)) {
      iface.speed = item.value;
    } else if (item.oid.includes(INTERFACE_OIDS.ifPhysAddress)) {
      iface.mac = item.value;
    }
  }
  
  // Também processar dados de tráfego para interfaces
  return Array.from(interfaceMap.entries())
    .filter(([_, iface]) => iface.name)
    .map(([_, iface]) => ({
      name: iface.name || 'unknown',
      type: iface.type || 'unknown',
      status: iface.status || 'unknown',
      speed: iface.speed || '',
      mac: iface.mac || '',
      rxBytes: iface.rxBytes || 0,
      txBytes: iface.txBytes || 0,
    }));
}

// Função para processar dados de VLANs
function processVlanData(outrosOids: Array<{ oid: string; value: string }>): ProcessedVlan[] {
  const vlanMap = new Map<number, ProcessedVlan>();
  
  // VLANs geralmente estão em OIDs específicos de vendors ou 1.3.6.1.4.1.xxx
  // Procurar por padrões comuns de VLAN
  for (const item of outrosOids) {
    // Padrão: OID contém "vlan" ou valores numéricos que parecem IDs de VLAN
    if (item.oid.toLowerCase().includes('vlan') || item.oid.includes('1.3.6.1.4.1.9.9.46')) {
      const match = item.value.match(/VLAN(\d+)/i) || item.value.match(/^(\d+)$/);
      if (match) {
        const vlanId = parseInt(match[1]);
        if (vlanId >= 1 && vlanId <= 4094) {
          if (!vlanMap.has(vlanId)) {
            vlanMap.set(vlanId, { id: vlanId, name: `VLAN ${vlanId}`, ports: [] });
          }
        }
      }
    }
  }
  
  return Array.from(vlanMap.values());
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
          headers: body.api_token ? { 'Authorization': formatAuthHeader(body.api_token) } : {},
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

    // Discover hosts (direct server action)
    if (action === 'discover' && server_address) {
      try {
        const cleanAddress = server_address.replace(/^https?:\/\//, '');
        const hostsUrl = `http://${cleanAddress}/hosts`;
        
        console.log('Discovering hosts at:', hostsUrl);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(hostsUrl, {
          headers: body.api_token ? { 'Authorization': formatAuthHeader(body.api_token) } : {},
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
          headers: body.api_token ? { 'Authorization': formatAuthHeader(body.api_token) } : {},
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

    // Configurar endereços
    const protocol = deviceData?.protocol || 'http';
    const serverAddr = deviceData?.server_address || '86.48.3.172:3000';
    const monitoredHost = deviceData?.monitored_host || deviceData?.ip_address;
    const authHeader = formatAuthHeader(token);

    console.log(`Device config: protocol=${protocol}, server=${serverAddr}, host=${monitoredHost}`);

    // ========== ACTION: STATUS ==========
    if (action === 'status') {
      const statusUrl = `${protocol}://${serverAddr}/status`;
      console.log(`Checking API status: ${statusUrl}`);

      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
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

    // ========== ACTION: DEVICE (informações completas) ==========
    if (action === 'device') {
      const deviceUrl = `${protocol}://${serverAddr}/device/${monitoredHost}`;
      console.log(`Fetching device info from: ${deviceUrl}`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(deviceUrl, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const deviceInfo = await response.json();
          
          // Extrair informações do sistema
          const systemInfo = extractSystemInfo(deviceInfo.data || deviceInfo);
          
          // Atualizar dispositivo no banco com informações do sistema
          if (deviceUuid && systemInfo) {
            await supabase
              .from('monitored_devices')
              .update({
                sys_name: systemInfo.name,
                sys_description: systemInfo.description,
                sys_location: systemInfo.location,
                sys_contact: systemInfo.contact,
                uptime_raw: systemInfo.uptimeRaw,
                updated_at: new Date().toISOString(),
              })
              .eq('id', deviceUuid);
            
            console.log('Updated device system info:', systemInfo.name);
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              host: monitoredHost, 
              system: systemInfo,
              data: deviceInfo.data || deviceInfo 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to get device info', status: response.status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Device info fetch failed:', errorMsg);
        return new Response(
          JSON.stringify({ success: false, error: errorMsg.includes('abort') ? 'Timeout' : 'Failed to get device info' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== ACTION: HISTORY ==========
    if (action === 'history') {
      const historyUrl = `${protocol}://${serverAddr}/metrics/${monitoredHost}/history`;
      console.log(`Fetching history from: ${historyUrl}`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(historyUrl, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const historyData = await response.json();
          
          // Processar para extrair timestamps dos nomes de arquivo
          const processedHistory = Array.isArray(historyData) 
            ? historyData.map((item: { file?: string; data: unknown }) => ({
                timestamp: item.file ? extractTimestampFromFilename(item.file) : null,
                filename: item.file || null,
                data: item.data || item,
              }))
            : historyData;
          
          return new Response(
            JSON.stringify({ success: true, host: monitoredHost, history: processedHistory }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to get history', status: response.status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('History fetch failed:', errorMsg);
        return new Response(
          JSON.stringify({ success: false, error: errorMsg.includes('abort') ? 'Timeout' : 'Failed to get history' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== ACTION: COLLECT (default) ==========
    const apiUrl = `${protocol}://${serverAddr}/metrics/${monitoredHost}`;
    const startTime = Date.now();

    console.log(`Fetching metrics from: ${apiUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let isOnline = false;
    let responseData: MetricsResponse | null = null;
    let systemInfo: SystemInfo | null = null;

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
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

        // Extrair informações do sistema
        if (responseData?.data) {
          systemInfo = extractSystemInfo(responseData.data);
        }

        // Atualizar dispositivo no banco
        if (deviceUuid) {
          const updateData: Record<string, unknown> = {
            status: 'online',
            last_seen: new Date().toISOString(),
          };
          
          // Adicionar informações do sistema se disponíveis
          if (systemInfo) {
            if (systemInfo.name) updateData.sys_name = systemInfo.name;
            if (systemInfo.description) updateData.sys_description = systemInfo.description;
            if (systemInfo.location) updateData.sys_location = systemInfo.location;
            if (systemInfo.contact) updateData.sys_contact = systemInfo.contact;
            if (systemInfo.uptimeRaw) updateData.uptime_raw = systemInfo.uptimeRaw;
          }
          
          await supabase
            .from('monitored_devices')
            .update(updateData)
            .eq('id', deviceUuid);

          // Inserir histórico de uptime
          await supabase
            .from('device_uptime_history')
            .insert({
              device_uuid: deviceUuid,
              is_online: true,
              response_time_ms: responseTime,
              uptime_raw: systemInfo?.uptimeRaw || null,
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

            // Processar e salvar interfaces automaticamente
            const interfaceOids = responseData.data.interfaces || [];
            const trafegoOids = responseData.data.trafego || [];
            const allInterfaceOids = [...interfaceOids, ...trafegoOids];
            
            if (allInterfaceOids.length > 0) {
              const processedInterfaces = processInterfaceData(allInterfaceOids);
              console.log(`Processed ${processedInterfaces.length} interfaces`);

              for (const iface of processedInterfaces) {
                const { error: ifaceError } = await supabase
                  .from('monitored_interfaces')
                  .upsert({
                    device_uuid: deviceUuid,
                    interface_name: iface.name,
                    interface_type: iface.type,
                    status: iface.status,
                    rx_bytes: iface.rxBytes,
                    tx_bytes: iface.txBytes,
                    speed: iface.speed,
                    mac_address: iface.mac,
                    last_updated: new Date().toISOString(),
                  }, { onConflict: 'device_uuid,interface_name' });

                if (ifaceError) {
                  console.error('Error upserting interface:', ifaceError.message);
                }
              }
            }

            // Processar e salvar VLANs automaticamente
            const outrosOids = responseData.data.outros || [];
            const processedVlans = processVlanData(outrosOids);
            
            if (processedVlans.length > 0) {
              console.log(`Processed ${processedVlans.length} VLANs`);

              for (const vlan of processedVlans) {
                const { error: vlanError } = await supabase
                  .from('monitored_vlans')
                  .upsert({
                    device_uuid: deviceUuid,
                    vlan_id: vlan.id,
                    vlan_name: vlan.name,
                    interfaces: vlan.ports,
                    last_updated: new Date().toISOString(),
                  }, { onConflict: 'device_uuid,vlan_id' });

                if (vlanError) {
                  console.error('Error upserting VLAN:', vlanError.message);
                }
              }
            }

            // Salvar snapshot de configuração se houve mudanças
            const currentConfig = {
              interfaces: processInterfaceData(allInterfaceOids),
              vlans: processedVlans,
              system: systemInfo,
            };

            // Verificar último snapshot
            const { data: lastSnapshot } = await supabase
              .from('device_config_snapshots')
              .select('config_data')
              .eq('device_uuid', deviceUuid)
              .order('collected_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const lastConfig = lastSnapshot?.config_data as { interfaces?: unknown[]; vlans?: unknown[]; system?: unknown } | null;
            const configChanged = !lastSnapshot || 
              JSON.stringify(lastConfig?.interfaces) !== JSON.stringify(currentConfig.interfaces) ||
              JSON.stringify(lastConfig?.vlans) !== JSON.stringify(currentConfig.vlans);

            if (configChanged && (currentConfig.interfaces.length > 0 || currentConfig.vlans.length > 0)) {
              const { error: snapshotError } = await supabase
                .from('device_config_snapshots')
                .insert({
                  device_uuid: deviceUuid,
                  config_type: 'full',
                  config_data: currentConfig,
                  collected_at: new Date().toISOString(),
                });

              if (snapshotError) {
                console.error('Error saving config snapshot:', snapshotError.message);
              } else {
                console.log('Saved new config snapshot');
              }
            }

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
        system: systemInfo,
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
