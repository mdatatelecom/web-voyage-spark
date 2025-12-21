import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppSettings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  isEnabled: boolean;
  defaultCountryCode: string;
}

// Helper function to format phone number with country code
function formatPhoneNumber(phone: string, defaultCountryCode: string = '55'): string {
  // Clean country code - keep only digits and limit to 2-3 chars (country codes are 1-3 digits)
  // This handles cases where defaultCountryCode might have garbage data like "5511 978707217"
  let cleanedCountryCode = defaultCountryCode.replace(/\D/g, '');
  
  // Country codes are max 3 digits (e.g., 55 for Brazil, 1 for USA, 353 for Ireland)
  // If longer, it likely contains phone number data - extract just first 2-3 digits
  if (cleanedCountryCode.length > 3) {
    // For Brazil-like codes starting with 55, take first 2
    if (cleanedCountryCode.startsWith('55')) {
      cleanedCountryCode = '55';
    } else if (cleanedCountryCode.startsWith('1')) {
      cleanedCountryCode = '1';
    } else {
      cleanedCountryCode = cleanedCountryCode.slice(0, 2);
    }
    console.warn(`Country code was too long, cleaned to: ${cleanedCountryCode}`);
  }
  
  cleanedCountryCode = cleanedCountryCode || '55';
  
  // Remove all non-numeric characters from phone
  let cleaned = phone.replace(/\D/g, '');
  
  // Validate phone length - Brazilian numbers are 12-13 digits with country code
  // International numbers vary but rarely exceed 15 digits total
  if (cleaned.length > 15) {
    console.warn(`Phone number too long (${cleaned.length} digits), truncating: ${cleaned}`);
    cleaned = cleaned.slice(0, 15);
  }
  
  // If phone is too short, it's likely invalid
  if (cleaned.length < 8) {
    console.warn(`Phone number too short (${cleaned.length} digits): ${cleaned}`);
  }
  
  // If doesn't start with country code, add it
  if (!cleaned.startsWith(cleanedCountryCode)) {
    cleaned = cleanedCountryCode + cleaned;
  }
  
  // Final length check after adding country code
  if (cleaned.length > 15) {
    console.warn(`Final phone number too long, truncating to 15 digits: ${cleaned}`);
    cleaned = cleaned.slice(0, 15);
  }
  
  console.log(`formatPhoneNumber: input="${phone}", countryCode="${defaultCountryCode}" -> cleaned="${cleanedCountryCode}", result="${cleaned}"`);
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, message, ticketId, instanceName, groupId, settings: providedSettings } = await req.json();

    console.log('WhatsApp function called with action:', action);

    // Get settings from database or use provided ones
    let settings: WhatsAppSettings;

    if (providedSettings) {
      settings = providedSettings;
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching WhatsApp settings:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao buscar configurações' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!data?.setting_value) {
        return new Response(
          JSON.stringify({ success: false, message: 'Configurações do WhatsApp não encontradas' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      settings = data.setting_value as WhatsAppSettings;
    }

    // Clean up API URL
    const apiUrl = settings.evolutionApiUrl ? settings.evolutionApiUrl.replace(/\/$/, '') : '';

    // Debug log for API Key (masked for security)
    const apiKeyClean = settings.evolutionApiKey?.trim() || '';
    console.log('Evolution API config:', {
      url: apiUrl,
      keyLength: apiKeyClean.length,
      keyPreview: apiKeyClean.length > 8 
        ? `${apiKeyClean.substring(0, 4)}...${apiKeyClean.slice(-4)}` 
        : apiKeyClean.length > 0 ? '****' : 'N/A'
    });

    // Actions that don't require evolutionInstance
    const actionsWithoutInstance = ['list-instances', 'create-instance', 'delete-instance', 'logout-instance', 'connect-instance'];
    
    // Validate settings based on action
    if (!actionsWithoutInstance.includes(action)) {
      if (!settings.evolutionApiUrl || !apiKeyClean || !settings.evolutionInstance) {
        return new Response(
          JSON.stringify({ success: false, message: 'Configurações incompletas' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      // For actions without instance, just validate URL and key
      if (!settings.evolutionApiUrl || !apiKeyClean) {
        return new Response(
          JSON.stringify({ success: false, message: 'URL e API Key são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    // Use cleaned API Key for all requests
    settings.evolutionApiKey = apiKeyClean;

    // List WhatsApp groups
    if (action === 'list-groups') {
      console.log('Listing WhatsApp groups for instance:', settings.evolutionInstance);
      
      // First check if instance is really connected
      try {
        const stateResponse = await fetch(
          `${apiUrl}/instance/connectionState/${settings.evolutionInstance}`,
          {
            method: 'GET',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          console.log('Instance state before listing groups:', stateData);
          
          const state = stateData?.instance?.state || stateData?.state || 'unknown';
          
          // Check if really connected - connectionStatus/state "open" or "connected" is the source of truth
          // disconnectionReasonCode is historical and doesn't get cleared after reconnection
          const isReallyConnected = (state === 'open' || state === 'connected');
          
          if (!isReallyConnected) {
            console.log('Instance not connected, cannot list groups. State:', state);
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Instância desconectada (${state}). Clique em reconectar.`,
                groups: [],
                needsReconnect: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (stateError) {
        console.log('Could not check state before listing groups:', stateError);
        // Continue anyway - maybe the groups request will work
      }
      
      // Evolution API v2 requires getParticipants parameter
      const groupsUrl = `${apiUrl}/group/fetchAllGroups/${settings.evolutionInstance}?getParticipants=false`;
      console.log('Fetching groups from URL:', groupsUrl);
      
      try {
        const response = await fetch(
          groupsUrl,
          {
            method: 'GET',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API list groups response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API list groups error:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Erro ao listar grupos: ${response.status}`,
              groups: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const rawText = await response.text();
        console.log('Raw groups response length:', rawText.length);
        console.log('Raw groups response preview:', rawText.substring(0, 500));
        
        const groupsData = JSON.parse(rawText);
        console.log('Parsed groups data type:', typeof groupsData, 'isArray:', Array.isArray(groupsData));
        
        // Handle different response formats from Evolution API
        // Can be: [{...}] or { groups: [...] } or { data: [...] }
        let rawGroups: any[] = [];
        if (Array.isArray(groupsData)) {
          rawGroups = groupsData;
          console.log('Groups is direct array with', rawGroups.length, 'items');
        } else if (groupsData?.groups && Array.isArray(groupsData.groups)) {
          rawGroups = groupsData.groups;
          console.log('Groups extracted from .groups property with', rawGroups.length, 'items');
        } else if (groupsData?.data && Array.isArray(groupsData.data)) {
          rawGroups = groupsData.data;
          console.log('Groups extracted from .data property with', rawGroups.length, 'items');
        } else {
          console.log('Unknown groups response structure:', Object.keys(groupsData || {}));
          // Try to find any array property
          for (const key of Object.keys(groupsData || {})) {
            if (Array.isArray(groupsData[key])) {
              rawGroups = groupsData[key];
              console.log(`Groups extracted from .${key} property with`, rawGroups.length, 'items');
              break;
            }
          }
        }

        // Log first group structure for debugging
        if (rawGroups.length > 0) {
          console.log('First group structure:', JSON.stringify(rawGroups[0]).substring(0, 300));
        }

        // Extract group info from the response
        const groupList = rawGroups.map((group: any) => ({
          id: group.id || group.jid,
          subject: group.subject || group.name || 'Grupo sem nome',
          size: group.size || group.participants?.length || 0,
          creation: group.creation || 0,
          owner: group.owner || '',
          desc: group.desc || group.description || '',
        }));
        
        console.log('Final group list with', groupList.length, 'groups');

        return new Response(
          JSON.stringify({ 
            success: true, 
            groups: groupList 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('List groups fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${errorMessage}`,
            groups: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'list-instances') {
      // List all available instances
      console.log('Listing Evolution API instances...');
      
      try {
        const response = await fetch(
          `${apiUrl}/instance/fetchInstances`,
          {
            method: 'GET',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API list instances response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API list instances error:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Erro ao listar instâncias: ${response.status}`,
              instances: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const instances = await response.json();
        console.log('Instances found:', instances);

        // Extract instance names from the response
        // Note: Evolution API returns 'connectionStatus' not 'state'
        // disconnectionReasonCode is historical and should NOT be used to determine current connection
        const instanceList = Array.isArray(instances) 
          ? instances.map((inst: any) => {
              const rawState = inst.connectionStatus || inst.instance?.state || inst.state || 'unknown';
              const disconnectionReasonCode = inst.instance?.disconnectionReasonCode ?? inst.disconnectionReasonCode ?? 0;
              
              // connectionStatus is the source of truth - if "open", it's connected
              // disconnectionReasonCode is historical and doesn't get cleared after reconnection
              const effectiveState = rawState;
              
              return {
                name: inst.instance?.instanceName || inst.instanceName || inst.name,
                displayName: inst.instance?.instanceName || inst.instanceName || inst.name,
                state: effectiveState,
                rawState,
                disconnectionReasonCode, // Keep for logging purposes only
                profileName: inst.instance?.profileName || inst.profileName || null,
                profilePictureUrl: inst.profilePicUrl || inst.instance?.profilePictureUrl || inst.profilePictureUrl || null
              };
            })
          : [];

        return new Response(
          JSON.stringify({ 
            success: true, 
            instances: instanceList 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('List instances fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${errorMessage}`,
            instances: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create-instance') {
      // Create a new instance (instanceName comes from the initial body parse)
      

      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Creating new Evolution API instance:', instanceName);
      
      try {
        const response = await fetch(
          `${apiUrl}/instance/create`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
              rejectCall: false,
              groupsIgnore: false,
              alwaysOnline: false,
            }),
          }
        );

        console.log('Evolution API create instance response status:', response.status);

        const data = await response.json();
        console.log('Evolution API create instance response:', data);

        if (!response.ok) {
          // Handle error message properly
          let errorMsg = `Erro ${response.status}`;
          if (data?.response?.message) {
            errorMsg = Array.isArray(data.response.message) 
              ? data.response.message.join(', ') 
              : String(data.response.message);
          } else if (data?.message) {
            errorMsg = String(data.message);
          } else if (data?.error) {
            errorMsg = String(data.error);
          }
          console.error('Evolution API create instance error:', errorMsg);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: errorMsg,
              qrcode: null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extract QR code from response
        const qrcode = data?.qrcode?.base64 || data?.qrcode?.pairingCode || data?.qrcode || null;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Instância criada com sucesso',
            instance: data.instance,
            hash: data.hash,
            qrcode
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Create instance fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${errorMessage}`,
            qrcode: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'delete-instance') {
      // Delete an instance permanently (instanceName comes from the initial body parse)
      
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Deleting Evolution API instance:', instanceName);
      
      try {
        const response = await fetch(
          `${apiUrl}/instance/delete/${instanceName}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API delete instance response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.response?.message?.[0] || errorData?.message || `Erro ${response.status}`;
          console.error('Evolution API delete instance error:', errorMsg);
          return new Response(
            JSON.stringify({ success: false, message: errorMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Instância excluída com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Delete instance fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ success: false, message: `Erro de conexão: ${errorMessage}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'logout-instance') {
      // Logout/disconnect from an instance (keeps the instance but disconnects WhatsApp)
      // instanceName comes from the initial body parse
      
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Logging out from Evolution API instance:', instanceName);
      
      try {
        const response = await fetch(
          `${apiUrl}/instance/logout/${instanceName}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API logout instance response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.response?.message?.[0] || errorData?.message || `Erro ${response.status}`;
          console.error('Evolution API logout instance error:', errorMsg);
          return new Response(
            JSON.stringify({ success: false, message: errorMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'WhatsApp desconectado com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Logout instance fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ success: false, message: `Erro de conexão: ${errorMessage}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'connect-instance') {
      // Reconnect an existing instance to get QR code
      // instanceName comes from the initial body parse
      
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Connecting Evolution API instance:', instanceName);
      
      try {
        const response = await fetch(
          `${apiUrl}/instance/connect/${instanceName}`,
          {
            method: 'GET',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API connect instance response status:', response.status);

        const data = await response.json();
        console.log('Evolution API connect instance response:', data);

        if (!response.ok) {
          let errorMsg = `Erro ${response.status}`;
          if (data?.response?.message) {
            errorMsg = Array.isArray(data.response.message) 
              ? data.response.message.join(', ') 
              : String(data.response.message);
          } else if (data?.message) {
            errorMsg = String(data.message);
          } else if (data?.error) {
            errorMsg = String(data.error);
          }
          console.error('Evolution API connect instance error:', errorMsg);
          return new Response(
            JSON.stringify({ success: false, message: errorMsg, qrcode: null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extract QR code - the connect endpoint returns base64 or code
        const qrcode = data?.base64 || data?.code || data?.qrcode?.base64 || data?.qrcode || null;
        const pairingCode = data?.pairingCode || null;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'QR Code gerado com sucesso',
            qrcode,
            pairingCode
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Connect instance fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ success: false, message: `Erro de conexão: ${errorMessage}`, qrcode: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'test') {
      // Test connection by checking instance status with detailed disconnection info
      console.log('Testing connection to Evolution API...');
      try {
        const response = await fetch(
          `${apiUrl}/instance/connectionState/${settings.evolutionInstance}`,
          {
            method: 'GET',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Evolution API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Erro da API: ${response.status} - ${errorText}`,
              needsReconnect: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Evolution API response:', data);

        const state = data?.instance?.state || data?.state || 'unknown';
        const disconnectionReasonCode = data?.instance?.disconnectionReasonCode ?? data?.disconnectionReasonCode ?? 0;
        const disconnectionObject = data?.instance?.disconnectionObject || data?.disconnectionObject || null;
        
        console.log('Connection details:', { state, disconnectionReasonCode, disconnectionObject });
        
        // Check if really connected - connectionStatus/state is the source of truth
        // disconnectionReasonCode is historical and doesn't get cleared after reconnection
        const isReallyConnected = (state === 'open' || state === 'connected');
        
        if (isReallyConnected) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `WhatsApp conectado (${settings.evolutionInstance})`,
              needsReconnect: false,
              state,
              disconnectionReasonCode
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Determine the specific disconnection reason
          let reasonMessage = `Estado: ${state}`;
          let needsReconnect = true;
          
          if (disconnectionReasonCode === 401) {
            reasonMessage = 'Dispositivo removido do WhatsApp. Reconexão necessária.';
          } else if (disconnectionReasonCode === 408) {
            reasonMessage = 'Conexão expirou. Reconexão necessária.';
          } else if (disconnectionReasonCode === 411) {
            reasonMessage = 'Sessão encerrada pelo usuário. Reconexão necessária.';
          } else if (disconnectionReasonCode === 428) {
            reasonMessage = 'Conexão fechada. Reconexão necessária.';
          } else if (disconnectionReasonCode === 440) {
            reasonMessage = 'Conta deslogada em outro dispositivo. Reconexão necessária.';
          } else if (disconnectionReasonCode === 515) {
            reasonMessage = 'Reinicialização necessária. Reconexão necessária.';
          } else if (disconnectionReasonCode !== 0) {
            reasonMessage = `Desconectado (código ${disconnectionReasonCode}). Reconexão necessária.`;
          } else if (state === 'close') {
            reasonMessage = 'WhatsApp desconectado. Reconexão necessária.';
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: reasonMessage,
              needsReconnect,
              state,
              disconnectionReasonCode
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (fetchError: unknown) {
        console.error('Fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${errorMessage}`,
            needsReconnect: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'send-test') {
      // Send a test message
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, message: 'Número de telefone é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Format phone number with country code
      const formattedPhone = formatPhoneNumber(phone, settings.defaultCountryCode || '55');
      const testMessage = message || '✅ Teste de integração WhatsApp realizado com sucesso! - Sistema de Racks';
      console.log('Sending test WhatsApp message - Original:', phone, '-> Formatted:', formattedPhone);

      // Initialize supabase client for logging
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const response = await fetch(
          `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: testMessage,
            }),
          }
        );

        console.log('Evolution API send-test response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Evolution API send-test error:', {
            status: response.status,
            error: errorData?.error,
            response: errorData?.response
          });
          
          let errorMsg = `Erro ${response.status}`;
          if (response.status === 401) {
            errorMsg = 'Erro de autenticação (401): Verifique se a API Key é a Global API Key do servidor Evolution (AUTHENTICATION_API_KEY), não uma chave de instância.';
          } else if (response.status === 400 && errorData?.response?.message) {
            // Check for "number not exists" error
            const notExistsEntry = Array.isArray(errorData.response.message) 
              ? errorData.response.message.find((m: any) => m.exists === false)
              : null;
            if (notExistsEntry) {
              errorMsg = `O número ${notExistsEntry.number || formattedPhone} não está registrado no WhatsApp`;
            } else {
              errorMsg = Array.isArray(errorData.response.message) 
                ? errorData.response.message.map((m: any) => m.message || JSON.stringify(m)).join(', ')
                : String(errorData.response.message);
            }
          } else if (errorData?.message) {
            errorMsg = String(errorData.message);
          }
          
          // Log failed test message
          await supabase.from('whatsapp_notifications').insert({
            ticket_id: null,
            phone_number: formattedPhone,
            message_content: testMessage,
            message_type: 'test',
            status: 'error',
            error_message: errorMsg,
            sent_at: null,
            external_id: null,
          });
          
          return new Response(
            JSON.stringify({ success: false, message: errorMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Test message sent successfully to:', formattedPhone, 'Data:', data);

        // Log successful test message
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: null,
          phone_number: formattedPhone,
          message_content: testMessage,
          message_type: 'test',
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          external_id: data?.key?.id || null,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Mensagem de teste enviada para ${formattedPhone}!`,
            data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Send-test fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        
        // Log failed test message
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: null,
          phone_number: formattedPhone,
          message_content: testMessage,
          message_type: 'test',
          status: 'error',
          error_message: `Erro de conexão: ${errorMessage}`,
          sent_at: null,
          external_id: null,
        });
        
        return new Response(
          JSON.stringify({ success: false, message: `Erro de conexão: ${errorMessage}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'send') {
      if (!phone || !message) {
        return new Response(
          JSON.stringify({ success: false, message: 'Telefone e mensagem são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Format phone number with country code
      const formattedPhone = formatPhoneNumber(phone, settings.defaultCountryCode || '55');
      console.log('Sending WhatsApp message - Original:', phone, '-> Formatted:', formattedPhone);

      // Initialize supabase client for logging
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Determine message type
      const messageType = ticketId ? 'notification' : 'manual';

      try {
        const response = await fetch(
          `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: message,
            }),
          }
        );

        console.log('Evolution API send response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Evolution API send error:', {
            status: response.status,
            error: errorData?.error,
            response: errorData?.response
          });
          
          let errorMsg = `Erro ao enviar: ${response.status}`;
          if (response.status === 401) {
            errorMsg = 'Erro de autenticação (401): Verifique se a API Key é a Global API Key do servidor Evolution (AUTHENTICATION_API_KEY), não uma chave de instância.';
          } else if (response.status === 400 && errorData?.response?.message) {
            // Parse Evolution API error messages properly
            const messages = errorData.response.message;
            if (Array.isArray(messages)) {
              const parsedMessages: string[] = [];
              for (const m of messages) {
                if (typeof m === 'string') {
                  parsedMessages.push(m);
                } else if (m?.exists === false) {
                  // Number not registered on WhatsApp
                  parsedMessages.push(`Número ${m.number || formattedPhone} não está registrado no WhatsApp`);
                } else if (m?.message) {
                  parsedMessages.push(m.message);
                } else if (m?.error) {
                  parsedMessages.push(m.error);
                } else {
                  // Fallback - stringify but handle [object Object]
                  const str = JSON.stringify(m);
                  if (str !== '{}') {
                    parsedMessages.push(str);
                  }
                }
              }
              errorMsg = parsedMessages.length > 0 
                ? parsedMessages.join('; ') 
                : `Erro 400: Verifique o formato do número (${formattedPhone})`;
            } else if (typeof messages === 'object') {
              errorMsg = JSON.stringify(messages);
            } else {
              errorMsg = String(messages);
            }
          } else if (response.status === 400) {
            errorMsg = `Erro 400: Número inválido ou mal formatado (${formattedPhone})`;
          }
          
          // Log failed message - always log regardless of ticketId
          await supabase.from('whatsapp_notifications').insert({
            ticket_id: ticketId || null,
            phone_number: formattedPhone,
            message_content: message,
            message_type: messageType,
            status: 'error',
            error_message: errorMsg,
            sent_at: null,
            external_id: null,
          });
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: errorMsg 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Message sent successfully to:', formattedPhone, 'Data:', data);

        // Log successful message - always log regardless of ticketId
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: ticketId || null,
          phone_number: formattedPhone,
          message_content: message,
          message_type: messageType,
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          external_id: data?.key?.id || null,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Mensagem enviada com sucesso', data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Send fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        
        // Log failed message
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: ticketId || null,
          phone_number: formattedPhone,
          message_content: message,
          message_type: messageType,
          status: 'error',
          error_message: `Erro ao enviar: ${errorMessage}`,
          sent_at: null,
          external_id: null,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro ao enviar: ${errorMessage}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send message to WhatsApp group
    if (action === 'send-group') {
      if (!groupId || !message) {
        return new Response(
          JSON.stringify({ success: false, message: 'ID do grupo e mensagem são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Sending WhatsApp message to group:', groupId);

      // Initialize supabase client for logging
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const response = await fetch(
          `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: groupId,
              text: message,
            }),
          }
        );

        console.log('Evolution API send-group response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Evolution API send-group error:', {
            status: response.status,
            error: errorData?.error,
            response: errorData?.response
          });
          
          let errorMsg = `Erro ao enviar para grupo: ${response.status}`;
          if (response.status === 401) {
            errorMsg = 'Erro de autenticação (401): Verifique a API Key.';
          } else if (errorData?.response?.message) {
            // Parse Evolution API error messages properly (same logic as send action)
            const messages = errorData.response.message;
            if (Array.isArray(messages)) {
              const parsedMessages: string[] = [];
              for (const m of messages) {
                if (typeof m === 'string') {
                  parsedMessages.push(m);
                } else if (m?.message) {
                  parsedMessages.push(m.message);
                } else if (m?.error) {
                  parsedMessages.push(m.error);
                } else {
                  const str = JSON.stringify(m);
                  if (str !== '{}') {
                    parsedMessages.push(str);
                  }
                }
              }
              errorMsg = parsedMessages.length > 0 
                ? parsedMessages.join('; ') 
                : `Erro ao enviar para grupo: ${response.status}`;
            } else if (typeof messages === 'object') {
              errorMsg = JSON.stringify(messages);
            } else {
              errorMsg = String(messages);
            }
          }
          
          // Log failed message
          await supabase.from('whatsapp_notifications').insert({
            ticket_id: ticketId || null,
            phone_number: groupId,
            message_content: message,
            message_type: 'group_notification',
            status: 'error',
            error_message: errorMsg,
            sent_at: null,
            external_id: null,
          });
          
          return new Response(
            JSON.stringify({ success: false, message: errorMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Message sent successfully to group:', groupId, 'Data:', data);

        // Log successful message
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: ticketId || null,
          phone_number: groupId,
          message_content: message,
          message_type: 'group_notification',
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          external_id: data?.key?.id || null,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Mensagem enviada para o grupo com sucesso', data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Send-group fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        
        // Log failed message
        await supabase.from('whatsapp_notifications').insert({
          ticket_id: ticketId || null,
          phone_number: groupId,
          message_content: message,
          message_type: 'group_notification',
          status: 'error',
          error_message: `Erro ao enviar: ${errorMessage}`,
          sent_at: null,
          external_id: null,
        });
        
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao enviar: ${errorMessage}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação inválida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error in send-whatsapp function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
