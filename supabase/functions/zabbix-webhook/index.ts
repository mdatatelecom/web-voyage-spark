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
  const sev = typeof severity === 'string' ? parseInt(severity, 10) : severity;
  if (sev >= 4) return 'critical';
  if (sev >= 2) return 'warning';
  return 'info';
};

// Mapear tipo de alerta
type AlertType = 'capacity_warning' | 'capacity_critical' | 'deadline_warning' | 'maintenance_required' | 'custom';

const mapZabbixAlertType = (trigger: string): AlertType => {
  const t = trigger.toLowerCase();
  if (t.includes('capacity') || t.includes('disk') || t.includes('memory')) return 'capacity_warning';
  if (t.includes('critical') || t.includes('down') || t.includes('offline')) return 'capacity_critical';
  if (t.includes('maintenance')) return 'maintenance_required';
  return 'custom';
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
    const timestamp = payload.timestamp || payload.event_time || new Date().toISOString();
    const ip = payload.ip || payload.host_ip || '';
    const itemValue = payload.item_value || '';

    // Converter severidade para o formato do sistema
    const alertSeverity = mapZabbixSeverity(severity);
    const alertType = mapZabbixAlertType(trigger);

    // Criar título formatado
    const title = `[${host}] ${trigger}`;
    
    // Construir mensagem detalhada
    const detailedMessage = [
      message,
      ip ? `IP: ${ip}` : '',
      itemValue ? `Valor: ${itemValue}` : '',
      `Status: ${status}`,
      `Event ID: ${eventId}`,
    ].filter(Boolean).join(' | ');

    console.log('Creating alert:', { title, alertSeverity, alertType });

    // Se for um evento de RECOVERY (problema resolvido), tentar resolver alertas existentes
    if (status.toUpperCase() === 'OK' || status.toUpperCase() === 'RESOLVED') {
      console.log('Recovery event detected, resolving existing alerts for:', host);
      
      const { data: existingAlerts, error: fetchError } = await supabase
        .from('alerts')
        .select('id')
        .eq('status', 'active')
        .contains('metadata', { host, trigger });
      
      if (fetchError) {
        console.error('Error fetching existing alerts:', fetchError);
      } else if (existingAlerts && existingAlerts.length > 0) {
        for (const alert of existingAlerts) {
          await supabase
            .from('alerts')
            .update({ 
              status: 'resolved', 
              resolved_at: new Date().toISOString() 
            })
            .eq('id', alert.id);
        }
        console.log(`Resolved ${existingAlerts.length} alerts`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'resolved',
            resolved_count: existingAlerts.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Inserir novo alerta no banco
    const { data: alertData, error: insertError } = await supabase
      .from('alerts')
      .insert({
        type: alertType,
        severity: alertSeverity,
        status: 'active',
        title: title.substring(0, 255),
        message: detailedMessage.substring(0, 1000),
        metadata: {
          source: 'zabbix',
          host,
          trigger,
          severity,
          status,
          eventid: eventId,
          ip,
          item_value: itemValue,
          original_timestamp: timestamp,
          raw_payload: payload,
        },
        related_entity_type: 'zabbix_host',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting alert:', insertError);
      throw insertError;
    }

    console.log('Alert created successfully:', alertData.id);

    // Enviar notificações se severidade for alta (critical)
    if (alertSeverity === 'critical') {
      console.log('Critical alert - sending notifications...');
      
      // Buscar configurações de WhatsApp
      const { data: whatsappSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp')
        .single();

      if (whatsappSettings?.setting_value?.enabled) {
        try {
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              message: `🚨 *ALERTA CRÍTICO*\n\n*Host:* ${host}\n*Trigger:* ${trigger}\n*Mensagem:* ${message}\n\n_Evento Zabbix #${eventId}_`,
              notification_type: 'zabbix_alert',
            },
          });
          console.log('WhatsApp notification sent');
        } catch (e) {
          console.error('Error sending WhatsApp:', e);
        }
      }

      // Enviar email
      try {
        await supabase.functions.invoke('send-alert-email', {
          body: {
            alertId: alertData.id,
            subject: `🚨 Alerta Crítico: ${title}`,
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
