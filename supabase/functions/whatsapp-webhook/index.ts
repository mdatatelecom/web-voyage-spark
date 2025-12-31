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

// Helper to extract ticket number from message
const extractTicketNumber = (text: string): string | null => {
  // Match patterns like #TKT-2025-00001 or TKT-2025-00001
  const match = text.match(/#?(TKT-\d{4}-\d{5})/i);
  return match ? match[1].toUpperCase() : null;
};

// Helper to extract command from message
const extractCommand = (text: string): { command: string; args: string } | null => {
  const lowerText = text.toLowerCase().trim();

  // Menu principal - detectar números 1-8
  const menuMainMap: Record<string, string> = {
    '1': 'submenu_consultas',
    '2': 'submenu_criar',
    '3': 'submenu_status',
    '4': 'submenu_atribuicao',
    '5': 'submenu_estatisticas',
    '6': 'submenu_anexar',
    '7': 'submenu_prioridade',
    '8': 'submenu_infra'
  };

  if (menuMainMap[lowerText]) {
    return { command: menuMainMap[lowerText], args: '' };
  }

  // Detectar formato "1." ou "1-" ou "1)"
  const numMatch = lowerText.match(/^(\d)[\.\-\)\s]?$/);
  if (numMatch && menuMainMap[numMatch[1]]) {
    return { command: menuMainMap[numMatch[1]], args: '' };
  }

  // Subopções do menu (formato X.Y)
  const subMenuMap: Record<string, { command: string; args: string }> = {
    // Consultas
    '1.1': { command: 'list', args: '' },
    '1.2': { command: 'list', args: 'all' },
    '1.3': { command: 'available', args: '' },
    '1.4': { command: 'status_prompt', args: '' },
    '1.5': { command: 'details_prompt', args: '' },
    // Criar chamado
    '2.1': { command: 'start_wizard', args: '' },
    '2.2': { command: 'novo', args: '' },
    '2.3': { command: 'novo_rapido_prompt', args: '' },
    // Infraestrutura
    '8.1': { command: 'racks', args: '' },
    '8.2': { command: 'plantas', args: '' },
    '8.3': { command: 'cameras', args: '' },
    '8.4': { command: 'nvrs', args: '' },
    '8.5': { command: 'localizar_prompt', args: '' },
  };

  if (subMenuMap[lowerText]) {
    return subMenuMap[lowerText];
  }

  // Voltar ao menu (opção 0)
  if (lowerText === '0' || lowerText === 'voltar') {
    return { command: 'menu', args: '' };
  }

  // Check for status command
  if (lowerText.startsWith('status ')) {
    return { command: 'status', args: lowerText.replace('status ', '').trim() };
  }
  
  // Check for details command
  if (lowerText.startsWith('detalhes ') || lowerText.startsWith('ver ')) {
    const args = lowerText.replace(/^(detalhes|ver)\s+/, '').trim();
    return { command: 'details', args };
  }
  
  // Check for start/in-progress command
  if (lowerText.startsWith('iniciar ') || lowerText.startsWith('andamento ')) {
    const args = lowerText.replace(/^(iniciar|andamento)\s+/, '').trim();
    return { command: 'start', args };
  }
  
  // Check for resolve command
  if (lowerText.startsWith('resolver ') || lowerText.startsWith('resolvido ')) {
    const args = lowerText.replace(/^(resolver|resolvido)\s+/, '').trim();
    return { command: 'resolve', args };
  }
  
  // Check for close command
  if (lowerText.startsWith('encerrar ') || lowerText.startsWith('fechar ')) {
    const args = lowerText.replace(/^(encerrar|fechar)\s+/, '').trim();
    return { command: 'close', args };
  }
  
  // Check for reopen command
  if (lowerText.startsWith('reabrir ')) {
    return { command: 'reopen', args: lowerText.replace('reabrir ', '').trim() };
  }
  
  // Check for priority command
  if (lowerText.startsWith('prioridade ') || lowerText.startsWith('urgencia ')) {
    const args = lowerText.replace(/^(prioridade|urgencia)\s+/, '').trim();
    return { command: 'priority', args };
  }
  
  // Check for comment command
  if (lowerText.startsWith('comentar ')) {
    return { command: 'comment', args: text.substring(text.toLowerCase().indexOf('comentar ') + 9).trim() };
  }
  
  // Check for assign command (técnico se atribui ao chamado)
  if (lowerText.startsWith('atribuir ') || lowerText.startsWith('assumir ')) {
    const args = lowerText.replace(/^(atribuir|assumir)\s+/, '').trim();
    return { command: 'assign', args };
  }
  
  // Check for transfer command (técnico transfere para outro)
  if (lowerText.startsWith('transferir ')) {
    const args = text.substring(text.toLowerCase().indexOf('transferir ') + 11).trim();
    return { command: 'transfer', args };
  }
  
  // Check for unassign command (cancelar atribuição)
  if (lowerText.startsWith('cancelar ') || lowerText.startsWith('desatribuir ')) {
    const args = lowerText.replace(/^(cancelar|desatribuir)\s+/, '').trim();
    return { command: 'unassign', args };
  }
  
  // Check for new ticket command with category wizard
  if (lowerText === 'novo') {
    return { command: 'novo', args: '' };
  }
  
  // Check for category-based ticket creation
  if (lowerText.startsWith('novo ')) {
    const argsText = text.replace(/^novo\s+/i, '').trim();
    return { command: 'novo', args: argsText };
  }
  if (lowerText.startsWith('novo:')) {
    return { command: 'novo', args: text.replace(/^novo:\s*/i, '').trim() };
  }
  
  // Check for available (unassigned) tickets command
  if (lowerText === 'disponiveis' || lowerText === 'disponíveis' || 
      lowerText === 'nao atribuidos' || lowerText === 'não atribuídos' || 
      lowerText === 'abertos sem tecnico') {
    return { command: 'available', args: '' };
  }
  
  // Check for list command - with filter option
  if (lowerText === 'meus chamados' || lowerText === 'meus tickets') {
    return { command: 'list', args: '' };
  }
  if (lowerText === 'todos chamados' || lowerText === 'todos meus chamados' || lowerText === 'todos tickets') {
    return { command: 'list', args: 'all' };
  }
  
  // Check for cancel wizard command
  if (lowerText === 'cancelar criacao' || lowerText === 'cancelar criação' ||
      lowerText === 'sair') {
    return { command: 'cancel_wizard', args: '' };
  }
  
  // Check for guided wizard command
  if (lowerText === 'criar chamado' || lowerText === 'novo chamado' || lowerText === 'abrir chamado') {
    return { command: 'start_wizard', args: '' };
  }
  
  // Check for skip due date command
  if (lowerText === 'pular') {
    return { command: 'skip', args: '' };
  }
  
  // Check for technician statistics command
  if (lowerText === 'minhas estatisticas' || lowerText === 'minhas estatísticas' || 
      lowerText === 'meu desempenho' || lowerText === 'minha performance') {
    return { command: 'my_stats', args: '' };
  }
  
  // Check for technician resolved history command
  if (lowerText === 'meus resolvidos' || lowerText === 'historico resolvidos' || 
      lowerText === 'histórico resolvidos') {
    return { command: 'my_resolved', args: '' };
  }
  
  // Check for confirmation responses
  if (lowerText === 'sim' || lowerText === 's') {
    return { command: 'confirm_yes', args: '' };
  }
  if (lowerText === 'nao' || lowerText === 'não' || lowerText === 'n') {
    return { command: 'confirm_no', args: '' };
  }
  
  // Check for help command
  if (lowerText === 'ajuda' || lowerText === 'help' || lowerText === '/help') {
    return { command: 'help', args: '' };
  }
  
  // Check for attach command (anexar mídia a chamado existente)
  if (lowerText.startsWith('anexar ') || lowerText.startsWith('anexo ')) {
    const args = lowerText.replace(/^(anexar|anexo)\s+/, '').trim();
    return { command: 'attach', args };
  }
  
  // Infrastructure commands
  if (lowerText === 'racks' || lowerText === 'listar racks') {
    return { command: 'racks', args: '' };
  }
  
  if (lowerText.startsWith('rack ')) {
    return { command: 'rack', args: lowerText.replace('rack ', '').trim() };
  }
  
  if (lowerText.startsWith('ocupacao ') || lowerText.startsWith('ocupação ')) {
    const args = lowerText.replace(/^(ocupacao|ocupação)\s+/, '').trim();
    return { command: 'ocupacao', args };
  }
  
  if (lowerText === 'plantas' || lowerText === 'listar plantas' || lowerText.startsWith('plantas ')) {
    const args = lowerText.replace(/^(listar\s+)?plantas\s*/, '').trim();
    return { command: 'plantas', args };
  }
  
  if (lowerText.startsWith('planta ') || lowerText.startsWith('ver planta ')) {
    const args = lowerText.replace(/^(ver\s+)?planta\s+/, '').trim();
    return { command: 'planta', args };
  }
  
  // Camera commands
  if (lowerText === 'cameras' || lowerText === 'câmeras' || lowerText === 'listar cameras') {
    return { command: 'cameras', args: '' };
  }
  
  if (lowerText.startsWith('camera ') || lowerText.startsWith('câmera ')) {
    const args = lowerText.replace(/^(camera|câmera)\s+/, '').trim();
    return { command: 'camera', args };
  }
  
  // NVR commands
  if (lowerText === 'nvrs' || lowerText === 'listar nvrs' || lowerText === 'listar nvr') {
    return { command: 'nvrs', args: '' };
  }
  
  if (lowerText.startsWith('nvr ')) {
    return { command: 'nvr', args: lowerText.replace('nvr ', '').trim() };
  }
  
  // Localizar command (universal search)
  if (lowerText.startsWith('localizar ') || lowerText.startsWith('buscar ') || lowerText.startsWith('encontrar ')) {
    const args = lowerText.replace(/^(localizar|buscar|encontrar)\s+/, '').trim();
    return { command: 'localizar', args };
  }
  
  if (lowerText === 'equipamentos' || lowerText === 'listar equipamentos') {
    return { command: 'equipamentos', args: '' };
  }
  
  // Menu/Welcome command - responds to greetings
  if (lowerText === 'oi' || lowerText === 'olá' || lowerText === 'ola' || 
      lowerText === 'menu' || lowerText === 'inicio' || lowerText === 'início' ||
      lowerText === 'hi' || lowerText === 'hello' || lowerText === 'bom dia' ||
      lowerText === 'boa tarde' || lowerText === 'boa noite' || lowerText === 'opa') {
    return { command: 'menu', args: '' };
  }
  
  // Help sub-menus
  if (lowerText === 'ajuda chamados' || lowerText === 'help chamados') {
    return { command: 'help_chamados', args: '' };
  }
  if (lowerText === 'ajuda tecnico' || lowerText === 'ajuda técnico' || lowerText === 'help tecnico') {
    return { command: 'help_tecnico', args: '' };
  }
  if (lowerText === 'ajuda infra' || lowerText === 'ajuda infraestrutura' || lowerText === 'help infra') {
    return { command: 'help_infra', args: '' };
  }
  if (lowerText === 'ajuda status' || lowerText === 'help status') {
    return { command: 'help_status', args: '' };
  }
  
  return null;
};

// Format phone number for query
const formatPhoneForQuery = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Get priority emoji
const getPriorityEmoji = (priority: string): string => {
  const emojis: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  };
  return emojis[priority] || '⚪';
};

// Get status emoji
const getStatusEmoji = (status: string): string => {
  const emojis: Record<string, string> = {
    open: '🔵',
    in_progress: '🟡',
    resolved: '🟢',
    closed: '⚫'
  };
  return emojis[status] || '⚪';
};

// Get status label in Portuguese
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
    closed: 'Fechado'
  };
  return labels[status] || status;
};

// Get priority label in Portuguese
const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[priority] || priority;
};

// Get category label in Portuguese
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    hardware: 'Hardware',
    software: 'Software',
    network: 'Rede',
    access: 'Acesso',
    maintenance: 'Manutenção',
    installation: 'Instalação',
    other: 'Outros'
  };
  return labels[category] || category;
};

// Helper to get media type label
const getMediaTypeLabel = (mediaType: string): string => {
  const labels: Record<string, string> = {
    image: 'Imagem',
    document: 'Documento',
    audio: 'Áudio',
    video: 'Vídeo',
    sticker: 'Figurinha'
  };
  return labels[mediaType] || 'Arquivo';
};

// Parse ticket number from args (accepts 00001 or #TKT-2025-00001)
const parseTicketNumberFromArgs = (args: string): string | null => {
  // Check if it's already a full ticket number
  const fullMatch = args.match(/#?(TKT-\d{4}-\d{5})/i);
  if (fullMatch) {
    return fullMatch[1].toUpperCase();
  }
  
  // Try to parse as a short number (just digits)
  const shortNumber = args.replace(/\D/g, '');
  if (shortNumber.length > 0) {
    const year = new Date().getFullYear();
    return `TKT-${year}-${shortNumber.padStart(5, '0')}`;
  }
  
  return null;
};

// Parse priority from text
const parsePriority = (text: string): string | null => {
  const priorityMap: Record<string, string> = {
    'baixa': 'low',
    'media': 'medium',
    'média': 'medium',
    'alta': 'high',
    'critica': 'critical',
    'crítica': 'critical',
    'urgente': 'critical',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical'
  };
  
  const lowerText = text.toLowerCase();
  return priorityMap[lowerText] || null;
};

// Check if user has permission to manage a ticket
const checkTicketPermission = async (
  supabase: any,
  ticket: any,
  senderPhone: string
): Promise<{ allowed: boolean; isOwner: boolean; role: string | null }> => {
  const formattedPhone = formatPhoneForQuery(senderPhone);
  
  // Check if sender is the ticket creator (by phone)
  if (ticket.contact_phone) {
    const ticketPhone = formatPhoneForQuery(ticket.contact_phone);
    if (formattedPhone.includes(ticketPhone) || ticketPhone.includes(formattedPhone)) {
      return { allowed: true, isOwner: true, role: null };
    }
  }
  
  // Check if sender is the assigned technician (by phone)
  if (ticket.technician_phone) {
    const techPhone = formatPhoneForQuery(ticket.technician_phone);
    if (formattedPhone.includes(techPhone) || techPhone.includes(formattedPhone)) {
      return { allowed: true, isOwner: false, role: 'technician' };
    }
  }
  
  // Try to find user by phone in profiles and check their roles
  // Use last 9 digits for matching (handles country code variations)
  const phoneDigits = formattedPhone.slice(-9);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, phone')
    .or(`phone.ilike.%${phoneDigits}%`)
    .maybeSingle();
  
  if (profile) {
    // Check if user has admin or technician role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id);
    
    const roles = userRoles?.map((r: any) => r.role) || [];
    
    if (roles.includes('admin')) {
      return { allowed: true, isOwner: false, role: 'admin' };
    }
    
    if (roles.includes('technician')) {
      return { allowed: true, isOwner: false, role: 'technician' };
    }
  }
  
  return { allowed: false, isOwner: false, role: null };
};

// Helper to download and upload media to storage
const downloadAndUploadMedia = async (
  supabase: any,
  settings: WhatsAppSettings,
  messageKey: any,
  mediaType: string,
  mimeType: string,
  fileName: string,
  ticketId: string
): Promise<{ url: string; type: string; name: string; size?: number } | null> => {
  try {
    const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
    
    console.log('📥 Downloading media from Evolution API...');
    
    // Get base64 from media message
    const mediaResponse = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${settings.evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: { key: messageKey },
          convertToMp4: false
        }),
      }
    );

    if (!mediaResponse.ok) {
      console.error('❌ Failed to get media from Evolution API:', mediaResponse.status);
      return null;
    }

    const mediaData = await mediaResponse.json();
    const base64Data = mediaData.base64;
    
    if (!base64Data) {
      console.error('❌ No base64 data in response');
      return null;
    }

    console.log('✅ Media downloaded, uploading to storage...');

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `ticket-attachments/${ticketId}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Error uploading to storage:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    console.log('✅ Media uploaded successfully:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      type: mimeType,
      name: fileName,
      size: bytes.length
    };
  } catch (error) {
    console.error('❌ Error processing media:', error);
    return null;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    console.log('📥 WhatsApp Webhook received:', JSON.stringify(body).substring(0, 500));

    // Evolution API webhook format
    const event = body.event || body.type;
    const data = body.data || body;

    // Only process message events
    if (event !== 'messages.upsert' && event !== 'message') {
      console.log('⏭️ Ignoring non-message event:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract message details
    const key = data.key || {};
    const messageId = key.id || data.id;
    const remoteJid = key.remoteJid || data.remoteJid || '';
    const fromMe = key.fromMe || false;
    const pushName = data.pushName || 'Desconhecido';
    const messageContent = data.message?.conversation || 
                          data.message?.extendedTextMessage?.text || 
                          data.message?.imageMessage?.caption ||
                          data.message?.documentMessage?.caption ||
                          data.message?.videoMessage?.caption ||
                          data.text || 
                          '';
    
    // Detect if it's a group message
    const isGroup = remoteJid.includes('@g.us');
    const groupId = isGroup ? remoteJid : null;

    // Extract sender phone correctly - in groups it comes from participant, not remoteJid
    let senderPhone = '';
    if (!fromMe) {
      if (isGroup) {
        // In groups, the real phone comes from participantAlt or participant
        // participantAlt format: "5511976104665@s.whatsapp.net"
        // participant format can be LID format: "219258650927247@lid" (newer) or phone format (older)
        const participantAlt = key.participantAlt || '';
        const participant = key.participant || '';
        
        // Prefer participantAlt as it always contains the real phone number
        if (participantAlt && participantAlt.includes('@s.whatsapp.net')) {
          senderPhone = participantAlt.split('@')[0];
        } else if (participant && participant.includes('@s.whatsapp.net')) {
          senderPhone = participant.split('@')[0];
        } else if (participant && !participant.includes('@lid')) {
          // Fallback for older format without @lid
          senderPhone = participant.split('@')[0];
        }
        // If we still don't have a phone (LID format without participantAlt), log warning
        if (!senderPhone) {
          console.warn('⚠️ Could not extract phone from group message:', { participant, participantAlt });
        }
      } else {
        // Individual chat - phone is in remoteJid
        senderPhone = remoteJid.split('@')[0];
      }
    }

    console.log('📱 Sender phone extracted:', { 
      isGroup, 
      participant: key.participant, 
      participantAlt: key.participantAlt, 
      senderPhone 
    });

    // Detect media messages
    const imageMessage = data.message?.imageMessage;
    const documentMessage = data.message?.documentMessage;
    const audioMessage = data.message?.audioMessage;
    const videoMessage = data.message?.videoMessage;
    const stickerMessage = data.message?.stickerMessage;
    
    const hasMedia = !!(imageMessage || documentMessage || audioMessage || videoMessage || stickerMessage);
    
    let mediaType = '';
    let mimeType = '';
    let fileName = '';
    
    if (imageMessage) {
      mediaType = 'image';
      mimeType = imageMessage.mimetype || 'image/jpeg';
      fileName = `image_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
    } else if (documentMessage) {
      mediaType = 'document';
      mimeType = documentMessage.mimetype || 'application/octet-stream';
      fileName = documentMessage.fileName || `document_${Date.now()}`;
    } else if (audioMessage) {
      mediaType = 'audio';
      mimeType = audioMessage.mimetype || 'audio/ogg';
      fileName = `audio_${Date.now()}.${mimeType.split('/')[1] || 'ogg'}`;
    } else if (videoMessage) {
      mediaType = 'video';
      mimeType = videoMessage.mimetype || 'video/mp4';
      fileName = `video_${Date.now()}.${mimeType.split('/')[1] || 'mp4'}`;
    } else if (stickerMessage) {
      mediaType = 'sticker';
      mimeType = stickerMessage.mimetype || 'image/webp';
      fileName = `sticker_${Date.now()}.webp`;
    }

    console.log('📨 Message details:', {
      messageId,
      fromMe,
      pushName,
      senderPhone,
      isGroup,
      groupId,
      hasMedia,
      mediaType,
      messageContent: messageContent.substring(0, 100)
    });

    // Ignore messages from the bot itself
    if (fromMe) {
      console.log('⏭️ Ignoring message from self');
      return new Response(
        JSON.stringify({ success: true, message: 'Self message ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp settings for sending responses
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'whatsapp_settings')
      .maybeSingle();

    const settings = settingsData?.setting_value as WhatsAppSettings | null;

    // Helper function to send response message
    const sendResponse = async (responseMessage: string) => {
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
        console.log('⚠️ Cannot send response - missing settings');
        return;
      }

      const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
      
      try {
        if (isGroup && groupId) {
          // Send to group
          await fetch(
            `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
            {
              method: 'POST',
              headers: {
                'apikey': settings.evolutionApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                number: groupId,
                text: responseMessage,
              }),
            }
          );
        } else if (senderPhone) {
          // Send to individual
          await fetch(
            `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
            {
              method: 'POST',
              headers: {
                'apikey': settings.evolutionApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                number: senderPhone,
                text: responseMessage,
              }),
            }
          );
        }
        console.log('✅ Response sent successfully');
      } catch (err) {
        console.error('❌ Error sending response:', err);
      }
    };

    // Helper function to send media message (images, videos, audios, documents)
    const sendMediaMessage = async (
      mediaUrl: string,
      mimeType: string,
      fileName: string,
      caption?: string
    ): Promise<boolean> => {
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
        console.log('⚠️ Cannot send media - missing settings');
        return false;
      }

      const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
      
      // Determine mediatype for Evolution API based on MIME type
      let evolutionMediaType = 'document';
      if (mimeType.startsWith('image/')) {
        evolutionMediaType = 'image';
      } else if (mimeType.startsWith('video/')) {
        evolutionMediaType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        evolutionMediaType = 'audio';
      }
      
      const targetNumber = isGroup && groupId ? groupId : senderPhone;
      
      try {
        console.log(`📤 Sending media: ${fileName} (${evolutionMediaType}) to ${targetNumber}`);
        
        const response = await fetch(
          `${apiUrl}/message/sendMedia/${settings.evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: targetNumber,
              mediatype: evolutionMediaType,
              mimetype: mimeType,
              caption: caption || fileName,
              media: mediaUrl,
              fileName: fileName
            }),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error sending media:', response.status, errorText);
          return false;
        }
        
        console.log('✅ Media sent successfully:', fileName);
        return true;
      } catch (err) {
        console.error('❌ Error sending media:', err);
        return false;
      }
    };

    // Helper function to send interactive list message
    const sendListMessage = async (
      title: string,
      description: string,
      buttonText: string,
      sections: Array<{
        title: string;
        rows: Array<{ title: string; description: string; rowId: string }>;
      }>
    ): Promise<boolean> => {
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
        console.log('⚠️ Cannot send list - missing settings');
        return false;
      }

      const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
      const targetNumber = isGroup && groupId ? groupId : senderPhone;

      try {
        console.log(`📋 Sending interactive list to ${targetNumber}`);

        const response = await fetch(
          `${apiUrl}/message/sendList/${settings.evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: targetNumber,
              title: title,
              description: description,
              buttonText: buttonText,
              footerText: '🤖 Datacenter Bot',
              sections: sections
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error sending list:', response.status, errorText);
          return false;
        }

        console.log('✅ Interactive list sent successfully');
        return true;
      } catch (err) {
        console.error('❌ Error sending list:', err);
        return false;
      }
    };

    // Check for quoted message that might reference a ticket
    const contextInfo = data.message?.extendedTextMessage?.contextInfo || data.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage?.conversation || 
                          contextInfo?.quotedMessage?.extendedTextMessage?.text || '';

    // Try to find ticket from quoted message or current message
    let ticketNumber = extractTicketNumber(quotedMessage) || extractTicketNumber(messageContent);
    let ticket = null;

    if (ticketNumber) {
      console.log('🔍 Looking for ticket:', ticketNumber);
      const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('ticket_number', ticketNumber)
        .maybeSingle();
      
      ticket = ticketData;
    }

    // Check for active wizard session
    const { data: activeSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', senderPhone)
      .maybeSingle();

    if (activeSession) {
      // Check if session expired (30 minutes)
      const sessionAge = Date.now() - new Date(activeSession.updated_at).getTime();
      if (sessionAge > 30 * 60 * 1000) {
        await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
        console.log('🕐 Session expired, cleaned up');
      } else {
        // Process based on session state
        const sessionData = activeSession.data as { category?: string; title?: string; description?: string; ticket_id?: string; ticket_number?: string; action?: string; new_ticket_id?: string; new_ticket_number?: string };
        const lowerMsg = messageContent.toLowerCase().trim();
        
        // Check for cancel command in any wizard state
        if (lowerMsg === 'cancelar criação' || 
            lowerMsg === 'cancelar criacao' ||
            lowerMsg === 'cancelar' ||
            lowerMsg === 'sair') {
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          await sendResponse('❌ Operação cancelada. Se precisar, é só chamar.');
          return new Response(
            JSON.stringify({ success: true, message: 'Operation cancelled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Handle wizard_categoria state (step 1: category selection)
        if (activeSession.state === 'wizard_categoria') {
          const categoryMapWizard: Record<string, string> = {
            '1': 'maintenance',
            '2': 'network',
            '3': 'hardware',
            '4': 'software',
            '5': 'access',
            '6': 'installation',
            '7': 'other'
          };
          
          const selectedCategory = categoryMapWizard[lowerMsg];
          
          if (!selectedCategory) {
            await sendResponse(
              `❌ Opção inválida. Responda apenas com o número (1-7).\n\n` +
              `1️⃣ Manutenção\n` +
              `2️⃣ Rede\n` +
              `3️⃣ Hardware\n` +
              `4️⃣ Software\n` +
              `5️⃣ Acesso\n` +
              `6️⃣ Instalação\n` +
              `7️⃣ Outro`
            );
            return new Response(
              JSON.stringify({ success: true, message: 'Invalid category' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          await supabase.from('whatsapp_sessions').update({
            state: 'wizard_titulo',
            data: { ...sessionData, category: selectedCategory },
            updated_at: new Date().toISOString()
          }).eq('phone', senderPhone);
          
          await sendResponse(
            `✅ *Categoria: ${getCategoryLabel(selectedCategory)}*\n\n` +
            `✍️ Informe um título curto para o chamado:\n\n` +
            `💡 _Mínimo 5 caracteres_`
          );
          return new Response(
            JSON.stringify({ success: true, message: 'Category selected' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle wizard_titulo state (step 2: title)
        if (activeSession.state === 'wizard_titulo') {
          if (messageContent.trim().length < 5) {
            await sendResponse(`⚠️ O título deve ter no mínimo 5 caracteres.\n\n✍️ Digite novamente:`);
            return new Response(
              JSON.stringify({ success: true, message: 'Title too short' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          await supabase.from('whatsapp_sessions').update({
            state: 'wizard_descricao',
            data: { ...sessionData, title: messageContent.trim() },
            updated_at: new Date().toISOString()
          }).eq('phone', senderPhone);
          
          await sendResponse(
            `✅ *Título registrado!*\n\n` +
            `📝 Agora descreva o problema com mais detalhes:\n\n` +
            `💡 _Mínimo 10 caracteres_`
          );
          return new Response(
            JSON.stringify({ success: true, message: 'Title saved' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle wizard_descricao state (step 3: description - creates ticket)
        if (activeSession.state === 'wizard_descricao') {
          if (messageContent.trim().length < 10) {
            await sendResponse(`⚠️ A descrição deve ter no mínimo 10 caracteres.\n\n📝 Digite novamente:`);
            return new Response(
              JSON.stringify({ success: true, message: 'Description too short' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Create the ticket
          const { data: newTicket, error: createError } = await supabase
            .from('support_tickets')
            .insert({
              title: sessionData.title || messageContent.trim().substring(0, 100),
              description: messageContent.trim(),
              category: sessionData.category || 'other',
              priority: 'medium',
              status: 'open',
              contact_phone: senderPhone,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('❌ Error creating ticket:', createError);
            await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
            await sendResponse('❌ Erro ao criar chamado. Tente novamente.');
            return new Response(
              JSON.stringify({ success: false, message: 'Error creating ticket' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Update session for post-creation options
          await supabase.from('whatsapp_sessions').update({
            state: 'wizard_pos_criacao',
            data: { ...sessionData, new_ticket_id: newTicket.id, new_ticket_number: newTicket.ticket_number },
            updated_at: new Date().toISOString()
          }).eq('phone', senderPhone);

          await supabase
            .from('whatsapp_message_mapping')
            .insert({
              ticket_id: newTicket.id,
              message_id: messageId,
              group_id: groupId,
              phone_number: senderPhone,
              direction: 'inbound'
            });
          
          await sendResponse(
            `✅ *Chamado Criado com Sucesso!*\n\n` +
            `📋 Número: *${newTicket.ticket_number}*\n` +
            `🏷️ Categoria: ${getCategoryLabel(sessionData.category || 'other')}\n` +
            `📝 ${sessionData.title}\n` +
            `🔵 Status: Aberto\n\n` +
            `Deseja:\n` +
            `1️⃣ Adicionar mais informações\n` +
            `2️⃣ Definir prioridade\n` +
            `3️⃣ Encerrar\n\n` +
            `💡 _Responda com o número ou qualquer texto para encerrar_`
          );
          return new Response(
            JSON.stringify({ success: true, message: 'Ticket created' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle wizard_pos_criacao state (step 4: post-creation options)
        if (activeSession.state === 'wizard_pos_criacao') {
          const ticketId = sessionData.new_ticket_id;
          const ticketNum = sessionData.new_ticket_number;
          
          if (lowerMsg === '1') {
            // Add more info - save as comment
            await supabase.from('whatsapp_sessions').update({
              state: 'wizard_info_adicional',
              updated_at: new Date().toISOString()
            }).eq('phone', senderPhone);
            
            await sendResponse(`📝 Digite as informações adicionais para o chamado *${ticketNum}*:`);
            return new Response(
              JSON.stringify({ success: true, message: 'Awaiting additional info' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (lowerMsg === '2') {
            // Set priority
            await supabase.from('whatsapp_sessions').update({
              state: 'wizard_prioridade',
              updated_at: new Date().toISOString()
            }).eq('phone', senderPhone);
            
            await sendResponse(
              `⚡ *Definir Prioridade*\n\n` +
              `Escolha a prioridade do chamado *${ticketNum}*:\n\n` +
              `1️⃣ 🟢 Baixa\n` +
              `2️⃣ 🟡 Média\n` +
              `3️⃣ 🟠 Alta\n` +
              `4️⃣ 🔴 Crítica`
            );
            return new Response(
              JSON.stringify({ success: true, message: 'Awaiting priority' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Any other response (including "3") ends the wizard
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          await sendResponse(`✅ Atendimento finalizado. Obrigado!\n\n📋 Acompanhe pelo número *${ticketNum}*`);
          return new Response(
            JSON.stringify({ success: true, message: 'Wizard completed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle wizard_info_adicional state
        if (activeSession.state === 'wizard_info_adicional') {
          const ticketId = sessionData.new_ticket_id;
          const ticketNum = sessionData.new_ticket_number;
          
          await supabase.from('ticket_comments').insert({
            ticket_id: ticketId,
            user_id: '00000000-0000-0000-0000-000000000000',
            comment: messageContent.trim(),
            is_internal: false,
            source: 'whatsapp',
            whatsapp_sender_name: pushName,
            whatsapp_sender_phone: senderPhone
          });
          
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          await sendResponse(`✅ Informação adicionada ao chamado *${ticketNum}*.\n\nAtendimento finalizado. Obrigado!`);
          return new Response(
            JSON.stringify({ success: true, message: 'Comment added' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle wizard_prioridade state
        if (activeSession.state === 'wizard_prioridade') {
          const ticketId = sessionData.new_ticket_id;
          const ticketNum = sessionData.new_ticket_number;
          
          const priorityMapWizard: Record<string, string> = {
            '1': 'low',
            '2': 'medium',
            '3': 'high',
            '4': 'critical'
          };
          
          const newPriority = priorityMapWizard[lowerMsg];
          
          if (!newPriority) {
            await sendResponse(`❌ Opção inválida. Responda com um número de 1 a 4.`);
            return new Response(
              JSON.stringify({ success: true, message: 'Invalid priority' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          await supabase.from('support_tickets').update({ priority: newPriority }).eq('id', ticketId);
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          
          await sendResponse(
            `✅ Prioridade do chamado *${ticketNum}* definida como ${getPriorityEmoji(newPriority)} *${getPriorityLabel(newPriority)}*.\n\n` +
            `Atendimento finalizado. Obrigado!`
          );
          return new Response(
            JSON.stringify({ success: true, message: 'Priority set' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle nao/não for confirmation (not in wizard states)
        if ((lowerMsg === 'nao' || lowerMsg === 'não' || lowerMsg === 'n') && 
            (activeSession.state === 'confirm_resolve' || activeSession.state === 'confirm_close')) {
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          await sendResponse('❌ Operação cancelada.');
          return new Response(
            JSON.stringify({ success: true, message: 'Operation cancelled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle confirmation for resolve/close
        if ((activeSession.state === 'confirm_resolve' || activeSession.state === 'confirm_close') && 
            (messageContent.toLowerCase() === 'sim' || messageContent.toLowerCase() === 's')) {
          const ticketId = sessionData.ticket_id;
          const ticketNum = sessionData.ticket_number;
          const action = activeSession.state === 'confirm_resolve' ? 'resolved' : 'closed';
          
          const updateData: any = { status: action };
          if (action === 'resolved') updateData.resolved_at = new Date().toISOString();
          if (action === 'closed') updateData.closed_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId);
          
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          
          if (updateError) {
            await sendResponse(`❌ Erro ao atualizar chamado.`);
          } else {
            await supabase.from('ticket_comments').insert({
              ticket_id: ticketId,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: `Chamado ${action === 'resolved' ? 'resolvido' : 'encerrado'} via WhatsApp por ${pushName}`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });
            
            const statusEmoji = action === 'resolved' ? '🟢' : '⚫';
            const statusLabel = action === 'resolved' ? 'Resolvido' : 'Fechado';
            await sendResponse(`✅ *Chamado ${ticketNum} ${statusLabel}*\n\n${statusEmoji} Status atualizado com sucesso.`);
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'Ticket updated' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (activeSession.state === 'awaiting_description') {
          // User sent the description
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              state: 'awaiting_due_date',
              data: { ...sessionData, description: messageContent },
              updated_at: new Date().toISOString()
            })
            .eq('phone', senderPhone);
          
          await sendResponse(
            `✅ *Descrição registrada*\n\n` +
            `Deseja definir um prazo?\n\n` +
            `📅 Envie a data (ex: *25/12/2025*)\n` +
            `⏭️ Ou digite *pular* para criar sem prazo`
          );
          return new Response(
            JSON.stringify({ success: true, message: 'Description saved' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (activeSession.state === 'awaiting_due_date') {
          let dueDate: Date | null = null;
          
          if (messageContent.toLowerCase() !== 'pular') {
            // Try to parse date (DD/MM/YYYY format)
            const dateMatch = messageContent.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              const day = parseInt(dateMatch[1]);
              const month = parseInt(dateMatch[2]) - 1;
              const year = parseInt(dateMatch[3]);
              dueDate = new Date(year, month, day);
              
              // Validate date
              if (isNaN(dueDate.getTime())) {
                await sendResponse('⚠️ Data inválida. Use o formato *DD/MM/AAAA* ou *pular*.');
                return new Response(
                  JSON.stringify({ success: true, message: 'Invalid date' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else {
              await sendResponse('⚠️ Formato de data inválido.\n\nUse: *25/12/2025* ou digite *pular*');
              return new Response(
                JSON.stringify({ success: true, message: 'Invalid date format' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
          
          // Create ticket with all data
          const { data: newTicket, error: createError } = await supabase
            .from('support_tickets')
            .insert({
              title: (sessionData.description || 'Sem título').substring(0, 100),
              description: sessionData.description || 'Chamado via WhatsApp',
              category: sessionData.category || 'other',
              priority: 'medium',
              status: 'open',
              contact_phone: senderPhone,
              due_date: dueDate?.toISOString() || null,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();
          
          // Clean session
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          
          if (createError) {
            console.error('❌ Error creating ticket:', createError);
            await sendResponse('❌ Erro ao criar chamado. Tente novamente.');
          } else {
            let successMessage = `✅ *Chamado Criado com Sucesso!*\n\n` +
              `📋 Número: *${newTicket.ticket_number}*\n` +
              `📝 Título: ${newTicket.title}\n` +
              `🏷️ Categoria: ${getCategoryLabel(sessionData.category || 'other')}\n` +
              `${getStatusEmoji('open')} Status: Aberto\n`;
            
            if (dueDate) {
              successMessage += `📅 Prazo: ${dueDate.toLocaleDateString('pt-BR')}\n`;
            }
            
            successMessage += `\nAcompanhe seu chamado pelo número acima.`;
            
            await sendResponse(successMessage);

            await supabase
              .from('whatsapp_message_mapping')
              .insert({
                ticket_id: newTicket.id,
                message_id: messageId,
                group_id: groupId,
                phone_number: senderPhone,
                direction: 'inbound'
              });
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'Ticket created' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check for bot commands
    const command = extractCommand(messageContent);
    const commandStartTime = Date.now();
    let commandResponse = '';

    // Helper to save interaction
    const saveInteraction = async (response: string, status: string = 'success') => {
      try {
        const processingTime = Date.now() - commandStartTime;
        await supabase.from('whatsapp_interactions').insert({
          phone_number: senderPhone,
          message_received: messageContent?.substring(0, 500) || '',
          command: command?.command || null,
          args: command?.args?.substring(0, 200) || null,
          response_sent: response.substring(0, 1000),
          response_status: status,
          processing_time_ms: processingTime,
          is_group: !!groupId,
          group_id: groupId || null,
        });
      } catch (err) {
        console.error('Failed to save interaction:', err);
      }
    };

    if (command) {
      console.log('🤖 Bot command detected:', command);

      switch (command.command) {
        case 'menu': {
          const menuMessage = 
            `🤖 *DATACENTER BOT*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 *Digite o número da opção:*\n\n` +
            `*1* - 📖 CONSULTAS\n` +
            `      _Meus chamados, status, detalhes_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*2* - ➕ CRIAR CHAMADO\n` +
            `      _Abrir novo ticket_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*3* - 🔄 ALTERAR STATUS _(Técnicos)_\n` +
            `      _Iniciar, resolver, encerrar_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*4* - 👨‍🔧 ATRIBUIÇÃO _(Técnicos)_\n` +
            `      _Assumir, transferir, cancelar_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*5* - 📊 ESTATÍSTICAS _(Técnicos)_\n` +
            `      _Meu desempenho, resolvidos_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*6* - 📎 ANEXAR ARQUIVOS\n` +
            `      _Adicionar fotos/docs a chamados_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*7* - ⚡ PRIORIDADE\n` +
            `      _Alterar urgência do chamado_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*8* - 🏗️ INFRAESTRUTURA\n` +
            `      _Racks, plantas, câmeras, NVRs_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💡 _Digite *0* ou *menu* a qualquer momento para voltar_`;

          await sendResponse(menuMessage);
          await saveInteraction(menuMessage);
          break;
        }

        // =============== SUBMENUS ===============

        case 'submenu_consultas': {
          const msg = 
            `📖 *CONSULTAS*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Escolha uma opção:\n\n` +
            `*1.1* - 📝 Meus chamados abertos\n` +
            `*1.2* - 📋 Todos meus chamados\n` +
            `*1.3* - 🔍 Chamados disponíveis\n` +
            `*1.4* - 📊 Status de um chamado\n` +
            `*1.5* - 📑 Detalhes de um chamado\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 _Ou digite diretamente:_\n` +
            `• *meus chamados*\n` +
            `• *status 00001*\n` +
            `• *detalhes 00001*\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_criar': {
          const msg = 
            `➕ *CRIAR CHAMADO*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Escolha como deseja criar:\n\n` +
            `*2.1* - ✨ Wizard guiado (recomendado)\n` +
            `*2.2* - 🏷️ Menu de categorias\n` +
            `*2.3* - ⚡ Criação rápida\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 _Ou digite diretamente:_\n` +
            `• *criar chamado* - Wizard\n` +
            `• *novo* - Menu categorias\n` +
            `• *novo: [título]* - Rápido\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_status': {
          const msg = 
            `🔄 *ALTERAR STATUS*\n` +
            `_(Apenas Técnicos/Admin)_\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Ações disponíveis:\n\n` +
            `📋 *iniciar [nº]* - Em Andamento\n` +
            `✅ *resolver [nº]* - Marcar resolvido\n` +
            `🔒 *encerrar [nº]* - Fechar chamado\n` +
            `🔓 *reabrir [nº]* - Reabrir fechado\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Exemplos:*\n` +
            `• *iniciar 00001*\n` +
            `• *resolver 00001*\n` +
            `• *encerrar 00001*\n\n` +
            `⚠️ _Resolver e encerrar pedem confirmação_\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_atribuicao': {
          const msg = 
            `👨‍🔧 *ATRIBUIÇÃO*\n` +
            `_(Apenas Técnicos/Admin)_\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Ações disponíveis:\n\n` +
            `✋ *atribuir [nº]* - Assumir chamado\n` +
            `🔄 *transferir [nº] [tel]* - Passar para outro\n` +
            `❌ *cancelar [nº]* - Remover atribuição\n` +
            `📋 *disponiveis* - Ver sem técnico\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Exemplos:*\n` +
            `• *atribuir 00001*\n` +
            `• *transferir 00001 5511999999999*\n` +
            `• *disponiveis*\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_estatisticas': {
          const msg = 
            `📊 *ESTATÍSTICAS*\n` +
            `_(Apenas Técnicos/Admin)_\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Comandos disponíveis:\n\n` +
            `📈 *minhas estatisticas*\n` +
            `   _Seu desempenho geral_\n\n` +
            `✅ *meus resolvidos*\n` +
            `   _Histórico de resolvidos_\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_anexar': {
          const msg = 
            `📎 *ANEXAR ARQUIVOS*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Para adicionar fotos ou documentos:\n\n` +
            `1️⃣ Primeiro, envie:\n` +
            `   *anexar [nº do chamado]*\n` +
            `   Exemplo: *anexar 00001*\n\n` +
            `2️⃣ Depois, envie a foto ou arquivo\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Tipos aceitos:*\n` +
            `📷 Fotos/Imagens\n` +
            `📄 Documentos (PDF, DOC)\n` +
            `🎥 Vídeos curtos\n` +
            `🎤 Áudios\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_prioridade': {
          const msg = 
            `⚡ *ALTERAR PRIORIDADE*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Comando:\n` +
            `*prioridade [nº] [nível]*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📊 *Níveis disponíveis:*\n\n` +
            `🟢 *baixa* - Sem urgência\n` +
            `🟡 *media* - Atenção normal\n` +
            `🟠 *alta* - Requer atenção\n` +
            `🔴 *critica* - Urgente!\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Exemplos:*\n` +
            `• *prioridade 00001 alta*\n` +
            `• *prioridade 00001 critica*\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'submenu_infra': {
          const msg = 
            `🏗️ *INFRAESTRUTURA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Consultas disponíveis:\n\n` +
            `*8.1* - 🗄️ Racks\n` +
            `*8.2* - 📐 Plantas baixas\n` +
            `*8.3* - 📹 Câmeras IP\n` +
            `*8.4* - 💾 NVRs/DVRs\n` +
            `*8.5* - 🔍 Buscar equipamento\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 _Ou digite diretamente:_\n` +
            `• *racks* / *rack [nome]*\n` +
            `• *plantas* / *planta [nome]*\n` +
            `• *cameras* / *camera [nome]*\n` +
            `• *nvrs* / *nvr [nome]*\n` +
            `• *localizar [termo]*\n\n` +
            `↩️ Digite *0* ou *menu* para voltar`;
          
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        // =============== PROMPTS ===============

        case 'status_prompt': {
          const msg = 
            `📊 *CONSULTAR STATUS*\n\n` +
            `Digite o número do chamado:\n` +
            `Exemplo: *status 00001*`;
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'details_prompt': {
          const msg = 
            `📑 *VER DETALHES*\n\n` +
            `Digite o número do chamado:\n` +
            `Exemplo: *detalhes 00001*`;
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'novo_rapido_prompt': {
          const msg = 
            `⚡ *CRIAÇÃO RÁPIDA*\n\n` +
            `Digite o título do chamado:\n` +
            `Exemplo: *novo: Problema na impressora*`;
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'localizar_prompt': {
          const msg = 
            `🔍 *BUSCAR EQUIPAMENTO*\n\n` +
            `Digite o termo de busca:\n` +
            `Exemplo: *localizar switch principal*`;
          await sendResponse(msg);
          await saveInteraction(msg);
          break;
        }

        case 'help': {
          const helpMessage = `🤖 *CENTRAL DE AJUDA*\n\n` +
            `Escolha uma categoria:\n\n` +
            `📋 *ajuda chamados* - Criar e gerenciar\n` +
            `🔧 *ajuda tecnico* - Atribuição e estatísticas\n` +
            `🏗️ *ajuda infra* - Racks, plantas, câmeras, NVRs\n` +
            `📊 *ajuda status* - Consultas rápidas\n\n` +
            `Ou digite diretamente o comando desejado!\n\n` +
            `💡 _Responda uma notificação para comentar_`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'help_chamados': {
          const helpMessage = `📋 *COMANDOS DE CHAMADOS*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📖 *Consultar:*\n` +
            `• *meus chamados* - Seus chamados\n` +
            `• *todos chamados* - Listar todos\n` +
            `• *disponiveis* - Não atribuídos\n` +
            `• *status 00001* - Ver status\n` +
            `• *detalhes 00001* - Ver detalhes\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `➕ *Criar:*\n` +
            `• *criar chamado* - Wizard guiado ✨\n` +
            `• *novo* - Menu de categorias\n` +
            `• *novo manutenção* - Com categoria\n` +
            `• *novo: [título]* - Criação rápida\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💬 *Interagir:*\n` +
            `• *comentar 00001 [texto]*\n` +
            `• *anexar 00001* + envie foto/doc\n` +
            `• *cancelar* - Cancela criação\n\n` +
            `📋 _Digite *ajuda* para voltar_`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'help_tecnico': {
          const helpMessage = `🔧 *COMANDOS TÉCNICO*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `👨‍🔧 *Atribuição:*\n` +
            `• *atribuir 00001* - Assumir\n` +
            `• *cancelar 00001* - Remover atribuição\n` +
            `• *transferir 00001 [tel]*\n` +
            `• *disponiveis* - Não atribuídos\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔄 *Alterar Status:*\n` +
            `• *iniciar 00001* - Em Andamento\n` +
            `• *resolver 00001* - Resolvido ⚠️\n` +
            `• *encerrar 00001* - Fechado ⚠️\n` +
            `• *reabrir 00001* - Reabrir\n` +
            `   ⚠️ _Pedirá confirmação_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *Prioridade:*\n` +
            `• *prioridade 00001 alta*\n` +
            `  📋 baixa | média | alta | crítica\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📈 *Estatísticas:*\n` +
            `• *minhas estatisticas*\n` +
            `• *meus resolvidos*\n\n` +
            `📋 _Digite *ajuda* para voltar_`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'help_infra': {
          const helpMessage = `🏗️ *COMANDOS DE INFRAESTRUTURA*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🗄️ *Racks:*\n` +
            `• *racks* - Listar todos\n` +
            `• *rack [nome]* - Detalhes\n` +
            `• *ocupacao [nome]* - Ver ocupação\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🗺️ *Plantas Baixas:*\n` +
            `• *plantas* - Listar plantas\n` +
            `• *planta [nome]* - Receber imagem 📷\n` +
            `• *plantas [prédio]* - Todas de um prédio\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📷 *Câmeras:*\n` +
            `• *cameras* - Listar câmeras IP\n` +
            `• *camera [nome]* - Detalhes 📷\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📹 *NVRs:*\n` +
            `• *nvrs* - Listar NVRs/DVRs\n` +
            `• *nvr [nome]* - Detalhes + câmeras\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔍 *Busca Universal:*\n` +
            `• *localizar [termo]* - Buscar equipamento\n` +
            `• *equipamentos* - Resumo por tipo\n\n` +
            `📋 _Digite *ajuda* para voltar_`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'help_status': {
          const helpMessage = `📊 *CONSULTAS RÁPIDAS*\n\n` +
            `• *status 00001* - Status do chamado\n` +
            `• *detalhes 00001* - Detalhes completos\n` +
            `• *meus chamados* - Seus chamados\n` +
            `• *todos chamados* - Todos os chamados\n` +
            `• *disponiveis* - Sem técnico\n\n` +
            `💡 _Responda uma notificação para comentar_\n\n` +
            `📋 _Digite *ajuda* para voltar_`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'status': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *status 00001*');
            break;
          }
          
          const { data: statusTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (statusTicket) {
            const statusMessage = `📋 *Status do Chamado ${statusTicket.ticket_number}*\n\n` +
              `📝 Título: ${statusTicket.title}\n` +
              `${getStatusEmoji(statusTicket.status)} Status: ${getStatusLabel(statusTicket.status)}\n` +
              `${getPriorityEmoji(statusTicket.priority)} Prioridade: ${getPriorityLabel(statusTicket.priority)}\n` +
              `🏷️ Categoria: ${getCategoryLabel(statusTicket.category)}\n` +
              `📅 Criado em: ${new Date(statusTicket.created_at!).toLocaleDateString('pt-BR')}\n` +
              `🔄 Última atualização: ${new Date(statusTicket.updated_at!).toLocaleString('pt-BR')}`;
            
            await sendResponse(statusMessage);
          } else {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
          }
          break;
        }

        case 'details': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *detalhes 00001*');
            break;
          }
          
          const { data: detailTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!detailTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Fetch related data
          let buildingName = '';
          let equipmentName = '';
          
          if (detailTicket.related_building_id) {
            const { data: building } = await supabase
              .from('buildings')
              .select('name')
              .eq('id', detailTicket.related_building_id)
              .maybeSingle();
            buildingName = building?.name || '';
          }
          
          if (detailTicket.related_equipment_id) {
            const { data: equipment } = await supabase
              .from('equipment')
              .select('name')
              .eq('id', detailTicket.related_equipment_id)
              .maybeSingle();
            equipmentName = equipment?.name || '';
          }

          // Fetch last 3 comments
          const { data: comments } = await supabase
            .from('ticket_comments')
            .select('*')
            .eq('ticket_id', detailTicket.id)
            .order('created_at', { ascending: false })
            .limit(3);

          let detailsMessage = `📋 *Detalhes do Chamado ${detailTicket.ticket_number}*\n\n`;
          detailsMessage += `📝 *Título:* ${detailTicket.title}\n\n`;
          detailsMessage += `📄 *Descrição:*\n${detailTicket.description || 'Sem descrição'}\n\n`;
          detailsMessage += `${getStatusEmoji(detailTicket.status)} *Status:* ${getStatusLabel(detailTicket.status)}\n`;
          detailsMessage += `${getPriorityEmoji(detailTicket.priority)} *Prioridade:* ${getPriorityLabel(detailTicket.priority)}\n`;
          detailsMessage += `🏷️ *Categoria:* ${getCategoryLabel(detailTicket.category)}\n\n`;
          
          if (buildingName || equipmentName) {
            detailsMessage += `📍 *Local:*\n`;
            if (buildingName) detailsMessage += `   🏢 ${buildingName}\n`;
            if (equipmentName) detailsMessage += `   🔧 ${equipmentName}\n`;
            detailsMessage += `\n`;
          }
          
          detailsMessage += `📅 *Criado em:* ${new Date(detailTicket.created_at!).toLocaleString('pt-BR')}\n`;
          detailsMessage += `🔄 *Atualizado em:* ${new Date(detailTicket.updated_at!).toLocaleString('pt-BR')}\n`;
          
          if (detailTicket.due_date) {
            detailsMessage += `⏰ *Prazo:* ${new Date(detailTicket.due_date).toLocaleDateString('pt-BR')}\n`;
          }

          // Show ticket attachments info
          const ticketAttachments = detailTicket.attachments as Array<{
            url: string;
            type: string;
            name: string;
            size?: number;
          }> | null;

          if (ticketAttachments && ticketAttachments.length > 0) {
            detailsMessage += `\n📎 *Anexos do Chamado (${ticketAttachments.length}):*\n`;
            detailsMessage += `_Enviando anexos abaixo..._\n`;
          }
          
          if (comments && comments.length > 0) {
            detailsMessage += `\n💬 *Últimos Comentários:*\n`;
            comments.reverse().forEach((c, i) => {
              const author = c.whatsapp_sender_name || 'Sistema';
              const date = new Date(c.created_at!).toLocaleString('pt-BR');
              // Don't show "Anexo adicionado via WhatsApp" messages as they're now in attachments section
              let text = c.comment;
              if (text.startsWith('📎 Anexo adicionado via WhatsApp:')) {
                text = '📎 Anexo enviado';
              } else if (text.length > 50) {
                text = text.substring(0, 50) + '...';
              }
              detailsMessage += `\n${i + 1}. _${author}_ (${date}):\n   ${text}\n`;
            });
          } else {
            detailsMessage += `\n💬 _Nenhum comentário ainda._`;
          }
          
          // Send text message first
          await sendResponse(detailsMessage);
          
          // Then send each attachment as media
          if (ticketAttachments && ticketAttachments.length > 0) {
            console.log(`📎 Sending ${ticketAttachments.length} attachments as media...`);
            
            for (const attachment of ticketAttachments) {
              const mimeType = attachment.type || 'application/octet-stream';
              const caption = `📎 ${attachment.name}`;
              
              const success = await sendMediaMessage(
                attachment.url,
                mimeType,
                attachment.name,
                caption
              );
              
              if (!success) {
                console.log(`⚠️ Failed to send attachment: ${attachment.name}`);
              }
              
              // Small delay between sends to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('✅ All attachments sent');
          }
          
          break;
        }

        case 'close': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *encerrar 00001*');
            break;
          }
          
          const { data: closeTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!closeTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Check permission
          const { allowed } = await checkTicketPermission(supabase, closeTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para encerrar este chamado.*\n\n` +
              `👤 Apenas o criador do chamado ou administradores/técnicos cadastrados podem encerrá-lo.`
            );
            break;
          }

          if (closeTicket.status === 'closed') {
            await sendResponse(`⚠️ Este chamado já está fechado.`);
            break;
          }

          // Create confirmation session instead of executing directly
          await supabase.from('whatsapp_sessions').upsert({
            phone: senderPhone,
            state: 'confirm_close',
            data: { 
              ticket_id: closeTicket.id, 
              ticket_number: closeTicket.ticket_number,
              ticket_title: closeTicket.title 
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone' });

          await sendResponse(
            `⚠️ *Confirmar Encerramento*\n\n` +
            `📋 *${closeTicket.ticket_number}*\n` +
            `📝 ${closeTicket.title}\n\n` +
            `Tem certeza que deseja *encerrar definitivamente*?\n\n` +
            `✅ Responda *sim* para confirmar\n` +
            `❌ Responda *nao* para cancelar`
          );
          break;
        }

        case 'reopen': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *reabrir 00001*');
            break;
          }
          
          const { data: reopenTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!reopenTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Check permission
          const { allowed, role } = await checkTicketPermission(supabase, reopenTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para reabrir este chamado.*\n\n` +
              `👤 Apenas o criador do chamado ou administradores/técnicos cadastrados podem reabri-lo.\n\n` +
              `💡 Se você é um técnico, peça ao administrador para cadastrar seu número de telefone no sistema.`
            );
            break;
          }

          if (reopenTicket.status === 'open' || reopenTicket.status === 'in_progress') {
            await sendResponse(`⚠️ Este chamado já está aberto (${getStatusLabel(reopenTicket.status)}).`);
            break;
          }

          // Reopen the ticket
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              status: 'open',
              closed_at: null,
              resolved_at: null
            })
            .eq('id', reopenTicket.id);

          if (updateError) {
            console.error('❌ Error reopening ticket:', updateError);
            await sendResponse(`❌ Erro ao reabrir chamado. Tente novamente.`);
            break;
          }

          // Add system comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: reopenTicket.id,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: `Chamado reaberto via WhatsApp por ${pushName}`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          await sendResponse(
            `✅ *Chamado ${ticketNum} Reaberto*\n\n` +
            `📋 ${reopenTicket.title}\n` +
            `${getStatusEmoji('open')} Status: Aberto\n\n` +
            `O chamado voltou para a fila de atendimento.`
          );
          break;
        }

        case 'start': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *iniciar 00001*');
            break;
          }
          
          // Find ticket
          const { data: startTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!startTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Check permission
          const { allowed } = await checkTicketPermission(supabase, startTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para alterar este chamado.*\n\n` +
              `👤 Apenas o criador, técnico atribuído ou administradores podem alterar o status.`
            );
            break;
          }

          if (startTicket.status === 'in_progress') {
            await sendResponse(`⚠️ Este chamado já está em andamento.`);
            break;
          }

          if (startTicket.status === 'closed') {
            await sendResponse(`⚠️ Este chamado está fechado. Use *reabrir ${ticketNum.split('-')[2]}* primeiro.`);
            break;
          }

          // Update to in_progress
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ status: 'in_progress' })
            .eq('id', startTicket.id);

          if (updateError) {
            console.error('❌ Error starting ticket:', updateError);
            await sendResponse(`❌ Erro ao iniciar chamado. Tente novamente.`);
            break;
          }

          // Add comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: startTicket.id,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: `Status alterado para "Em Andamento" via WhatsApp por ${pushName}`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          await sendResponse(
            `✅ *Chamado ${ticketNum} Iniciado*\n\n` +
            `📋 ${startTicket.title}\n` +
            `${getStatusEmoji('in_progress')} Status: Em Andamento`
          );
          break;
        }

        case 'resolve': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\nExemplo: *resolver 00001*');
            break;
          }
          
          // Find ticket
          const { data: resolveTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!resolveTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Check permission
          const { allowed } = await checkTicketPermission(supabase, resolveTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para resolver este chamado.*\n\n` +
              `👤 Apenas o criador, técnico atribuído ou administradores podem resolver.`
            );
            break;
          }

          if (resolveTicket.status === 'resolved') {
            await sendResponse(`⚠️ Este chamado já está resolvido.`);
            break;
          }

          if (resolveTicket.status === 'closed') {
            await sendResponse(`⚠️ Este chamado está fechado. Use *reabrir ${ticketNum.split('-')[2]}* primeiro.`);
            break;
          }

          // Create confirmation session instead of executing directly
          await supabase.from('whatsapp_sessions').upsert({
            phone: senderPhone,
            state: 'confirm_resolve',
            data: { 
              ticket_id: resolveTicket.id, 
              ticket_number: resolveTicket.ticket_number,
              ticket_title: resolveTicket.title 
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone' });

          await sendResponse(
            `⚠️ *Confirmar Resolução*\n\n` +
            `📋 *${resolveTicket.ticket_number}*\n` +
            `📝 ${resolveTicket.title}\n\n` +
            `Tem certeza que deseja marcar como *resolvido*?\n\n` +
            `✅ Responda *sim* para confirmar\n` +
            `❌ Responda *nao* para cancelar`
          );
          break;
        }

        case 'priority': {
          // Parse: "00001 alta" or "TKT-2025-00001 crítica"
          const parts = command.args.split(/\s+/);
          
          if (parts.length < 2) {
            await sendResponse(
              `⚠️ Informe o número do chamado e a nova prioridade.\n` +
              `Exemplo: *prioridade 00001 alta*\n\n` +
              `📋 Prioridades: baixa, média, alta, crítica`
            );
            break;
          }
          
          const ticketPart = parts.slice(0, -1).join(' ');
          const priorityPart = parts[parts.length - 1];
          
          const ticketNum = parseTicketNumberFromArgs(ticketPart);
          const newPriority = parsePriority(priorityPart);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Número do chamado inválido.\nExemplo: *prioridade 00001 alta*');
            break;
          }
          
          if (!newPriority) {
            await sendResponse(
              `⚠️ Prioridade inválida: "${priorityPart}"\n\n` +
              `📋 Prioridades válidas: baixa, média, alta, crítica`
            );
            break;
          }
          
          const { data: priorityTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!priorityTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }

          // Check permission
          const { allowed, role } = await checkTicketPermission(supabase, priorityTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para alterar este chamado.*\n\n` +
              `👤 Apenas o criador do chamado ou administradores/técnicos cadastrados podem alterar a prioridade.\n\n` +
              `💡 Se você é um técnico, peça ao administrador para cadastrar seu número de telefone no sistema.`
            );
            break;
          }

          if (priorityTicket.priority === newPriority) {
            await sendResponse(`⚠️ O chamado já está com prioridade ${getPriorityLabel(newPriority)}.`);
            break;
          }

          const oldPriority = priorityTicket.priority;

          // Update priority
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ priority: newPriority })
            .eq('id', priorityTicket.id);

          if (updateError) {
            console.error('❌ Error updating priority:', updateError);
            await sendResponse(`❌ Erro ao alterar prioridade. Tente novamente.`);
            break;
          }

          // Add system comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: priorityTicket.id,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: `Prioridade alterada de ${getPriorityLabel(oldPriority)} para ${getPriorityLabel(newPriority)} via WhatsApp por ${pushName}`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          await sendResponse(
            `✅ *Prioridade Alterada*\n\n` +
            `📋 Chamado: ${ticketNum}\n` +
            `${getPriorityEmoji(oldPriority)} Anterior: ${getPriorityLabel(oldPriority)}\n` +
            `${getPriorityEmoji(newPriority)} Nova: ${getPriorityLabel(newPriority)}`
          );
          break;
        }

        case 'novo': {
          // Category map
          const categoryMap: Record<string, string> = {
            'hardware': 'hardware',
            'software': 'software',
            'rede': 'network',
            'network': 'network',
            'acesso': 'access',
            'access': 'access',
            'manutenção': 'maintenance',
            'manutencao': 'maintenance',
            'maintenance': 'maintenance',
            'instalação': 'installation',
            'instalacao': 'installation',
            'installation': 'installation',
            'outros': 'other',
            'other': 'other'
          };
          
          // If no args, show category menu
          if (!command.args) {
            const categoryMenu = `📝 *Abrir Novo Chamado*\n\n` +
              `Escolha a categoria:\n\n` +
              `1️⃣ *novo hardware* - Hardware\n` +
              `2️⃣ *novo software* - Software\n` +
              `3️⃣ *novo rede* - Rede\n` +
              `4️⃣ *novo acesso* - Acesso\n` +
              `5️⃣ *novo manutenção* - Manutenção\n` +
              `6️⃣ *novo instalação* - Instalação\n` +
              `7️⃣ *novo outros* - Outros\n\n` +
              `💡 Ou use: *novo: [título]* para criar rápido`;
            
            await sendResponse(categoryMenu);
            break;
          }
          
          const argsLower = command.args.toLowerCase();
          const firstWord = argsLower.split(' ')[0];
          const detectedCategory = categoryMap[firstWord];
          const remainingText = command.args.replace(new RegExp(`^${firstWord}\\s*`, 'i'), '').trim();
          
          // If category detected without remaining text, start wizard
          if (detectedCategory && !remainingText) {
            // Save session to continue the flow
            await supabase
              .from('whatsapp_sessions')
              .upsert({
                phone: senderPhone,
                state: 'awaiting_description',
                data: { category: detectedCategory },
                updated_at: new Date().toISOString()
              }, { onConflict: 'phone' });
            
            await sendResponse(
              `📝 *Categoria: ${getCategoryLabel(detectedCategory)}*\n\n` +
              `Agora descreva o problema:\n\n` +
              `💡 Digite a descrição do chamado ou *cancelar criação* para desistir.`
            );
            break;
          }
          
          // If category + text, create ticket with that category and text as title
          if (detectedCategory && remainingText) {
            const { data: newTicket, error: createError } = await supabase
              .from('support_tickets')
              .insert({
                title: remainingText,
                description: `Chamado aberto via WhatsApp por ${pushName}`,
                category: detectedCategory,
                priority: 'medium',
                status: 'open',
                contact_phone: senderPhone || null,
                created_by: '00000000-0000-0000-0000-000000000000'
              })
              .select()
              .single();

            if (createError) {
              console.error('❌ Error creating ticket:', createError);
              await sendResponse('❌ Erro ao criar chamado. Tente novamente.');
            } else {
              const successMessage = `✅ *Chamado Criado com Sucesso!*\n\n` +
                `📋 Número: *${newTicket.ticket_number}*\n` +
                `📝 Título: ${newTicket.title}\n` +
                `🏷️ Categoria: ${getCategoryLabel(detectedCategory)}\n` +
                `${getStatusEmoji('open')} Status: Aberto\n\n` +
                `Acompanhe seu chamado pelo número acima.\n` +
                `Use *detalhes ${newTicket.ticket_number.split('-')[2]}* para ver mais informações.`;
              
              await sendResponse(successMessage);

              await supabase
                .from('whatsapp_message_mapping')
                .insert({
                  ticket_id: newTicket.id,
                  message_id: messageId,
                  group_id: groupId,
                  phone_number: senderPhone,
                  direction: 'inbound'
                });
            }
            break;
          }

          // No category detected - use args as title (quick mode)
          const { data: newTicket, error: createError } = await supabase
            .from('support_tickets')
            .insert({
              title: command.args,
              description: `Chamado aberto via WhatsApp por ${pushName}`,
              category: 'other',
              priority: 'medium',
              status: 'open',
              contact_phone: senderPhone || null,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating ticket:', createError);
            await sendResponse('❌ Erro ao criar chamado. Tente novamente.');
          } else {
            const successMessage = `✅ *Chamado Criado com Sucesso!*\n\n` +
              `📋 Número: *${newTicket.ticket_number}*\n` +
              `📝 Título: ${newTicket.title}\n` +
              `${getStatusEmoji('open')} Status: Aberto\n\n` +
              `Acompanhe seu chamado pelo número acima.\n` +
              `Use *detalhes ${newTicket.ticket_number.split('-')[2]}* para ver mais informações.`;
            
            await sendResponse(successMessage);

            await supabase
              .from('whatsapp_message_mapping')
              .insert({
                ticket_id: newTicket.id,
                message_id: messageId,
                group_id: groupId,
                phone_number: senderPhone,
                direction: 'inbound'
              });
          }
          break;
        }

        case 'available': {
          // Check if sender is a technician or admin
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`phone.ilike.%${phoneDigits}%`)
            .maybeSingle();
          
          if (!profile) {
            await sendResponse(
              `⛔ *Você não está cadastrado no sistema.*\n\n` +
              `Este comando é exclusivo para técnicos cadastrados.`
            );
            break;
          }
          
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          const roles = userRoles?.map((r: any) => r.role) || [];
          
          if (!roles.includes('admin') && !roles.includes('technician')) {
            await sendResponse('⛔ Apenas técnicos podem ver chamados disponíveis.');
            break;
          }
          
          // Fetch unassigned tickets
          const { data: availableTickets } = await supabase
            .from('support_tickets')
            .select('*')
            .is('assigned_to', null)
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: true })
            .limit(15);
          
          if (!availableTickets?.length) {
            await sendResponse('✅ Não há chamados disponíveis no momento.');
          } else {
            let message = `🔓 *Chamados Disponíveis* (${availableTickets.length})\n\n`;
            
            availableTickets.forEach((t, i) => {
              message += `${i + 1}. *${t.ticket_number}*\n`;
              message += `   📝 ${t.title}\n`;
              message += `   ${getPriorityEmoji(t.priority)} ${getPriorityLabel(t.priority)} | `;
              message += `🏷️ ${getCategoryLabel(t.category)}\n\n`;
            });
            
            message += `💡 Use *atribuir XXXXX* para assumir um chamado.`;
            
            await sendResponse(message);
          }
          break;
        }

        case 'cancel_wizard': {
          // Cancel any active wizard session
          await supabase
            .from('whatsapp_sessions')
            .delete()
            .eq('phone', senderPhone);
          
          await sendResponse('❌ Operação cancelada. Se precisar, é só chamar.');
          break;
        }

        case 'start_wizard': {
          // Start the guided ticket creation wizard
          await supabase.from('whatsapp_sessions').upsert({
            phone: senderPhone,
            state: 'wizard_categoria',
            data: {},
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone' });

          await sendResponse(
            `🛠️ *Vamos abrir um chamado!*\n\n` +
            `Escolha a categoria:\n\n` +
            `1️⃣ Manutenção\n` +
            `2️⃣ Rede\n` +
            `3️⃣ Hardware\n` +
            `4️⃣ Software\n` +
            `5️⃣ Acesso\n` +
            `6️⃣ Instalação\n` +
            `7️⃣ Outro\n\n` +
            `💡 _Responda apenas com o número_\n` +
            `❌ _Digite *cancelar* para sair_`
          );
          break;
        }

        case 'skip': {
          // Handle skip command for wizard (skip due date)
          const { data: skipSession } = await supabase
            .from('whatsapp_sessions')
            .select('*')
            .eq('phone', senderPhone)
            .maybeSingle();
          
          if (!skipSession || skipSession.state !== 'awaiting_due_date') {
            await sendResponse('⚠️ Nenhum chamado em criação para pular.');
            break;
          }
          
          const sessionData = skipSession.data as { category: string; description: string };
          
          // Create ticket without due date
          const { data: newTicket, error: createError } = await supabase
            .from('support_tickets')
            .insert({
              title: sessionData.description.substring(0, 100),
              description: sessionData.description,
              category: sessionData.category,
              priority: 'medium',
              status: 'open',
              contact_phone: senderPhone,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();
          
          // Clean session
          await supabase.from('whatsapp_sessions').delete().eq('phone', senderPhone);
          
          if (createError) {
            console.error('❌ Error creating ticket:', createError);
            await sendResponse('❌ Erro ao criar chamado. Tente novamente.');
          } else {
            const successMessage = `✅ *Chamado Criado com Sucesso!*\n\n` +
              `📋 Número: *${newTicket.ticket_number}*\n` +
              `📝 Título: ${newTicket.title}\n` +
              `🏷️ Categoria: ${getCategoryLabel(sessionData.category)}\n` +
              `${getStatusEmoji('open')} Status: Aberto\n\n` +
              `Acompanhe seu chamado pelo número acima.`;
            
            await sendResponse(successMessage);

            await supabase
              .from('whatsapp_message_mapping')
              .insert({
                ticket_id: newTicket.id,
                message_id: messageId,
                group_id: groupId,
                phone_number: senderPhone,
                direction: 'inbound'
              });
          }
          break;
        }

        case 'my_stats': {
          // Technician statistics command
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: profile } = await supabase.from('profiles').select('id, full_name').or(`phone.ilike.%${phoneDigits}%`).maybeSingle();
          
          if (!profile) {
            await sendResponse('⛔ Você não está cadastrado no sistema.');
            break;
          }
          
          const { data: userRoles } = await supabase.from('user_roles').select('role').eq('user_id', profile.id);
          const roles = userRoles?.map((r: any) => r.role) || [];
          
          if (!roles.includes('admin') && !roles.includes('technician')) {
            await sendResponse('⛔ Apenas técnicos podem ver estatísticas.');
            break;
          }
          
          // Fetch stats
          const { data: allTickets } = await supabase.from('support_tickets').select('*').eq('assigned_to', profile.id);
          const tickets = allTickets || [];
          const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
          const pending = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
          
          // Calculate avg resolution time
          let avgMinutes = 0;
          const withTime = resolved.filter(t => t.resolved_at && t.created_at);
          if (withTime.length > 0) {
            const total = withTime.reduce((sum, t) => {
              const created = new Date(t.created_at!).getTime();
              const resolvedAt = new Date(t.resolved_at!).getTime();
              return sum + (resolvedAt - created) / 60000;
            }, 0);
            avgMinutes = Math.round(total / withTime.length);
          }
          
          const hours = Math.floor(avgMinutes / 60);
          const mins = avgMinutes % 60;
          const avgTime = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
          
          // Today/week/month
          const today = new Date(); today.setHours(0,0,0,0);
          const weekAgo = new Date(today.getTime() - 7*24*60*60*1000);
          const monthAgo = new Date(today.getTime() - 30*24*60*60*1000);
          
          const resolvedToday = resolved.filter(t => new Date(t.resolved_at!) >= today).length;
          const resolvedWeek = resolved.filter(t => new Date(t.resolved_at!) >= weekAgo).length;
          const resolvedMonth = resolved.filter(t => new Date(t.resolved_at!) >= monthAgo).length;
          
          const rate = tickets.length > 0 ? Math.round((resolved.length / tickets.length) * 100) : 0;
          
          const msg = `📊 *Suas Estatísticas*\n\n` +
            `📋 Total Atendidos: ${tickets.length}\n` +
            `✅ Resolvidos: ${resolved.length}\n` +
            `🔄 Em Andamento: ${pending.length}\n\n` +
            `⏱️ Tempo Médio: ${avgTime}\n` +
            `📈 Taxa de Resolução: ${rate}%\n\n` +
            `📅 Hoje: ${resolvedToday} resolvidos\n` +
            `📅 Esta Semana: ${resolvedWeek} resolvidos\n` +
            `📅 Este Mês: ${resolvedMonth} resolvidos`;
          
          await sendResponse(msg);
          break;
        }

        case 'my_resolved': {
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: profile } = await supabase.from('profiles').select('id, full_name').or(`phone.ilike.%${phoneDigits}%`).maybeSingle();
          
          if (!profile) {
            await sendResponse('⛔ Você não está cadastrado no sistema.');
            break;
          }
          
          const { data: resolved } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('assigned_to', profile.id)
            .in('status', ['resolved', 'closed'])
            .order('resolved_at', { ascending: false })
            .limit(15);
          
          if (!resolved?.length) {
            await sendResponse('📭 Você ainda não possui chamados resolvidos.');
          } else {
            let msg = `✅ *Seus Chamados Resolvidos* (${resolved.length})\n\n`;
            resolved.forEach((t, i) => {
              const resolvedDate = t.resolved_at ? new Date(t.resolved_at).toLocaleDateString('pt-BR') : 'N/A';
              msg += `${i+1}. *${t.ticket_number}*\n`;
              msg += `   📝 ${t.title.substring(0, 40)}${t.title.length > 40 ? '...' : ''}\n`;
              msg += `   📅 ${resolvedDate}\n\n`;
            });
            await sendResponse(msg);
          }
          break;
        }

        case 'confirm_yes':
        case 'confirm_no': {
          await sendResponse('⚠️ Nenhuma ação pendente de confirmação.');
          break;
        }

        case 'list': {
          // List tickets for this phone number (as client OR technician)
          const showAll = command.args === 'all';
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          
          // First, try to find user's profile to get their ID
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .or(`phone.ilike.%${phoneDigits}%`)
            .maybeSingle();
          
          // Build OR conditions: contact_phone (client) OR technician_phone OR assigned_to (technician)
          let orConditions = [
            `contact_phone.ilike.%${phoneDigits}%`,
            `technician_phone.ilike.%${phoneDigits}%`
          ];
          
          if (userProfile) {
            orConditions.push(`assigned_to.eq.${userProfile.id}`);
          }
          
          // Build query
          let query = supabase
            .from('support_tickets')
            .select('*')
            .or(orConditions.join(','))
            .order('created_at', { ascending: false });
          
          // Apply status filter if not showing all
          if (!showAll) {
            query = query.in('status', ['open', 'in_progress']);
          }
          
          const { data: userTickets } = await query.limit(showAll ? 20 : 15);

          if (!userTickets || userTickets.length === 0) {
            if (showAll) {
              await sendResponse('📭 Você não possui chamados registrados.');
            } else {
              await sendResponse('📭 Você não possui chamados abertos no momento.\n\n💡 Use *todos chamados* para ver resolvidos e fechados.');
            }
          } else {
            // Separate tickets by role
            const myAssigned = userTickets.filter(t => 
              t.assigned_to === userProfile?.id || 
              t.technician_phone?.includes(phoneDigits)
            );
            const myCreated = userTickets.filter(t => 
              t.contact_phone?.includes(phoneDigits) &&
              !myAssigned.find(a => a.id === t.id)
            );
            
            const listTitle = showAll ? 'Todos os Seus Chamados' : 'Seus Chamados Abertos';
            let listMessage = `📋 *${listTitle}*\n\n`;
            let counter = 1;
            
            if (myAssigned.length > 0) {
              listMessage += `👨‍🔧 *Atribuídos a Você:*\n`;
              myAssigned.forEach((t) => {
                listMessage += `${counter}. *${t.ticket_number}*\n`;
                listMessage += `   📝 ${t.title}\n`;
                listMessage += `   ${getStatusEmoji(t.status)} ${getStatusLabel(t.status)} | ${getPriorityEmoji(t.priority)} ${getPriorityLabel(t.priority)}\n\n`;
                counter++;
              });
            }
            
            if (myCreated.length > 0) {
              listMessage += `📞 *Abertos por Você:*\n`;
              myCreated.forEach((t) => {
                listMessage += `${counter}. *${t.ticket_number}*\n`;
                listMessage += `   📝 ${t.title}\n`;
                listMessage += `   ${getStatusEmoji(t.status)} ${getStatusLabel(t.status)} | ${getPriorityEmoji(t.priority)} ${getPriorityLabel(t.priority)}\n\n`;
                counter++;
              });
            }
            
            listMessage += `💡 Use *detalhes ${userTickets[0].ticket_number.split('-')[2]}* para ver mais.`;
            
            if (!showAll) {
              listMessage += `\n📋 Use *todos chamados* para ver resolvidos e fechados.`;
            }
            
            await sendResponse(listMessage);
          }
          break;
        }

        case 'comment': {
          // Parse: "00001 texto do comentário" or "#TKT-2025-00001 texto"
          const firstSpace = command.args.indexOf(' ');
          
          if (firstSpace === -1) {
            await sendResponse(
              '⚠️ Informe o número do chamado e o comentário.\n' +
              'Exemplo: *comentar 00001 Texto do comentário*'
            );
            break;
          }
          
          const ticketPart = command.args.substring(0, firstSpace);
          const commentText = command.args.substring(firstSpace + 1).trim();
          
          const ticketNum = parseTicketNumberFromArgs(ticketPart);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Número do chamado inválido.\nExemplo: *comentar 00001 Seu comentário*');
            break;
          }
          
          if (!commentText) {
            await sendResponse('⚠️ Informe o texto do comentário.\nExemplo: *comentar 00001 Seu comentário*');
            break;
          }
          
          // Fetch ticket
          const { data: commentTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();
          
          if (!commentTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }
          
          // Process media if present
          let attachments: any[] = [];
          if (hasMedia && settings) {
            console.log('📎 Processing media for comment command...');
            const mediaAttachment = await downloadAndUploadMedia(
              supabase,
              settings,
              key,
              mediaType,
              mimeType,
              fileName,
              commentTicket.id
            );
            if (mediaAttachment) {
              attachments.push(mediaAttachment);
            }
          }
          
          // Insert comment
          const { error: insertError } = await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: commentTicket.id,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: commentText,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone,
              attachments: attachments.length > 0 ? attachments : null
            });
          
          if (insertError) {
            console.error('❌ Error adding comment via command:', insertError);
            await sendResponse('❌ Erro ao adicionar comentário. Tente novamente.');
          } else {
            // Save message mapping
            await supabase
              .from('whatsapp_message_mapping')
              .insert({
                ticket_id: commentTicket.id,
                message_id: messageId,
                group_id: groupId,
                phone_number: senderPhone,
                direction: 'inbound'
              });
            
            let successMsg = `✅ Comentário adicionado ao chamado *${ticketNum}*\n\n`;
            successMsg += `💬 "${commentText.length > 60 ? commentText.substring(0, 60) + '...' : commentText}"`;
            if (attachments.length > 0) {
              successMsg += `\n📎 ${attachments.length} anexo(s) incluído(s)`;
            }
            
            await sendResponse(successMsg);
          }
          break;
        }

        case 'assign': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\n\nExemplo: *atribuir 00001*');
            break;
          }
          
          // Find ticket
          const { data: assignTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!assignTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }
          
          // Verify sender is a technician or admin by phone
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .or(`phone.ilike.%${phoneDigits}%`)
            .maybeSingle();
          
          if (!profile) {
            await sendResponse(
              `⛔ *Você não está cadastrado no sistema.*\n\n` +
              `Para usar este comando, seu telefone precisa estar vinculado ao seu perfil.\n\n` +
              `💡 Peça ao administrador para cadastrar seu telefone ou acesse seu perfil no sistema.`
            );
            break;
          }
          
          // Check if has technician or admin role
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          const roles = userRoles?.map((r: any) => r.role) || [];
          
          if (!roles.includes('admin') && !roles.includes('technician')) {
            await sendResponse(
              `⛔ *Você não tem permissão para atribuir chamados.*\n\n` +
              `👤 Apenas técnicos e administradores podem usar este comando.`
            );
            break;
          }
          
          // Check if already assigned to someone else
          if (assignTicket.assigned_to && assignTicket.assigned_to !== profile.id) {
            // Fetch current assignee name
            const { data: currentTech } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', assignTicket.assigned_to)
              .maybeSingle();
            
            await sendResponse(
              `⚠️ *Este chamado já está atribuído.*\n\n` +
              `👨‍🔧 Técnico atual: *${currentTech?.full_name || 'Desconhecido'}*\n\n` +
              `💡 Para reatribuir, peça ao técnico atual ou a um admin.`
            );
            break;
          }
          
          // Assign the ticket
          const newStatus = assignTicket.status === 'open' ? 'in_progress' : assignTicket.status;
          
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              assigned_to: profile.id,
              technician_phone: profile.phone || senderPhone,
              status: newStatus
            })
            .eq('id', assignTicket.id);

          if (updateError) {
            console.error('❌ Error assigning ticket:', updateError);
            await sendResponse(`❌ Erro ao atribuir chamado. Tente novamente.`);
            break;
          }

          // Add system comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: assignTicket.id,
              user_id: profile.id,
              comment: `Chamado atribuído a ${profile.full_name || pushName} via WhatsApp`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          // Build response message
          let responseMsg = `✅ *Chamado ${ticketNum} Atribuído a Você*\n\n` +
            `📋 ${assignTicket.title}\n` +
            `${getPriorityEmoji(assignTicket.priority)} Prioridade: ${getPriorityLabel(assignTicket.priority)}\n`;
          
          if (newStatus !== assignTicket.status) {
            responseMsg += `\n🔄 Status alterado para: *${getStatusLabel(newStatus)}*`;
          }
          
          responseMsg += `\n\n💡 Use *detalhes ${ticketNum.split('-').pop()}* para ver mais informações.`;
          
          await sendResponse(responseMsg);
          
          // Notify client if has contact_phone and is different from sender
          if (assignTicket.contact_phone && settings) {
            const clientPhone = formatPhoneForQuery(assignTicket.contact_phone);
            const senderPhoneClean = formatPhoneForQuery(senderPhone);
            
            if (!clientPhone.includes(senderPhoneClean.slice(-9)) && !senderPhoneClean.includes(clientPhone.slice(-9))) {
              const clientMsg = `📢 *Atualização do Chamado ${ticketNum}*\n\n` +
                `Seu chamado foi atribuído ao técnico *${profile.full_name || pushName}*.\n\n` +
                `📋 ${assignTicket.title}\n` +
                `${getStatusEmoji(newStatus)} Status: ${getStatusLabel(newStatus)}\n\n` +
                `O técnico entrará em contato em breve!`;
              
              // Send to client (individual)
              const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
              try {
                await fetch(
                  `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
                  {
                    method: 'POST',
                    headers: {
                      'apikey': settings.evolutionApiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      number: assignTicket.contact_phone,
                      text: clientMsg,
                    }),
                  }
                );
                console.log('✅ Client notified about assignment');
              } catch (notifyErr) {
                console.error('⚠️ Error notifying client:', notifyErr);
              }
            }
          }
          
          break;
        }

        case 'transfer': {
          // Parse: "00001 5511999999999"
          const parts = command.args.split(/\s+/);
          
          if (parts.length < 2) {
            await sendResponse(
              `⚠️ Informe o número do chamado e o telefone do técnico.\n\n` +
              `Exemplo: *transferir 00001 5511999999999*`
            );
            break;
          }
          
          const ticketPart = parts[0];
          const targetPhone = parts.slice(1).join('').replace(/\D/g, '');
          
          const ticketNum = parseTicketNumberFromArgs(ticketPart);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Número do chamado inválido.\nExemplo: *transferir 00001 5511999999999*');
            break;
          }
          
          if (!targetPhone || targetPhone.length < 8) {
            await sendResponse('⚠️ Telefone do técnico inválido.\nExemplo: *transferir 00001 5511999999999*');
            break;
          }
          
          // Find ticket
          const { data: transferTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!transferTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }
          
          // Verify sender is a technician or admin by phone
          const senderPhoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .or(`phone.ilike.%${senderPhoneDigits}%`)
            .maybeSingle();
          
          if (!senderProfile) {
            await sendResponse(
              `⛔ *Você não está cadastrado no sistema.*\n\n` +
              `Para usar este comando, seu telefone precisa estar vinculado ao seu perfil.\n\n` +
              `💡 Acesse seu perfil no sistema para cadastrar seu telefone.`
            );
            break;
          }
          
          // Check if sender has technician or admin role
          const { data: senderRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', senderProfile.id);
          
          const senderRolesList = senderRoles?.map((r: any) => r.role) || [];
          
          if (!senderRolesList.includes('admin') && !senderRolesList.includes('technician')) {
            await sendResponse(
              `⛔ *Você não tem permissão para transferir chamados.*\n\n` +
              `👤 Apenas técnicos e administradores podem usar este comando.`
            );
            break;
          }
          
          // Check if sender is assigned to ticket or is admin
          if (transferTicket.assigned_to && 
              transferTicket.assigned_to !== senderProfile.id && 
              !senderRolesList.includes('admin')) {
            await sendResponse(
              `⛔ *Você não pode transferir este chamado.*\n\n` +
              `👤 Apenas o técnico atribuído ou um admin pode transferi-lo.`
            );
            break;
          }
          
          // Find target technician by phone
          const targetPhoneDigits = targetPhone.slice(-9);
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .or(`phone.ilike.%${targetPhoneDigits}%`)
            .maybeSingle();
          
          if (!targetProfile) {
            await sendResponse(
              `❌ *Técnico não encontrado.*\n\n` +
              `O telefone ${targetPhone} não está cadastrado no sistema.\n\n` +
              `💡 Verifique se o técnico cadastrou o telefone no perfil dele.`
            );
            break;
          }
          
          // Check if target is technician or admin
          const { data: targetRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', targetProfile.id);
          
          const targetRolesList = targetRoles?.map((r: any) => r.role) || [];
          
          if (!targetRolesList.includes('admin') && !targetRolesList.includes('technician')) {
            await sendResponse(
              `❌ *${targetProfile.full_name || 'Este usuário'} não é técnico.*\n\n` +
              `👤 Só é possível transferir para técnicos ou administradores.`
            );
            break;
          }
          
          // Don't transfer to self
          if (targetProfile.id === senderProfile.id) {
            await sendResponse(`⚠️ O chamado já está atribuído a você.`);
            break;
          }
          
          // Transfer the ticket
          const newStatus = transferTicket.status === 'open' ? 'in_progress' : transferTicket.status;
          
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              assigned_to: targetProfile.id,
              technician_phone: targetProfile.phone || targetPhone,
              status: newStatus
            })
            .eq('id', transferTicket.id);

          if (updateError) {
            console.error('❌ Error transferring ticket:', updateError);
            await sendResponse(`❌ Erro ao transferir chamado. Tente novamente.`);
            break;
          }

          // Add system comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: transferTicket.id,
              user_id: senderProfile.id,
              comment: `Chamado transferido de ${senderProfile.full_name || pushName} para ${targetProfile.full_name || 'outro técnico'} via WhatsApp`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          // Notify sender (confirmation)
          await sendResponse(
            `✅ *Chamado ${ticketNum} Transferido*\n\n` +
            `📋 ${transferTicket.title}\n` +
            `👨‍🔧 Novo técnico: *${targetProfile.full_name || 'Técnico'}*\n\n` +
            `O novo técnico foi notificado.`
          );
          
          // Notify target technician
          if (targetProfile.phone && settings) {
            const targetMsg = `📢 *Novo Chamado Atribuído a Você*\n\n` +
              `📋 Número: *${ticketNum}*\n` +
              `📝 ${transferTicket.title}\n` +
              `${getPriorityEmoji(transferTicket.priority)} Prioridade: ${getPriorityLabel(transferTicket.priority)}\n` +
              `${getStatusEmoji(newStatus)} Status: ${getStatusLabel(newStatus)}\n\n` +
              `👤 Transferido por: ${senderProfile.full_name || pushName}\n\n` +
              `💡 Use *detalhes ${ticketNum.split('-').pop()}* para ver mais.`;
            
            const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
            try {
              await fetch(
                `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
                {
                  method: 'POST',
                  headers: {
                    'apikey': settings.evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: targetProfile.phone,
                    text: targetMsg,
                  }),
                }
              );
              console.log('✅ Target technician notified');
            } catch (notifyErr) {
              console.error('⚠️ Error notifying target technician:', notifyErr);
            }
          }
          
          // Notify client if has contact_phone
          if (transferTicket.contact_phone && settings) {
            const clientPhone = formatPhoneForQuery(transferTicket.contact_phone);
            const senderPhoneClean = formatPhoneForQuery(senderPhone);
            
            if (!clientPhone.includes(senderPhoneClean.slice(-9)) && !senderPhoneClean.includes(clientPhone.slice(-9))) {
              const clientMsg = `📢 *Atualização do Chamado ${ticketNum}*\n\n` +
                `Seu chamado foi transferido para o técnico *${targetProfile.full_name || 'responsável'}*.\n\n` +
                `📋 ${transferTicket.title}\n` +
                `${getStatusEmoji(newStatus)} Status: ${getStatusLabel(newStatus)}\n\n` +
                `O técnico entrará em contato em breve!`;
              
              const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
              try {
                await fetch(
                  `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
                  {
                    method: 'POST',
                    headers: {
                      'apikey': settings.evolutionApiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      number: transferTicket.contact_phone,
                      text: clientMsg,
                    }),
                  }
                );
                console.log('✅ Client notified about transfer');
              } catch (notifyErr) {
                console.error('⚠️ Error notifying client:', notifyErr);
              }
            }
          }
          
          break;
        }

        case 'unassign': {
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse('⚠️ Informe o número do chamado.\n\nExemplo: *cancelar 00001*');
            break;
          }
          
          // Find ticket
          const { data: unassignTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();

          if (!unassignTicket) {
            await sendResponse(`❌ Chamado ${ticketNum} não encontrado.`);
            break;
          }
          
          // Check if ticket is assigned
          if (!unassignTicket.assigned_to) {
            await sendResponse(`⚠️ Este chamado não está atribuído a nenhum técnico.`);
            break;
          }
          
          // Verify sender is a technician or admin by phone
          const phoneDigits = formatPhoneForQuery(senderPhone).slice(-9);
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .or(`phone.ilike.%${phoneDigits}%`)
            .maybeSingle();
          
          if (!profile) {
            await sendResponse(
              `⛔ *Você não está cadastrado no sistema.*\n\n` +
              `Para usar este comando, seu telefone precisa estar vinculado ao seu perfil.\n\n` +
              `💡 Peça ao administrador para cadastrar seu telefone ou acesse seu perfil no sistema.`
            );
            break;
          }
          
          // Check roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          const roles = userRoles?.map((r: any) => r.role) || [];
          const isAdmin = roles.includes('admin');
          const isTechnician = roles.includes('technician');
          
          if (!isAdmin && !isTechnician) {
            await sendResponse(
              `⛔ *Você não tem permissão para cancelar atribuições.*\n\n` +
              `👤 Apenas técnicos e administradores podem usar este comando.`
            );
            break;
          }
          
          // Check if user can unassign (must be assigned to them, or be admin)
          const isAssignedToMe = unassignTicket.assigned_to === profile.id;
          
          if (!isAssignedToMe && !isAdmin) {
            // Fetch current assignee name
            const { data: currentTech } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', unassignTicket.assigned_to)
              .maybeSingle();
            
            await sendResponse(
              `⛔ *Você não pode cancelar esta atribuição.*\n\n` +
              `👨‍🔧 Técnico atual: *${currentTech?.full_name || 'Desconhecido'}*\n\n` +
              `💡 Apenas o técnico atribuído ou um administrador pode cancelar.`
            );
            break;
          }
          
          // Get current technician name before updating
          const { data: oldTech } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', unassignTicket.assigned_to)
            .maybeSingle();
          
          // Unassign the ticket
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              assigned_to: null,
              technician_phone: null,
              status: 'open' // Return to open status
            })
            .eq('id', unassignTicket.id);

          if (updateError) {
            console.error('❌ Error unassigning ticket:', updateError);
            await sendResponse(`❌ Erro ao cancelar atribuição. Tente novamente.`);
            break;
          }

          // Add system comment
          const commentText = isAssignedToMe 
            ? `${profile.full_name || pushName} cancelou sua atribuição ao chamado via WhatsApp`
            : `${profile.full_name || pushName} (admin) removeu a atribuição de ${oldTech?.full_name || 'técnico'} via WhatsApp`;
          
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: unassignTicket.id,
              user_id: profile.id,
              comment: commentText,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          // Build response message
          const responseMsg = isAssignedToMe
            ? `✅ *Atribuição Cancelada*\n\n` +
              `📋 Chamado: *${ticketNum}*\n` +
              `${unassignTicket.title}\n\n` +
              `🔄 Status alterado para: *Aberto*\n\n` +
              `O chamado voltou para a fila de atendimento.`
            : `✅ *Atribuição Removida*\n\n` +
              `📋 Chamado: *${ticketNum}*\n` +
              `👨‍🔧 Técnico removido: *${oldTech?.full_name || 'Desconhecido'}*\n\n` +
              `🔄 Status alterado para: *Aberto*`;
          
          await sendResponse(responseMsg);
          
          // Notify client if has contact_phone
          if (unassignTicket.contact_phone && settings) {
            const clientMsg = `📢 *Atualização do Chamado ${ticketNum}*\n\n` +
              `Seu chamado voltou para a fila de atendimento.\n\n` +
              `📋 ${unassignTicket.title}\n` +
              `${getStatusEmoji('open')} Status: Aberto\n\n` +
              `Um técnico será atribuído em breve.`;
            
            const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
            try {
              await fetch(
                `${apiUrl}/message/sendText/${settings.evolutionInstance}`,
                {
                  method: 'POST',
                  headers: {
                    'apikey': settings.evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: unassignTicket.contact_phone,
                    text: clientMsg,
                  }),
                }
              );
              console.log('✅ Client notified about unassignment');
            } catch (notifyErr) {
              console.error('⚠️ Error notifying client:', notifyErr);
            }
          }
          
          break;
        }

        case 'attach': {
          // Attach media to existing ticket
          const ticketNum = parseTicketNumberFromArgs(command.args);
          
          if (!ticketNum) {
            await sendResponse(
              `⚠️ *Informe o número do chamado*\n\n` +
              `Use: *anexar [número]*\n` +
              `Exemplo: *anexar 00001* ou *anexar TKT-2025-00001*\n\n` +
              `💡 Envie uma foto ou documento com esta legenda.`
            );
            break;
          }
          
          // Check if there's media in the message
          if (!hasMedia) {
            await sendResponse(
              `❌ *Nenhuma mídia encontrada*\n\n` +
              `Para anexar um arquivo, envie uma foto ou documento ` +
              `com a legenda:\n\n` +
              `📎 *anexar ${ticketNum.split('-').pop()}*\n\n` +
              `💡 _Envie a foto ou PDF junto com o comando_`
            );
            break;
          }
          
          // Find the ticket
          const { data: attachTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', ticketNum)
            .maybeSingle();
          
          if (!attachTicket) {
            await sendResponse(`❌ Chamado *${ticketNum}* não encontrado.`);
            break;
          }
          
          // Check permission
          const attachPerm = await checkTicketPermission(supabase, attachTicket, senderPhone);
          if (!attachPerm.allowed) {
            await sendResponse(
              `🔒 *Acesso Negado*\n\n` +
              `Você não tem permissão para anexar arquivos a este chamado.\n\n` +
              `💡 Apenas o criador ou técnicos podem anexar.`
            );
            break;
          }
          
          // Process media
          if (!settings) {
            await sendResponse(`❌ Configurações do WhatsApp não encontradas.`);
            break;
          }
          
          console.log('📎 Processing media attachment for ticket:', ticketNum);
          const mediaAttachment = await downloadAndUploadMedia(
            supabase,
            settings,
            key,
            mediaType,
            mimeType,
            fileName,
            attachTicket.id
          );
          
          if (!mediaAttachment) {
            await sendResponse(
              `❌ *Erro ao processar arquivo*\n\n` +
              `Não foi possível salvar o anexo. Tente novamente.`
            );
            break;
          }
          
          // Update ticket attachments
          const currentAttachments = Array.isArray(attachTicket.attachments) 
            ? attachTicket.attachments 
            : [];
          const updatedAttachments = [...currentAttachments, mediaAttachment];
          
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              attachments: updatedAttachments,
              updated_at: new Date().toISOString()
            })
            .eq('id', attachTicket.id);
          
          if (updateError) {
            console.error('❌ Error updating ticket attachments:', updateError);
            await sendResponse(`❌ Erro ao salvar anexo. Tente novamente.`);
            break;
          }
          
          // Calculate formatted size
          const sizeBytes = mediaAttachment.size || 0;
          let sizeFormatted = '';
          if (sizeBytes >= 1024 * 1024) {
            sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
          } else if (sizeBytes >= 1024) {
            sizeFormatted = `${Math.round(sizeBytes / 1024)} KB`;
          } else {
            sizeFormatted = `${sizeBytes} bytes`;
          }
          
          // Create a comment to log the attachment
          await supabase.from('ticket_comments').insert({
            ticket_id: attachTicket.id,
            user_id: '00000000-0000-0000-0000-000000000000',
            comment: `📎 Anexo adicionado via WhatsApp: ${mediaAttachment.name || fileName || 'arquivo'}`,
            is_internal: false,
            source: 'whatsapp',
            whatsapp_sender_name: pushName,
            whatsapp_sender_phone: senderPhone,
            attachments: [mediaAttachment]
          });
          
          // Save message mapping
          await supabase
            .from('whatsapp_message_mapping')
            .insert({
              ticket_id: attachTicket.id,
              message_id: messageId,
              group_id: groupId,
              phone_number: senderPhone,
              direction: 'inbound'
            });
          
          await sendResponse(
            `✅ *Anexo Adicionado!*\n\n` +
            `📋 Chamado: *${ticketNum}*\n` +
            `📎 Arquivo: ${mediaAttachment.name || fileName || 'arquivo'}\n` +
            `📊 Tamanho: ${sizeFormatted}\n` +
            `📂 Total de anexos: ${updatedAttachments.length}\n\n` +
            `💡 _O anexo já está disponível no sistema._`
          );
          
          console.log('✅ Media attached successfully to ticket:', ticketNum);
          break;
        }

        case 'racks': {
          // List all racks with occupancy
          const { data: racksData, error: racksError } = await supabase
            .from('racks')
            .select(`
              id,
              name,
              size_u,
              rooms (
                name,
                floors (
                  name,
                  buildings (name)
                )
              )
            `)
            .order('name')
            .limit(15);

          if (racksError || !racksData || racksData.length === 0) {
            await sendResponse('📋 Nenhum rack cadastrado no sistema.');
            break;
          }

          // Get equipment count and used U for each rack
          const rackIds = racksData.map(r => r.id);
          const { data: equipData } = await supabase
            .from('equipment')
            .select('rack_id, position_u_start, position_u_end')
            .in('rack_id', rackIds);

          // Calculate occupancy per rack
          const occupancyMap: Record<string, { count: number; usedU: number }> = {};
          equipData?.forEach((eq: any) => {
            if (!occupancyMap[eq.rack_id]) {
              occupancyMap[eq.rack_id] = { count: 0, usedU: 0 };
            }
            occupancyMap[eq.rack_id].count++;
            if (eq.position_u_start && eq.position_u_end) {
              occupancyMap[eq.rack_id].usedU += (eq.position_u_end - eq.position_u_start + 1);
            }
          });

          let message = `📦 *RACKS DO SISTEMA*\n\n`;
          
          for (const rack of racksData) {
            const occupancy = occupancyMap[rack.id] || { count: 0, usedU: 0 };
            const percentage = Math.round((occupancy.usedU / rack.size_u) * 100);
            const room = rack.rooms as any;
            const location = room?.name || 'Sem sala';
            
            // Occupancy bar
            let bar = '';
            if (percentage >= 90) bar = '🔴';
            else if (percentage >= 70) bar = '🟠';
            else if (percentage >= 50) bar = '🟡';
            else bar = '🟢';
            
            message += `• *${rack.name}* (${rack.size_u}U)\n`;
            message += `  📍 ${location}\n`;
            message += `  ${bar} Ocupação: ${percentage}% (${occupancy.usedU}/${rack.size_u}U)\n`;
            message += `  🖥️ ${occupancy.count} equipamentos\n\n`;
          }
          
          message += `💡 _Use *rack [nome]* para ver detalhes_`;
          
          await sendResponse(message);
          break;
        }

        case 'rack': {
          // Rack details by name
          if (!command.args.trim()) {
            await sendResponse('⚠️ Informe o nome do rack.\n\nExemplo: *rack RACK-01*');
            break;
          }

          const searchName = command.args.trim();
          
          const { data: rackData } = await supabase
            .from('racks')
            .select(`
              id,
              name,
              size_u,
              notes,
              rooms (
                name,
                floors (
                  name,
                  buildings (name)
                )
              )
            `)
            .ilike('name', `%${searchName}%`)
            .limit(1)
            .maybeSingle();

          if (!rackData) {
            await sendResponse(`❌ Rack "${searchName}" não encontrado.`);
            break;
          }

          // Get equipment in this rack
          const { data: equipList } = await supabase
            .from('equipment')
            .select('name, type, position_u_start, position_u_end, ip_address')
            .eq('rack_id', rackData.id)
            .order('position_u_start');

          const room = rackData.rooms as any;
          const floor = room?.floors as any;
          const building = floor?.buildings as any;

          let message = `📦 *RACK ${rackData.name}*\n\n`;
          
          message += `📍 *Localização:*\n`;
          message += `  🏢 ${building?.name || '-'}\n`;
          message += `  🏬 ${floor?.name || '-'}\n`;
          message += `  🚪 ${room?.name || '-'}\n\n`;
          
          message += `📐 *Tamanho:* ${rackData.size_u}U\n`;
          
          if (rackData.notes) {
            message += `📝 *Notas:* ${rackData.notes}\n`;
          }

          // Calculate occupancy
          let usedU = 0;
          equipList?.forEach((eq: any) => {
            if (eq.position_u_start && eq.position_u_end) {
              usedU += (eq.position_u_end - eq.position_u_start + 1);
            }
          });
          const percentage = Math.round((usedU / rackData.size_u) * 100);
          
          message += `\n📊 *Ocupação:* ${percentage}% (${usedU}/${rackData.size_u}U)\n`;

          if (equipList && equipList.length > 0) {
            message += `\n🖥️ *Equipamentos (${equipList.length}):*\n`;
            equipList.slice(0, 10).forEach((eq: any) => {
              const uRange = eq.position_u_start && eq.position_u_end 
                ? `U${eq.position_u_start}-${eq.position_u_end}` 
                : '';
              message += `  • ${eq.name} ${uRange}\n`;
              if (eq.ip_address) {
                message += `    📡 ${eq.ip_address}\n`;
              }
            });
            if (equipList.length > 10) {
              message += `  _... e mais ${equipList.length - 10} equipamentos_\n`;
            }
          } else {
            message += `\n🖥️ *Equipamentos:* Nenhum\n`;
          }
          
          await sendResponse(message);
          break;
        }

        case 'ocupacao': {
          // Rack occupancy details
          if (!command.args.trim()) {
            await sendResponse('⚠️ Informe o nome do rack.\n\nExemplo: *ocupacao RACK-01*');
            break;
          }

          const searchName = command.args.trim();
          
          const { data: rackData } = await supabase
            .from('racks')
            .select('id, name, size_u')
            .ilike('name', `%${searchName}%`)
            .limit(1)
            .maybeSingle();

          if (!rackData) {
            await sendResponse(`❌ Rack "${searchName}" não encontrado.`);
            break;
          }

          // Get all equipment
          const { data: equipList } = await supabase
            .from('equipment')
            .select('name, position_u_start, position_u_end')
            .eq('rack_id', rackData.id)
            .order('position_u_start');

          // Build occupancy map
          const usedUnits: Set<number> = new Set();
          equipList?.forEach((eq: any) => {
            if (eq.position_u_start && eq.position_u_end) {
              for (let u = eq.position_u_start; u <= eq.position_u_end; u++) {
                usedUnits.add(u);
              }
            }
          });

          const freeU = rackData.size_u - usedUnits.size;
          const percentage = Math.round((usedUnits.size / rackData.size_u) * 100);

          // Find free ranges
          const freeRanges: string[] = [];
          let rangeStart = 0;
          for (let u = 1; u <= rackData.size_u; u++) {
            if (!usedUnits.has(u)) {
              if (rangeStart === 0) rangeStart = u;
            } else {
              if (rangeStart > 0) {
                const rangeEnd = u - 1;
                freeRanges.push(rangeStart === rangeEnd ? `U${rangeStart}` : `U${rangeStart}-${rangeEnd}`);
                rangeStart = 0;
              }
            }
          }
          if (rangeStart > 0) {
            const rangeEnd = rackData.size_u;
            freeRanges.push(rangeStart === rangeEnd ? `U${rangeStart}` : `U${rangeStart}-${rangeEnd}`);
          }

          let message = `📊 *OCUPAÇÃO: ${rackData.name}*\n\n`;
          
          // Visual bar
          let bar = '';
          if (percentage >= 90) bar = '🔴🔴🔴🔴🔴';
          else if (percentage >= 70) bar = '🟠🟠🟠🟠⚪';
          else if (percentage >= 50) bar = '🟡🟡🟡⚪⚪';
          else if (percentage >= 30) bar = '🟢🟢⚪⚪⚪';
          else bar = '🟢⚪⚪⚪⚪';
          
          message += `${bar} *${percentage}%*\n\n`;
          message += `📐 *Total:* ${rackData.size_u}U\n`;
          message += `🔴 *Ocupado:* ${usedUnits.size}U\n`;
          message += `🟢 *Livre:* ${freeU}U\n\n`;
          
          if (freeRanges.length > 0) {
            message += `📍 *Posições Livres:*\n`;
            message += `  ${freeRanges.slice(0, 8).join(', ')}\n`;
            if (freeRanges.length > 8) {
              message += `  _... e mais ${freeRanges.length - 8} faixas_\n`;
            }
          } else {
            message += `⚠️ *Rack completamente ocupado!*\n`;
          }
          
          await sendResponse(message);
          break;
        }

        case 'plantas': {
          // List floor plans or send multiple for a building
          const buildingFilter = command.args.trim();
          
          // Get all active floor plans
          const { data: plansData } = await supabase
            .from('floor_plans')
            .select(`
              id,
              name,
              file_url,
              file_type,
              is_active,
              floors (
                name,
                buildings (name)
              )
            `)
            .eq('is_active', true)
            .order('name');

          if (!plansData || plansData.length === 0) {
            await sendResponse('📋 Nenhuma planta baixa cadastrada.');
            break;
          }

          // If building filter is provided, send images
          if (buildingFilter) {
            const filteredPlans = plansData.filter(p => {
              const floor = p.floors as any;
              const building = floor?.buildings?.name || '';
              const floorName = floor?.name || '';
              const planName = p.name || '';
              const lowerFilter = buildingFilter.toLowerCase();
              return building.toLowerCase().includes(lowerFilter) ||
                     floorName.toLowerCase().includes(lowerFilter) ||
                     planName.toLowerCase().includes(lowerFilter);
            });

            if (filteredPlans.length === 0) {
              await sendResponse(
                `❌ Nenhuma planta encontrada para "${buildingFilter}".\n\n` +
                `💡 Digite *plantas* para ver todas.`
              );
              break;
            }

            // Limit to 5 plants at a time
            const plantsToSend = filteredPlans.slice(0, 5);
            
            await sendResponse(
              `🗺️ *PLANTAS: ${buildingFilter.toUpperCase()}*\n\n` +
              `📤 Enviando ${plantsToSend.length} planta(s)...`
            );

            // Send each floor plan as image with small delay between them
            for (const plan of plantsToSend) {
              const floor = plan.floors as any;
              const building = floor?.buildings as any;
              const caption = `🗺️ *${plan.name}*\n📍 ${building?.name || '-'} → ${floor?.name || '-'}`;
              
              // Determine MIME type
              let mimeType = 'image/png';
              if (plan.file_type === 'pdf') {
                mimeType = 'application/pdf';
              } else if (plan.file_type === 'jpg' || plan.file_type === 'jpeg') {
                mimeType = 'image/jpeg';
              }

              console.log(`📤 Sending floor plan: ${plan.name}, URL: ${plan.file_url}, MIME: ${mimeType}`);
              
              const sent = await sendMediaMessage(plan.file_url, mimeType, plan.name, caption);
              
              if (!sent) {
                console.error(`❌ Failed to send floor plan: ${plan.name}`);
                await sendResponse(
                  `⚠️ Falha ao enviar: *${plan.name}*\n\n` +
                  `🔗 *Acesse diretamente:*\n${plan.file_url}\n\n` +
                  `_Copie e cole o link no navegador_`
                );
              } else {
                console.log(`✅ Floor plan sent successfully: ${plan.name}`);
              }
              
              // Small delay between sends to avoid rate limiting
              await new Promise(r => setTimeout(r, 1500));
            }

            if (filteredPlans.length > 5) {
              await sendResponse(`ℹ️ Mostrando 5 de ${filteredPlans.length} plantas. Refine a busca para ver outras.`);
            }
            
            break;
          }

          // No filter - list all floor plans
          let message = `🗺️ *PLANTAS BAIXAS*\n\n`;
          
          for (const plan of plansData.slice(0, 15)) {
            const floor = plan.floors as any;
            const building = floor?.buildings as any;
            
            message += `• *${plan.name}*\n`;
            message += `  📍 ${building?.name || '-'} → ${floor?.name || '-'}\n\n`;
          }
          
          message += `💡 *Comandos disponíveis:*\n`;
          message += `• *planta [nome]* - Receber uma imagem\n`;
          message += `• *plantas [prédio]* - Todas de um prédio`;
          
          await sendResponse(message);
          break;
        }

        case 'planta': {
          // Send floor plan image
          const searchName = command.args.trim();
          
          if (!searchName) {
            await sendResponse(
              `🗺️ *Visualizar Planta*\n\n` +
              `Use: *planta [nome]*\n\n` +
              `Exemplo: *planta Itaqua*\n` +
              `Exemplo: *planta térreo*\n\n` +
              `💡 Digite *plantas* para ver a lista completa.`
            );
            break;
          }

          // Search for floor plan by name
          const { data: planData } = await supabase
            .from('floor_plans')
            .select(`
              id,
              name,
              file_url,
              file_type,
              is_active,
              floors (
                name,
                buildings (name)
              )
            `)
            .ilike('name', `%${searchName}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (!planData) {
            await sendResponse(
              `❌ Planta "${searchName}" não encontrada.\n\n` +
              `💡 Digite *plantas* para ver a lista disponível.`
            );
            break;
          }

          const floorPlan = planData.floors as any;
          const buildingPlan = floorPlan?.buildings as any;

          // Build caption
          const captionPlan = 
            `🗺️ *${planData.name}*\n\n` +
            `📍 ${buildingPlan?.name || '-'} → ${floorPlan?.name || '-'}`;

          // Determine MIME type from file_type
          let mimeTypePlan = 'image/png';
          if (planData.file_type === 'pdf') {
            mimeTypePlan = 'application/pdf';
          } else if (planData.file_type === 'jpg' || planData.file_type === 'jpeg') {
            mimeTypePlan = 'image/jpeg';
          } else if (planData.file_type === 'png') {
            mimeTypePlan = 'image/png';
          }

          console.log(`📤 Sending floor plan image: ${planData.name} (${mimeTypePlan})`);
          console.log(`📤 File URL: ${planData.file_url}`);

          // Send the image using the existing sendMediaMessage function
          const imageSent = await sendMediaMessage(
            planData.file_url,
            mimeTypePlan,
            planData.name,
            captionPlan
          );

          if (!imageSent) {
            await sendResponse(
              `⚠️ Não foi possível enviar a imagem automaticamente.\n\n` +
              `🔗 *Acesse diretamente:*\n${planData.file_url}\n\n` +
              `_Copie e cole o link no navegador_`
            );
          } else {
            console.log(`✅ Floor plan image sent: ${planData.name}`);
          }
          
          break;
        }

        case 'cameras': {
          // List IP cameras
          const { data: cameras } = await supabase
            .from('equipment')
            .select(`
              id, name, ip_address, manufacturer, model, equipment_status,
              racks (
                name,
                rooms (
                  name,
                  floors (
                    name,
                    buildings (name)
                  )
                )
              )
            `)
            .eq('type', 'ip_camera')
            .order('name')
            .limit(20);

          if (!cameras || cameras.length === 0) {
            await sendResponse('📷 Nenhuma câmera IP cadastrada.');
            break;
          }

          let camMessage = `📷 *CÂMERAS IP*\n\n`;
          
          for (const cam of cameras) {
            const status = cam.equipment_status === 'active' ? '🟢' : '🔴';
            const rack = cam.racks as any;
            const room = rack?.rooms as any;
            const floor = room?.floors as any;
            const building = floor?.buildings as any;
            
            camMessage += `${status} *${cam.name}*\n`;
            camMessage += `  🌐 ${cam.ip_address || '-'}\n`;
            camMessage += `  📍 ${building?.name || rack?.name || '-'}\n\n`;
          }
          
          camMessage += `💡 Para detalhes: *camera [nome]*`;
          await sendResponse(camMessage);
          break;
        }

        case 'camera': {
          // Show camera details
          const searchCam = command.args.trim();
          
          if (!searchCam) {
            await sendResponse(
              `📷 *Consultar Câmera*\n\n` +
              `Use: *camera [nome]*\n\n` +
              `Exemplo: *camera pátio*\n\n` +
              `💡 Digite *cameras* para ver a lista.`
            );
            break;
          }

          const { data: cam } = await supabase
            .from('equipment')
            .select(`
              id, name, ip_address, manufacturer, model, equipment_status,
              serial_number, hostname, notes, primary_mac_address,
              racks (
                name,
                rooms (
                  name,
                  floors (
                    name,
                    buildings (name)
                  )
                )
              )
            `)
            .eq('type', 'ip_camera')
            .ilike('name', `%${searchCam}%`)
            .limit(1)
            .maybeSingle();

          if (!cam) {
            await sendResponse(
              `❌ Câmera "${searchCam}" não encontrada.\n\n` +
              `💡 Digite *cameras* para ver a lista.`
            );
            break;
          }

          const rackCam = cam.racks as any;
          const roomCam = rackCam?.rooms as any;
          const floorCam = roomCam?.floors as any;
          const buildingCam = floorCam?.buildings as any;
          const statusCam = cam.equipment_status === 'active' ? '🟢 Online' : '🔴 Offline';

          let camDetail = `📷 *${cam.name}*\n\n`;
          camDetail += `📊 *Status:* ${statusCam}\n`;
          camDetail += `🌐 *IP:* ${cam.ip_address || '-'}\n`;
          if (cam.hostname) camDetail += `🖥️ *Hostname:* ${cam.hostname}\n`;
          camDetail += `🏭 *Fabricante:* ${cam.manufacturer || '-'}\n`;
          camDetail += `📦 *Modelo:* ${cam.model || '-'}\n`;
          if (cam.serial_number) camDetail += `🔢 *Serial:* ${cam.serial_number}\n`;
          if (cam.primary_mac_address) camDetail += `📟 *MAC:* ${cam.primary_mac_address}\n`;
          
          camDetail += `\n📍 *Localização:*\n`;
          if (buildingCam?.name) camDetail += `  🏢 ${buildingCam.name}\n`;
          if (floorCam?.name) camDetail += `  🏠 ${floorCam.name}\n`;
          if (roomCam?.name) camDetail += `  🚪 ${roomCam.name}\n`;
          if (rackCam?.name) camDetail += `  📦 ${rackCam.name}\n`;
          
          if (cam.notes) {
            camDetail += `\n📝 *Notas:* ${cam.notes}`;
          }

          await sendResponse(camDetail);
          break;
        }

        case 'equipamentos': {
          // List equipment summary
          const { data: equipStats } = await supabase
            .from('equipment')
            .select('type');

          if (!equipStats || equipStats.length === 0) {
            await sendResponse('📋 Nenhum equipamento cadastrado.');
            break;
          }

          // Count by type
          const typeCount: Record<string, number> = {};
          equipStats.forEach((eq: any) => {
            typeCount[eq.type] = (typeCount[eq.type] || 0) + 1;
          });

          const typeLabels: Record<string, string> = {
            switch: '🔌 Switch',
            switch_poe: '🔌 Switch PoE',
            router: '📡 Router',
            server: '🖥️ Servidor',
            patch_panel: '📋 Patch Panel',
            firewall: '🛡️ Firewall',
            storage: '💾 Storage',
            ups: '🔋 UPS',
            pdu: '⚡ PDU',
            nvr: '📹 NVR',
            ip_camera: '📷 Câmera IP',
            access_point: '📶 Access Point',
            other: '📦 Outros'
          };

          let message = `🖥️ *EQUIPAMENTOS*\n\n`;
          message += `📊 *Total:* ${equipStats.length} equipamentos\n\n`;
          message += `*Por Tipo:*\n`;
          
          const sortedTypes = Object.entries(typeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
          
          for (const [type, count] of sortedTypes) {
            const label = typeLabels[type] || `📦 ${type}`;
            message += `  ${label}: ${count}\n`;
          }
          
          if (Object.keys(typeCount).length > 10) {
            message += `  _... e mais ${Object.keys(typeCount).length - 10} tipos_\n`;
          }
          
          await sendResponse(message);
          break;
        }

        case 'nvrs': {
          // List all NVRs/DVRs
          const { data: nvrs } = await supabase
            .from('equipment')
            .select('id, name, ip_address, notes, equipment_status')
            .in('type', ['nvr', 'dvr'])
            .order('name')
            .limit(15);

          if (!nvrs || nvrs.length === 0) {
            await sendResponse('📹 Nenhum NVR/DVR cadastrado.');
            break;
          }

          let nvrMessage = `📹 *NVRs / DVRs*\n\n`;
          
          for (const nvr of nvrs) {
            let notes: any = {};
            try {
              notes = nvr.notes ? (typeof nvr.notes === 'string' ? JSON.parse(nvr.notes) : nvr.notes) : {};
            } catch { notes = {}; }
            
            const total = notes.totalChannels || 0;
            const used = notes.cameras?.length || 0;
            const status = nvr.equipment_status === 'active' ? '🟢' : '🔴';
            const usage = total > 0 ? Math.round((used / total) * 100) : 0;
            
            nvrMessage += `${status} *${nvr.name}*\n`;
            nvrMessage += `  🌐 ${nvr.ip_address || '-'}\n`;
            if (total > 0) {
              nvrMessage += `  📊 ${used}/${total} canais (${usage}%)\n`;
            }
            nvrMessage += `\n`;
          }
          
          nvrMessage += `💡 Para detalhes: *nvr [nome ou IP]*`;
          await sendResponse(nvrMessage);
          break;
        }

        case 'nvr': {
          // Show NVR details with connected cameras
          const searchNvr = command.args.trim();
          
          if (!searchNvr) {
            await sendResponse(
              `📹 *Consultar NVR*\n\n` +
              `Use: *nvr [nome ou IP]*\n\n` +
              `Exemplo: *nvr 10.3.30.10*\n\n` +
              `💡 Digite *nvrs* para ver a lista.`
            );
            break;
          }

          const { data: nvrData } = await supabase
            .from('equipment')
            .select(`
              id, name, ip_address, notes, equipment_status, hostname,
              manufacturer, model, serial_number,
              racks (
                name,
                rooms (
                  name,
                  floors (
                    name,
                    buildings (name)
                  )
                )
              )
            `)
            .in('type', ['nvr', 'dvr'])
            .or(`name.ilike.%${searchNvr}%,ip_address.ilike.%${searchNvr}%`)
            .limit(1)
            .maybeSingle();

          if (!nvrData) {
            await sendResponse(
              `❌ NVR "${searchNvr}" não encontrado.\n\n` +
              `💡 Digite *nvrs* para ver a lista.`
            );
            break;
          }

          let notes: any = {};
          try {
            notes = nvrData.notes ? (typeof nvrData.notes === 'string' ? JSON.parse(nvrData.notes) : nvrData.notes) : {};
          } catch { notes = {}; }
          
          const cameras = notes.cameras || [];
          const vacant = notes.vacantChannels || [];
          const totalChannels = notes.totalChannels || 0;
          const statusNvr = nvrData.equipment_status === 'active' ? '🟢 Online' : '🔴 Offline';
          
          const rackNvr = nvrData.racks as any;
          const roomNvr = rackNvr?.rooms as any;
          const floorNvr = roomNvr?.floors as any;
          const buildingNvr = floorNvr?.buildings as any;

          let nvrDetail = `📹 *${nvrData.name}*\n\n`;
          nvrDetail += `📊 *Status:* ${statusNvr}\n`;
          nvrDetail += `🌐 *IP:* ${nvrData.ip_address || '-'}\n`;
          if (nvrData.hostname) nvrDetail += `🖥️ *Hostname:* ${nvrData.hostname}\n`;
          if (nvrData.manufacturer) nvrDetail += `🏭 *Fabricante:* ${nvrData.manufacturer}\n`;
          if (nvrData.model) nvrDetail += `📦 *Modelo:* ${nvrData.model}\n`;
          
          if (totalChannels > 0) {
            nvrDetail += `\n📊 *Canais:* ${cameras.length}/${totalChannels} usados\n`;
            if (vacant.length > 0) {
              nvrDetail += `✅ *Livres:* ${vacant.slice(0, 10).join(', ')}${vacant.length > 10 ? '...' : ''}\n`;
            }
          }
          
          nvrDetail += `\n📍 *Localização:*\n`;
          if (buildingNvr?.name) nvrDetail += `  🏢 ${buildingNvr.name}\n`;
          if (floorNvr?.name) nvrDetail += `  🏠 ${floorNvr.name}\n`;
          if (roomNvr?.name) nvrDetail += `  🚪 ${roomNvr.name}\n`;
          if (rackNvr?.name) nvrDetail += `  📦 ${rackNvr.name}\n`;
          
          if (cameras.length > 0) {
            nvrDetail += `\n📷 *Câmeras Conectadas:*\n`;
            for (const cam of cameras.slice(0, 12)) {
              const chLabel = cam.channel ? `CH${cam.channel}` : '•';
              const location = cam.location || cam.name || '-';
              nvrDetail += `  ${chLabel}: ${location}\n`;
              if (cam.ip) {
                nvrDetail += `    └ ${cam.ip}${cam.model ? ` (${cam.model})` : ''}\n`;
              }
            }
            
            if (cameras.length > 12) {
              nvrDetail += `  _... e mais ${cameras.length - 12} câmeras_\n`;
            }
          }

          await sendResponse(nvrDetail);
          break;
        }

        case 'localizar': {
          // Universal equipment search
          const searchTerm = command.args.trim();
          
          if (!searchTerm) {
            await sendResponse(
              `🔍 *Localizar Equipamento*\n\n` +
              `Use: *localizar [nome, IP, serial]*\n\n` +
              `Exemplos:\n` +
              `• *localizar switch*\n` +
              `• *localizar 10.0.0.1*\n` +
              `• *localizar SN12345*`
            );
            break;
          }

          const { data: equipSearch } = await supabase
            .from('equipment')
            .select(`
              id, name, type, ip_address, hostname, serial_number, 
              manufacturer, model, equipment_status,
              racks (
                name,
                rooms (
                  name,
                  floors (name, buildings (name))
                )
              )
            `)
            .or(`name.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%,hostname.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`)
            .limit(5);

          if (!equipSearch || equipSearch.length === 0) {
            await sendResponse(`❌ Nenhum equipamento encontrado para "${searchTerm}".`);
            break;
          }

          const typeLabelsSearch: Record<string, string> = {
            switch: 'Switch',
            switch_poe: 'Switch PoE',
            router: 'Router',
            server: 'Servidor',
            patch_panel: 'Patch Panel',
            firewall: 'Firewall',
            storage: 'Storage',
            ups: 'UPS',
            pdu: 'PDU',
            nvr: 'NVR',
            dvr: 'DVR',
            ip_camera: 'Câmera IP',
            access_point: 'Access Point',
            other: 'Outros'
          };

          let searchMessage = `🔍 *Resultados para "${searchTerm}"*\n\n`;
          
          for (const eq of equipSearch) {
            const rack = eq.racks as any;
            const room = rack?.rooms as any;
            const floor = room?.floors as any;
            const building = floor?.buildings as any;
            const status = eq.equipment_status === 'active' ? '🟢' : '🔴';
            const typeLabel = typeLabelsSearch[eq.type] || eq.type;
            
            searchMessage += `${status} *${eq.name}*\n`;
            searchMessage += `  📋 Tipo: ${typeLabel}\n`;
            if (eq.ip_address) searchMessage += `  🌐 IP: ${eq.ip_address}\n`;
            if (eq.manufacturer) searchMessage += `  🏭 ${eq.manufacturer}${eq.model ? ` ${eq.model}` : ''}\n`;
            searchMessage += `  📍 ${building?.name || '-'} → ${floor?.name || '-'}\n`;
            searchMessage += `     ${room?.name || '-'} → ${rack?.name || '-'}\n\n`;
          }

          await sendResponse(searchMessage);
          break;
        }
      }

      // Save interaction after command processing
      if (command) {
        await saveInteraction(`Command ${command.command} processed`, 'success');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Command processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle unrecognized commands - send error message with menu options
    if (!command && !ticket && messageContent && messageContent.trim().length >= 2) {
      console.log('❓ Unrecognized command:', messageContent);
      
      const truncatedMessage = messageContent.length > 50 
        ? messageContent.substring(0, 50) + '...' 
        : messageContent;
      
      const errorMessage = 
        `❓ *Comando não reconhecido*\n\n` +
        `Não entendi: _"${truncatedMessage}"_\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💡 *Opções disponíveis:*\n\n` +
        `📋 Digite um número *1-8* para menu\n` +
        `🔤 Digite *menu* para ver opções\n` +
        `❓ Digite *ajuda* para comandos\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 *Dica:* Responda uma notificação\n` +
        `de chamado para adicionar comentário.`;
      
      await sendResponse(errorMessage);
      await saveInteraction(errorMessage, 'error');
      
      return new Response(
        JSON.stringify({ success: true, message: 'Unknown command handled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we found a ticket (from quote or mention), add the message as a comment
    if (ticket && (messageContent || hasMedia) && !command) {
      console.log('💬 Adding comment to ticket:', ticket.ticket_number);

      let attachments: any[] = [];
      let commentText = messageContent || '';

      // Process media if present
      if (hasMedia && settings) {
        console.log('📎 Processing media attachment...');
        
        const mediaAttachment = await downloadAndUploadMedia(
          supabase,
          settings,
          key,
          mediaType,
          mimeType,
          fileName,
          ticket.id
        );

        if (mediaAttachment) {
          attachments.push(mediaAttachment);
          
          // If no text, add a placeholder
          if (!commentText) {
            commentText = `[${getMediaTypeLabel(mediaType)} anexado]`;
          }
        }
      }

      const { error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticket.id,
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          comment: commentText,
          is_internal: false,
          source: 'whatsapp',
          whatsapp_sender_name: pushName,
          whatsapp_sender_phone: senderPhone,
          attachments: attachments.length > 0 ? attachments : null
        });

      if (commentError) {
        console.error('❌ Error adding comment:', commentError);
      } else {
        console.log('✅ Comment added successfully');
        
        // Save message mapping
        await supabase
          .from('whatsapp_message_mapping')
          .insert({
            ticket_id: ticket.id,
            message_id: messageId,
            group_id: groupId,
            phone_number: senderPhone,
            direction: 'inbound'
          });

        // Send confirmation
        if (hasMedia) {
          await sendResponse(`✅ ${getMediaTypeLabel(mediaType)} registrado no chamado *${ticket.ticket_number}*.`);
        } else {
          await sendResponse(`✅ Resposta registrada no chamado *${ticket.ticket_number}*.`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
