import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoredDevice {
  id: string;
  device_id: string;
  hostname: string | null;
  status: string;
  last_seen: string | null;
  is_active: boolean;
}

interface OfflineAlertConfig {
  id: string;
  device_uuid: string;
  offline_threshold_minutes: number;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  last_alert_sent_at: string | null;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting device status check...');

    // Buscar todos os dispositivos ativos
    const { data: devices, error: devicesError } = await supabase
      .from('monitored_devices')
      .select('*')
      .eq('is_active', true);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      throw devicesError;
    }

    const typedDevices = devices as MonitoredDevice[];
    console.log(`Found ${typedDevices.length} active devices`);

    // Buscar configurações de alerta
    const { data: alertConfigs, error: configError } = await supabase
      .from('device_offline_alerts')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      console.error('Error fetching alert configs:', configError);
    }

    const configs = (alertConfigs || []) as OfflineAlertConfig[];
    const configMap = new Map(configs.map(c => [c.device_uuid, c]));

    const now = new Date();
    const alertsToSend: Array<{ device: MonitoredDevice; config: OfflineAlertConfig }> = [];

    for (const device of typedDevices) {
      const config = configMap.get(device.id);
      const thresholdMinutes = config?.offline_threshold_minutes || 5;

      if (!device.last_seen) {
        console.log(`Device ${device.device_id} has never been seen, skipping`);
        continue;
      }

      const lastSeen = new Date(device.last_seen);
      const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

      console.log(`Device ${device.device_id}: last seen ${minutesSinceLastSeen.toFixed(1)} minutes ago (threshold: ${thresholdMinutes})`);

      if (minutesSinceLastSeen > thresholdMinutes) {
        // Verificar se já não enviamos alerta recentemente (últimos 30 minutos)
        if (config?.last_alert_sent_at) {
          const lastAlert = new Date(config.last_alert_sent_at);
          const minutesSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60);
          
          if (minutesSinceLastAlert < 30) {
            console.log(`Skipping alert for ${device.device_id} - already alerted ${minutesSinceLastAlert.toFixed(1)} minutes ago`);
            continue;
          }
        }

        // Atualizar status para offline
        await supabase
          .from('monitored_devices')
          .update({ status: 'offline' })
          .eq('id', device.id);

        // Criar alerta no sistema de alertas
        const alertMessage = `Dispositivo ${device.hostname || device.device_id} está offline há mais de ${thresholdMinutes} minutos`;
        
        const { error: alertError } = await supabase
          .from('alerts')
          .insert({
            type: 'device_offline',
            severity: 'critical',
            message: alertMessage,
            status: 'active',
            related_entity_type: 'device',
            related_entity_id: device.id
          });

        if (alertError) {
          console.error('Error creating alert:', alertError);
        } else {
          console.log(`Created alert for device ${device.device_id}`);
        }

        if (config) {
          alertsToSend.push({ device, config });
          
          // Atualizar timestamp do último alerta
          await supabase
            .from('device_offline_alerts')
            .update({ last_alert_sent_at: now.toISOString() })
            .eq('id', config.id);
        }
      }
    }

    // Enviar notificações
    for (const { device, config } of alertsToSend) {
      const message = `⚠️ *ALERTA DE DISPOSITIVO OFFLINE*\n\nDispositivo: ${device.hostname || device.device_id}\nÚltimo contato: ${device.last_seen ? new Date(device.last_seen).toLocaleString('pt-BR') : 'Nunca'}\n\nVerifique a conectividade do equipamento.`;

      // Enviar WhatsApp se habilitado
      if (config.whatsapp_enabled) {
        try {
          // Buscar grupos de WhatsApp ativos
          const { data: groups } = await supabase
            .from('whatsapp_groups')
            .select('group_id')
            .eq('is_active', true)
            .limit(1);

          if (groups && groups.length > 0) {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                group_id: groups[0].group_id,
                message
              }
            });
            console.log(`WhatsApp alert sent for device ${device.device_id}`);
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp:', whatsappError);
        }
      }

      // Enviar email se habilitado
      if (config.email_enabled) {
        try {
          // Buscar admins para notificar
          const { data: admins } = await supabase
            .from('notification_settings')
            .select('user_id, profiles!inner(id)')
            .eq('email_enabled', true);

          if (admins && admins.length > 0) {
            await supabase.functions.invoke('send-alert-email', {
              body: {
                subject: `[CRÍTICO] Dispositivo Offline: ${device.hostname || device.device_id}`,
                message: message.replace(/\*/g, '').replace(/\n/g, '<br>')
              }
            });
            console.log(`Email alert sent for device ${device.device_id}`);
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        devicesChecked: typedDevices.length,
        alertsSent: alertsToSend.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-device-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
