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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, message, ticketId, instanceName, settings: providedSettings } = await req.json();

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
        const instanceList = Array.isArray(instances) 
          ? instances.map((inst: any) => ({
              name: inst.instance?.instanceName || inst.instanceName || inst.name,
              displayName: inst.instance?.instanceName || inst.instanceName || inst.name,
              state: inst.connectionStatus || inst.instance?.state || inst.state || 'unknown',
              profileName: inst.instance?.profileName || inst.profileName || null,
              profilePictureUrl: inst.profilePicUrl || inst.instance?.profilePictureUrl || inst.profilePictureUrl || null
            }))
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
      // Test connection by checking instance status
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
              message: `Erro da API: ${response.status} - ${errorText}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Evolution API response:', data);

        const state = data?.instance?.state || data?.state || 'unknown';
        
        if (state === 'open' || state === 'connected') {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `WhatsApp conectado (${settings.evolutionInstance})` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `WhatsApp não conectado. Estado: ${state}` 
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
            message: `Erro de conexão: ${errorMessage}` 
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

      const testMessage = message || '✅ Teste de integração WhatsApp realizado com sucesso! - Sistema de Racks';
      console.log('Sending test WhatsApp message to:', phone);

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
              number: phone,
              text: testMessage,
            }),
          }
        );

        console.log('Evolution API send-test response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Evolution API send-test error:', errorData);
          
          // Enhanced error message for 401 errors
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Erro de autenticação (401): Verifique se a API Key é a Global API Key do servidor Evolution (AUTHENTICATION_API_KEY), não uma chave de instância.' 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          let errorMsg = `Erro ${response.status}`;
          if (errorData?.response?.message) {
            errorMsg = Array.isArray(errorData.response.message) 
              ? errorData.response.message.join(', ') 
              : String(errorData.response.message);
          } else if (errorData?.message) {
            errorMsg = String(errorData.message);
          }
          
          return new Response(
            JSON.stringify({ success: false, message: errorMsg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Test message sent successfully:', data);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Mensagem de teste enviada para ${phone}!`,
            data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Send-test fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
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

      console.log('Sending WhatsApp message to:', phone);

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
              number: phone,
              text: message,
            }),
          }
        );

        console.log('Evolution API send response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Evolution API send error:', errorData);
          
          // Enhanced error message for 401 errors
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Erro de autenticação (401): Verifique se a API Key é a Global API Key do servidor Evolution (AUTHENTICATION_API_KEY), não uma chave de instância.' 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Erro ao enviar: ${response.status}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Message sent successfully:', data);

        // Log to whatsapp_notifications table
        if (ticketId) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.from('whatsapp_notifications').insert({
            ticket_id: ticketId,
            phone_number: phone,
            message_content: message,
            message_type: 'notification',
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: data?.key?.id || null,
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Mensagem enviada com sucesso', data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Send fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro ao enviar: ${errorMessage}` 
          }),
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
