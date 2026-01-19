import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapear severidades do Zabbix para o sistema de alertas
// Zabbix: 0=Not classified, 1=Information, 2=Warning, 3=Average, 4=High, 5=Disaster
type AlertSeverity = 'info' | 'warning' | 'critical';

const mapZabbixSeverity = (severity: number | string): AlertSeverity => {
  // Mapeamento por texto (quando Zabbix envia nome da severidade)
  if (typeof severity === 'string') {
    const lower = severity.toLowerCase().trim();
    
    // Severidades críticas
    if (['high', 'disaster', 'critical', 'alta', 'desastre', 'crítico', 'critico'].includes(lower)) {
      return 'critical';
    }
    
    // Severidades de aviso
    if (['average', 'warning', 'média', 'media', 'aviso', 'atenção', 'atencao'].includes(lower)) {
      return 'warning';
    }
    
    // Tentar como número se não for texto conhecido
    const num = parseInt(severity, 10);
    if (!isNaN(num)) {
      if (num >= 4) return 'critical';
      if (num >= 2) return 'warning';
      return 'info';
    }
    
    return 'info';
  }
  
  // Mapeamento por número
  if (severity >= 4) return 'critical';
  if (severity >= 2) return 'warning';
  return 'info';
};

// Usar sempre 'zabbix_alert' como tipo
const getAlertType = (): string => 'zabbix_alert';

// Detectar macros não resolvidas do Zabbix
const hasUnresolvedMacros = (value: string): boolean => {
  return /\{[A-Z_]+\.[A-Z_]+\}/.test(value) || /\{[A-Z_]+\}/.test(value);
};

// Validar payload do Zabbix
const validatePayload = (payload: ZabbixPayload): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const host = payload.host || payload.hostname || '';
  const trigger = payload.trigger || payload.trigger_name || '';
  
  if (hasUnresolvedMacros(host)) {
    errors.push(`Campo 'host' contém macro não resolvida: ${host}`);
  }
  
  if (hasUnresolvedMacros(trigger)) {
    errors.push(`Campo 'trigger' contém macro não resolvida: ${trigger}`);
  }
  
  if (!host || host === 'Unknown Host') {
    errors.push("Campo 'host' ou 'hostname' é obrigatório");
  }
  
  if (!trigger || trigger === 'Unknown Trigger') {
    errors.push("Campo 'trigger' ou 'trigger_name' é obrigatório");
  }
  
  return { valid: errors.length === 0, errors };
};

interface ZabbixPayload {
  host?: string;
  hostname?: string;
  trigger?: string;
  trigger_name?: string;
  severity?: number | string;
  trigger_severity?: number | string;
  status?: string;
  trigger_status?: string;
  eventid?: string;
  event_id?: string;
  message?: string;
  timestamp?: string;
  event_time?: string;
  ip?: string;
  host_ip?: string;
  item_value?: string;
  description?: string;
  datetime?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Zabbix Webhook Received ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers));

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload - pode vir como JSON ou form-data
    let payload: ZabbixPayload = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        (payload as any)[key] = value;
      });
    } else {
      // Try JSON anyway
      try {
        const text = await req.text();
        payload = JSON.parse(text);
      } catch {
        console.log('Could not parse body, using empty payload');
      }
    }

    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    // Extrair campos do payload (Zabbix pode usar diferentes nomes)
    const host = payload.host || payload.hostname || 'Unknown Host';
    const trigger = payload.trigger || payload.trigger_name || 'Unknown Trigger';
    const severity = payload.severity ?? payload.trigger_severity ?? 2;
    const status = payload.status || payload.trigger_status || 'PROBLEM';
    const eventId = payload.eventid || payload.event_id || '';
    const message = payload.message || payload.description || `Trigger: ${trigger}`;
    const timestamp = payload.timestamp || payload.event_time || payload.datetime || new Date().toISOString();
    const ip = payload.ip || payload.host_ip || '';
    const itemValue = payload.item_value || '';

    // Validar payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('Payload validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payload inválido',
          details: validation.errors,
          help: 'Verifique se as macros do Zabbix estão sendo resolvidas corretamente. Use {HOST.NAME}, {TRIGGER.NAME}, etc.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Converter severidade para o formato do sistema
    const alertSeverity = mapZabbixSeverity(severity);
    const alertType = getAlertType();

    // Criar título formatado
    const title = `[${host}] ${trigger}`;
    
    // Construir mensagem detalhada
    const detailedMessage = [
      message,
      ip ? `IP: ${ip}` : '',
      itemValue ? `Valor: ${itemValue}` : '',
      `Status: ${status}`,
      eventId ? `Event ID: ${eventId}` : '',
    ].filter(Boolean).join(' | ');

    console.log('Processing alert:', { host, trigger, status, alertSeverity, eventId });

    // Se for um evento de RECOVERY (problema resolvido), resolver alertas existentes
    const normalizedStatus = status.toUpperCase().trim();
    if (normalizedStatus === 'OK' || normalizedStatus === 'RESOLVED' || normalizedStatus === 'RESOLVIDO') {
      console.log('Recovery event detected, resolving existing alerts...');
      
      // Primeiro, tentar encontrar por eventid se disponível
      let existingAlerts: any[] = [];
      
      if (eventId) {
        // Buscar alerta pelo eventid original (mais preciso)
        const { data: alertsByEventId, error: fetchError } = await supabase
          .from('alerts')
          .select('id, metadata')
          .eq('status', 'active')
          .eq('type', 'zabbix_alert');
        
        if (!fetchError && alertsByEventId) {
          existingAlerts = alertsByEventId.filter((alert: any) => 
            alert.metadata?.eventid === eventId ||
            (alert.metadata?.host === host && alert.metadata?.trigger === trigger)
          );
        }
      }
      
      // Se não encontrou por eventid, buscar por host + trigger
      if (existingAlerts.length === 0) {
        const { data: alertsByHostTrigger, error: fetchError2 } = await supabase
          .from('alerts')
          .select('id, metadata')
          .eq('status', 'active')
          .eq('type', 'zabbix_alert');
        
        if (!fetchError2 && alertsByHostTrigger) {
          existingAlerts = alertsByHostTrigger.filter((alert: any) => 
            alert.metadata?.host === host && alert.metadata?.trigger === trigger
          );
        }
      }
      
      if (existingAlerts.length > 0) {
        const alertIds = existingAlerts.map((a: any) => a.id);
        
        const { error: updateError } = await supabase
          .from('alerts')
          .update({ 
            status: 'resolved', 
            resolved_at: new Date().toISOString(),
            metadata: existingAlerts[0].metadata ? {
              ...existingAlerts[0].metadata,
              recovery_eventid: eventId,
              recovery_timestamp: timestamp,
            } : undefined
          })
          .in('id', alertIds);
        
        if (updateError) {
          console.error('Error resolving alerts:', updateError);
        } else {
          console.log(`Resolved ${existingAlerts.length} alerts:`, alertIds);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'resolved',
            resolved_count: existingAlerts.length,
            resolved_ids: alertIds
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('No active alerts found to resolve for host/trigger:', host, trigger);
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'no_action',
            message: 'Nenhum alerta ativo encontrado para resolver'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Try to correlate with equipment by IP or hostname
    let relatedEntityId: string | null = null;
    let relatedEntityType = 'zabbix_host';

    if (ip || host) {
      // First try by IP
      if (ip) {
        const { data: equipmentByIp } = await supabase
          .from('equipment')
          .select('id')
          .eq('ip_address', ip)
          .single();
        
        if (equipmentByIp) {
          relatedEntityId = equipmentByIp.id;
          relatedEntityType = 'equipment';
          console.log('Found equipment by IP:', ip, '->', relatedEntityId);
        }
      }
      
      // If not found by IP, try by hostname
      if (!relatedEntityId && host && host !== 'Unknown Host') {
        const { data: equipmentByHostname } = await supabase
          .from('equipment')
          .select('id')
          .eq('hostname', host)
          .single();
        
        if (equipmentByHostname) {
          relatedEntityId = equipmentByHostname.id;
          relatedEntityType = 'equipment';
          console.log('Found equipment by hostname:', host, '->', relatedEntityId);
        }
      }

      // Try by zabbix_host_id if equipment was previously linked
      if (!relatedEntityId && host && host !== 'Unknown Host') {
        const { data: equipmentByZabbixId } = await supabase
          .from('equipment')
          .select('id')
          .eq('zabbix_host_id', host)
          .single();
        
        if (equipmentByZabbixId) {
          relatedEntityId = equipmentByZabbixId.id;
          relatedEntityType = 'equipment';
          console.log('Found equipment by zabbix_host_id:', host, '->', relatedEntityId);
        }
      }
    }

    // Verificar se já existe alerta ativo para mesmo host/trigger (evitar duplicatas)
    const { data: existingActive } = await supabase
      .from('alerts')
      .select('id')
      .eq('status', 'active')
      .eq('type', 'zabbix_alert')
      .limit(100);
    
    const duplicateAlert = existingActive?.find((alert: any) => {
      // Precisamos buscar metadata para verificar
      return false; // Por enquanto, permitir criação
    });

    // Inserir novo alerta no banco
    const { data: alertData, error: insertError } = await supabase
      .from('alerts')
      .insert({
        type: alertType,
        severity: alertSeverity,
        status: 'active',
        title: title.substring(0, 255),
        message: detailedMessage.substring(0, 1000),
        related_entity_id: relatedEntityId,
        related_entity_type: relatedEntityType,
        metadata: {
          source: 'zabbix',
          host,
          trigger,
          severity: String(severity),
          severity_mapped: alertSeverity,
          status,
          eventid: eventId,
          ip,
          item_value: itemValue,
          original_timestamp: timestamp,
          raw_payload: payload,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting alert:', insertError);
      throw insertError;
    }

    console.log('Alert created successfully:', alertData.id, '- Severity:', alertSeverity);

    // Buscar configurações específicas do Zabbix para notificações
    const { data: zabbixSettings } = await supabase
      .from('alert_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['zabbix_enabled', 'zabbix_whatsapp_enabled', 'zabbix_min_severity']);

    const zabbixEnabled = zabbixSettings?.find(s => s.setting_key === 'zabbix_enabled')?.setting_value ?? 1;
    const zabbixWhatsappEnabled = zabbixSettings?.find(s => s.setting_key === 'zabbix_whatsapp_enabled')?.setting_value ?? 1;
    const zabbixMinSeverity = zabbixSettings?.find(s => s.setting_key === 'zabbix_min_severity')?.setting_value ?? 2;

    // Mapeamento de severidade para nível numérico
    const severityLevel: Record<string, number> = {
      'info': 1,
      'warning': 2,
      'critical': 3
    };

    const alertLevel = severityLevel[alertSeverity] || 1;
    const shouldSendWhatsApp = zabbixEnabled && zabbixWhatsappEnabled && alertLevel >= zabbixMinSeverity;

    console.log('Notification check:', { 
      zabbixEnabled, 
      zabbixWhatsappEnabled, 
      zabbixMinSeverity, 
      alertLevel, 
      alertSeverity,
      shouldSendWhatsApp 
    });

    // Emojis por severidade
    const severityEmoji: Record<string, string> = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🚨'
    };
    const emoji = severityEmoji[alertSeverity] || '📢';

    // Enviar notificação WhatsApp se configurado
    if (shouldSendWhatsApp) {
      console.log('Sending WhatsApp notification...');
      
      // Buscar configurações de WhatsApp (chave correta: whatsapp_settings)
      const { data: whatsappSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_settings')
        .single();

      console.log('WhatsApp settings:', JSON.stringify(whatsappSettings?.setting_value, null, 2));

      if (whatsappSettings?.setting_value?.isEnabled) {
        const settings = whatsappSettings.setting_value;
        const targetType = settings.targetType || 'individual';
        
        const notificationMessage = `${emoji} *ALERTA ZABBIX (${alertSeverity.toUpperCase()})*\n\n*Host:* ${host}\n*Trigger:* ${trigger}\n*Severidade:* ${severity}\n*Mensagem:* ${message}\n${ip ? `*IP:* ${ip}\n` : ''}\n_Evento #${eventId}_`;

        try {
          if (targetType === 'group' && settings.selectedGroupId) {
            // Enviar para grupo configurado
            console.log('Sending to group:', settings.selectedGroupId);
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send-group',
                groupId: settings.selectedGroupId,
                message: notificationMessage,
                notification_type: 'zabbix_alert',
              },
            });
            console.log('WhatsApp group notification sent to:', settings.selectedGroupId);
          } else {
            // Enviar para número individual (buscar admins)
            console.log('Sending individual notification...');
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                action: 'send',
                message: notificationMessage,
                notification_type: 'zabbix_alert',
              },
            });
            console.log('WhatsApp individual notification sent');
          }
        } catch (e) {
          console.error('Error sending WhatsApp notification:', e);
        }
      } else {
        console.log('WhatsApp not enabled in settings');
      }
    }

    // Enviar email apenas para alertas críticos
    if (alertSeverity === 'critical') {
      try {
        await supabase.functions.invoke('send-alert-email', {
          body: {
            alertId: alertData.id,
            subject: `🚨 Alerta Crítico Zabbix: ${title}`,
            message: detailedMessage,
          },
        });
        console.log('Email notification sent');
      } catch (e) {
        console.error('Error sending email:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: 'created',
        alert_id: alertData.id,
        severity: alertSeverity,
        severity_original: severity,
        notifications_sent: alertSeverity === 'critical',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
