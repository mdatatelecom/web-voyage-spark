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

// Mapear severidade do EPI Monitor
const mapEpiSeverity = (severity?: string): AlertSeverity => {
  if (!severity) return 'warning';
  const lower = severity.toLowerCase().trim();
  if (['critical', 'critico', 'crítico', 'high', 'alta'].includes(lower)) return 'critical';
  if (['warning', 'aviso', 'medium', 'média', 'media'].includes(lower)) return 'warning';
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

// Interface para payload do EPI Monitor
interface EpiPayload {
  test?: boolean;
  source?: string;
  message?: string;
  timestamp?: string;
  alert_type?: string;
  equipment_name?: string;
  employee_name?: string;
  severity?: string;
  due_date?: string;
  department?: string;
  // Campos de imagem - nomes padrão
  camera?: string;
  risk?: string;
  image?: string;        // URL direta da imagem
  image_base64?: string; // Imagem em base64 (alternativa)
  // Campos alternativos de imagem (compatibilidade)
  screenshot?: string;
  foto?: string;
  anexo?: string;
  imagem?: string;
  screenshot_base64?: string;
  foto_base64?: string;
}

// Função para fazer upload de imagem base64 para o storage
const uploadEpiImage = async (
  supabase: any, 
  base64Data: string, 
  alertId: string
): Promise<string | null> => {
  try {
    // Remover prefixo data:image/...;base64, se presente
    let cleanBase64 = base64Data;
    if (base64Data.includes(',')) {
      cleanBase64 = base64Data.split(',')[1];
    }
    
    // Decodificar base64 para Uint8Array
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Determinar extensão baseado no prefixo (padrão: jpg)
    let extension = 'jpg';
    let contentType = 'image/jpeg';
    if (base64Data.includes('data:image/png')) {
      extension = 'png';
      contentType = 'image/png';
    } else if (base64Data.includes('data:image/gif')) {
      extension = 'gif';
      contentType = 'image/gif';
    } else if (base64Data.includes('data:image/webp')) {
      extension = 'webp';
      contentType = 'image/webp';
    }
    
    const timestamp = Date.now();
    const fileName = `epi-alerts/${timestamp}-${alertId}.${extension}`;
    
    // Upload para o bucket 'public'
    const { data, error } = await supabase.storage
      .from('public')
      .upload(fileName, bytes, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error('Error uploading EPI image:', error);
      return null;
    }
    
    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('public')
      .getPublicUrl(fileName);
    
    console.log('EPI image uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.error('Error processing EPI image:', e);
    return null;
  }
};

// Detectar se é payload do EPI Monitor
const isEpiMonitorPayload = (payload: any): boolean => {
  return payload.test !== undefined || 
         payload.source === 'epi_monitor' ||
         (!payload.host && !payload.hostname && !payload.trigger && !payload.trigger_name && (payload.message || payload.equipment_name));
};

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

    // ========== PROCESSAR PAYLOAD DO EPI MONITOR ==========
    if (isEpiMonitorPayload(payload)) {
      console.log('EPI Monitor payload detected');
      console.log('All payload fields:', Object.keys(payload));
      const epiPayload = payload as EpiPayload;

      // Se é apenas teste, retornar sucesso
      if (epiPayload.test) {
        console.log('EPI Monitor test payload received successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Conexão com EPI Monitor estabelecida com sucesso',
            received_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se EPI está habilitado
      const { data: epiSettings } = await supabase
        .from('alert_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['epi_enabled', 'epi_whatsapp_enabled', 'epi_min_severity']);

      const epiEnabled = epiSettings?.find(s => s.setting_key === 'epi_enabled')?.setting_value ?? 1;
      
      if (!epiEnabled) {
        console.log('EPI Monitor integration is disabled');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Integração EPI Monitor está desabilitada'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Processar alerta real do EPI
      const epiSeverity = mapEpiSeverity(epiPayload.severity);
      
      // Construir título baseado no risco ou tipo de alerta
      const riskInfo = epiPayload.risk || epiPayload.alert_type || epiPayload.message;
      const cameraInfo = epiPayload.camera ? ` na ${epiPayload.camera}` : '';
      const title = `[EPI] ${riskInfo}${cameraInfo}`;
      
      const detailedMessage = [
        epiPayload.message,
        epiPayload.risk ? `Risco: ${epiPayload.risk}` : '',
        epiPayload.camera ? `Câmera: ${epiPayload.camera}` : '',
        epiPayload.equipment_name ? `EPI: ${epiPayload.equipment_name}` : '',
        epiPayload.employee_name ? `Funcionário: ${epiPayload.employee_name}` : '',
        epiPayload.department ? `Departamento: ${epiPayload.department}` : '',
        epiPayload.due_date ? `Vencimento: ${epiPayload.due_date}` : '',
      ].filter(Boolean).join(' | ');

      // Gerar ID temporário para upload de imagem
      const tempAlertId = crypto.randomUUID();
      
      // Processar imagem (URL direta ou base64) - suportar campos alternativos
      let imageUrl: string | null = null;
      
      // Buscar imagem em vários campos possíveis (URL direta ou base64)
      const imageField = epiPayload.image || 
                         epiPayload.screenshot || 
                         epiPayload.foto || 
                         epiPayload.anexo || 
                         epiPayload.imagem;
      
      // Buscar imagem em campos base64 explícitos
      const base64Field = epiPayload.image_base64 || 
                          epiPayload.screenshot_base64 || 
                          epiPayload.foto_base64;
      
      // Função para detectar se é base64 (não é URL)
      const isBase64 = (str: string): boolean => {
        if (!str) return false;
        // Se começa com http, é URL
        if (str.startsWith('http://') || str.startsWith('https://')) return false;
        // Se começa com data:image, é base64 com prefixo
        if (str.startsWith('data:image')) return true;
        // Se começa com /9j/ (JPEG) ou iVBOR (PNG), é base64 puro
        if (str.startsWith('/9j/') || str.startsWith('iVBOR')) return true;
        // Tentar validar como base64 (pelo menos 100 caracteres e só caracteres válidos)
        if (str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str.substring(0, 100))) return true;
        return false;
      };
      
      console.log('Image fields check:', { 
        hasImage: !!imageField, 
        hasBase64: !!base64Field,
        imageFieldIsBase64: imageField ? isBase64(imageField) : false,
        imageFieldPreview: imageField ? imageField.substring(0, 50) + '...' : 'null',
        base64FieldValue: base64Field ? 'Base64 explicit received' : 'null'
      });
      
      if (imageField) {
        if (isBase64(imageField)) {
          // Campo image contém base64 - fazer upload para storage
          console.log('EPI image field contains base64, uploading to storage...');
          imageUrl = await uploadEpiImage(supabase, imageField, tempAlertId);
        } else {
          // Campo image contém URL direta
          imageUrl = imageField;
          console.log('EPI image URL received:', imageUrl);
        }
      } else if (base64Field) {
        // Campo base64 explícito - fazer upload para o storage
        console.log('EPI image base64 field received, uploading to storage...');
        imageUrl = await uploadEpiImage(supabase, base64Field, tempAlertId);
      }

      // Preparar metadata do alerta (sem incluir o base64 bruto)
      const alertMetadata: Record<string, unknown> = {
        source: 'epi_monitor',
        camera: epiPayload.camera,
        risk: epiPayload.risk,
        employee_name: epiPayload.employee_name,
        department: epiPayload.department,
        equipment_name: epiPayload.equipment_name,
        due_date: epiPayload.due_date,
        alert_type: epiPayload.alert_type,
        timestamp: epiPayload.timestamp,
      };
      
      // Adicionar image_url se disponível
      if (imageUrl) {
        alertMetadata.image_url = imageUrl;
      }

      // Inserir alerta no banco
      const { data: alertData, error: insertError } = await supabase
        .from('alerts')
        .insert({
          type: 'epi_alert',
          severity: epiSeverity,
          status: 'active',
          title: title.substring(0, 255),
          message: detailedMessage.substring(0, 1000),
          metadata: alertMetadata
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting EPI alert:', insertError);
        throw insertError;
      }

      console.log('EPI Alert created successfully:', alertData.id, '- Severity:', epiSeverity, '- Has image:', !!imageUrl);

      // Verificar configurações de notificação
      const epiWhatsappEnabled = epiSettings?.find(s => s.setting_key === 'epi_whatsapp_enabled')?.setting_value ?? 1;
      const epiMinSeverity = epiSettings?.find(s => s.setting_key === 'epi_min_severity')?.setting_value ?? 2;

      const severityLevel: Record<string, number> = { 'info': 1, 'warning': 2, 'critical': 3 };
      const alertLevel = severityLevel[epiSeverity] || 1;
      const shouldSendWhatsApp = epiEnabled && epiWhatsappEnabled && alertLevel >= epiMinSeverity;

      console.log('EPI Notification check:', { epiEnabled, epiWhatsappEnabled, epiMinSeverity, alertLevel, shouldSendWhatsApp });

      // Emojis por severidade
      const severityEmoji: Record<string, string> = { 'info': 'ℹ️', 'warning': '⚠️', 'critical': '🚨' };
      const emoji = severityEmoji[epiSeverity] || '🦺';

      // Enviar notificação WhatsApp se configurado
      if (shouldSendWhatsApp) {
        console.log('Sending EPI WhatsApp notification...');
        
        const { data: whatsappSettings } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'whatsapp_settings')
          .single();

        if (whatsappSettings?.setting_value?.isEnabled) {
          const settings = whatsappSettings.setting_value;
          const targetType = settings.targetType || 'individual';
          
          const notificationMessage = `${emoji} *ALERTA EPI MONITOR (${epiSeverity.toUpperCase()})*\n\n*Tipo:* ${epiPayload.alert_type || 'Alerta'}\n*Mensagem:* ${epiPayload.message || '-'}\n${epiPayload.equipment_name ? `*EPI:* ${epiPayload.equipment_name}\n` : ''}${epiPayload.employee_name ? `*Funcionário:* ${epiPayload.employee_name}\n` : ''}${epiPayload.department ? `*Departamento:* ${epiPayload.department}\n` : ''}${epiPayload.due_date ? `*Vencimento:* ${epiPayload.due_date}\n` : ''}\n_${new Date().toLocaleString('pt-BR')}_`;

          try {
            if (targetType === 'group' && settings.selectedGroupId) {
              console.log('Sending EPI notification to group:', settings.selectedGroupId);
              await supabase.functions.invoke('send-whatsapp', {
                body: {
                  action: 'send-group',
                  groupId: settings.selectedGroupId,
                  message: notificationMessage,
                  notification_type: 'epi_alert',
                },
              });
              console.log('WhatsApp EPI notification sent to group');
            } else {
              console.log('Sending individual EPI notification...');
              await supabase.functions.invoke('send-whatsapp', {
                body: {
                  action: 'send',
                  message: notificationMessage,
                  notification_type: 'epi_alert',
                },
              });
              console.log('WhatsApp individual EPI notification sent');
            }
          } catch (e) {
            console.error('Error sending EPI WhatsApp notification:', e);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'created',
          alert_id: alertData.id,
          alert_type: 'epi_alert',
          severity: epiSeverity,
          notifications_sent: shouldSendWhatsApp,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== PROCESSAR PAYLOAD DO ZABBIX (CÓDIGO ORIGINAL) ==========
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
        
        // Enviar notificação WhatsApp de recuperação
        try {
          // Buscar configurações específicas do Zabbix
          const { data: zabbixSettings } = await supabase
            .from('alert_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['zabbix_enabled', 'zabbix_whatsapp_enabled', 'zabbix_recovery_notification']);

          const zabbixEnabled = zabbixSettings?.find(s => s.setting_key === 'zabbix_enabled')?.setting_value ?? 1;
          const zabbixWhatsappEnabled = zabbixSettings?.find(s => s.setting_key === 'zabbix_whatsapp_enabled')?.setting_value ?? 1;
          const zabbixRecoveryNotification = zabbixSettings?.find(s => s.setting_key === 'zabbix_recovery_notification')?.setting_value ?? 1;

          const shouldSendRecovery = zabbixEnabled && zabbixWhatsappEnabled && zabbixRecoveryNotification;
          console.log('Recovery notification check:', { zabbixEnabled, zabbixWhatsappEnabled, zabbixRecoveryNotification, shouldSendRecovery });

          if (shouldSendRecovery) {
            const { data: whatsappSettings } = await supabase
              .from('system_settings')
              .select('setting_value')
              .eq('setting_key', 'whatsapp_settings')
              .single();

            if (whatsappSettings?.setting_value?.isEnabled) {
              const settings = whatsappSettings.setting_value;
              const targetType = settings.targetType || 'individual';
              
              const recoveryMessage = `✅ *ALERTA ZABBIX RESOLVIDO*\n\n*Host:* ${host}\n*Trigger:* ${trigger}\n*Resolvido em:* ${new Date().toLocaleString('pt-BR')}\n${ip ? `*IP:* ${ip}\n` : ''}\n_Evento #${eventId}_`;

              if (targetType === 'group' && settings.selectedGroupId) {
                console.log('Sending recovery notification to group:', settings.selectedGroupId);
                await supabase.functions.invoke('send-whatsapp', {
                  body: {
                    action: 'send-group',
                    groupId: settings.selectedGroupId,
                    message: recoveryMessage,
                    notification_type: 'zabbix_alert',
                  },
                });
                console.log('WhatsApp recovery notification sent to group');
              } else {
                console.log('Sending individual recovery notification...');
                await supabase.functions.invoke('send-whatsapp', {
                  body: {
                    action: 'send',
                    message: recoveryMessage,
                    notification_type: 'zabbix_alert',
                  },
                });
                console.log('WhatsApp individual recovery notification sent');
              }
            }
          }
        } catch (e) {
          console.error('Error sending recovery WhatsApp notification:', e);
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
