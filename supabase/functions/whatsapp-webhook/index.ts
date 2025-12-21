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
  
  // Check for status command
  if (lowerText.startsWith('status ')) {
    return { command: 'status', args: lowerText.replace('status ', '').trim() };
  }
  
  // Check for details command
  if (lowerText.startsWith('detalhes ') || lowerText.startsWith('ver ')) {
    const args = lowerText.replace(/^(detalhes|ver)\s+/, '').trim();
    return { command: 'details', args };
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
    const argsText = lowerText.replace('comentar ', '').trim();
    return { command: 'comment', args: text.substring(text.toLowerCase().indexOf('comentar ') + 9).trim() };
  }
  
  // Check for assign command (técnico se atribui ao chamado)
  if (lowerText.startsWith('atribuir ') || lowerText.startsWith('assumir ')) {
    const args = lowerText.replace(/^(atribuir|assumir)\s+/, '').trim();
    return { command: 'assign', args };
  }
  
  // Check for new ticket command
  if (lowerText.startsWith('novo:') || lowerText.startsWith('novo ')) {
    return { command: 'novo', args: text.replace(/^novo[:\s]/i, '').trim() };
  }
  
  // Check for list command
  if (lowerText === 'meus chamados' || lowerText === 'meus tickets') {
    return { command: 'list', args: '' };
  }
  
  // Check for help command
  if (lowerText === 'ajuda' || lowerText === 'help' || lowerText === '/help') {
    return { command: 'help', args: '' };
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
    
    // Extract phone number from jid
    const senderPhone = fromMe ? '' : remoteJid.split('@')[0];
    const isGroup = remoteJid.includes('@g.us');
    const groupId = isGroup ? remoteJid : null;

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

    // Check for bot commands
    const command = extractCommand(messageContent);

    if (command) {
      console.log('🤖 Bot command detected:', command);

      switch (command.command) {
        case 'help': {
          const helpMessage = `🤖 *Comandos Disponíveis*\n\n` +
            `📊 *Consultas*\n` +
            `• *status 00001* - Ver status\n` +
            `• *detalhes 00001* - Ver detalhes completos\n` +
            `• *meus chamados* - Listar seus chamados\n\n` +
            `➕ *Criar/Gerenciar*\n` +
            `• *novo: [título]* - Criar chamado\n` +
            `• *comentar 00001 [texto]* - Adicionar comentário\n` +
            `• *atribuir 00001* - Assumir chamado (técnicos)\n` +
            `• *encerrar 00001* - Fechar chamado\n` +
            `• *reabrir 00001* - Reabrir chamado\n` +
            `• *prioridade 00001 alta* - Alterar prioridade\n\n` +
            `📋 *Prioridades:* baixa, média, alta, crítica\n\n` +
            `💡 _Responda a uma notificação ou mencione #TKT-XXXX-XXXXX para comentar_\n\n` +
            `❓ *ajuda* - Mostrar este menu`;
          
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
          
          if (comments && comments.length > 0) {
            detailsMessage += `\n💬 *Últimos Comentários:*\n`;
            comments.reverse().forEach((c, i) => {
              const author = c.whatsapp_sender_name || 'Sistema';
              const date = new Date(c.created_at!).toLocaleString('pt-BR');
              const text = c.comment.length > 50 ? c.comment.substring(0, 50) + '...' : c.comment;
              detailsMessage += `\n${i + 1}. _${author}_ (${date}):\n   ${text}\n`;
            });
          } else {
            detailsMessage += `\n💬 _Nenhum comentário ainda._`;
          }
          
          await sendResponse(detailsMessage);
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
          const { allowed, isOwner, role } = await checkTicketPermission(supabase, closeTicket, senderPhone);
          
          if (!allowed) {
            await sendResponse(
              `⛔ *Você não tem permissão para encerrar este chamado.*\n\n` +
              `👤 Apenas o criador do chamado ou administradores/técnicos cadastrados podem encerrá-lo.\n\n` +
              `💡 Se você é um técnico, peça ao administrador para cadastrar seu número de telefone no sistema.`
            );
            break;
          }

          if (closeTicket.status === 'closed') {
            await sendResponse(`⚠️ Este chamado já está fechado.`);
            break;
          }

          // Close the ticket
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
              status: 'closed',
              closed_at: new Date().toISOString()
            })
            .eq('id', closeTicket.id);

          if (updateError) {
            console.error('❌ Error closing ticket:', updateError);
            await sendResponse(`❌ Erro ao encerrar chamado. Tente novamente.`);
            break;
          }

          // Add system comment
          await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: closeTicket.id,
              user_id: '00000000-0000-0000-0000-000000000000',
              comment: `Chamado encerrado via WhatsApp por ${pushName}`,
              is_internal: false,
              source: 'whatsapp',
              whatsapp_sender_name: pushName,
              whatsapp_sender_phone: senderPhone
            });

          // Calculate duration
          const createdAt = new Date(closeTicket.created_at!);
          const closedAt = new Date();
          const durationMs = closedAt.getTime() - createdAt.getTime();
          const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
          const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          let durationText = '';
          if (durationDays > 0) {
            durationText = `${durationDays} dia(s) e ${durationHours} hora(s)`;
          } else {
            durationText = `${durationHours} hora(s)`;
          }

          await sendResponse(
            `✅ *Chamado ${ticketNum} Encerrado*\n\n` +
            `📋 ${closeTicket.title}\n` +
            `⏱️ Tempo total: ${durationText}\n\n` +
            `Obrigado por usar nosso sistema de suporte!`
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
          if (!command.args) {
            await sendResponse('⚠️ Por favor, informe o título do chamado.\nExemplo: *novo: Problema com internet*');
            break;
          }

          // Create new ticket
          const { data: newTicket, error: createError } = await supabase
            .from('support_tickets')
            .insert({
              title: command.args,
              description: `Chamado aberto via WhatsApp por ${pushName}`,
              category: 'other',
              priority: 'medium',
              status: 'open',
              contact_phone: senderPhone || null,
              created_by: '00000000-0000-0000-0000-000000000000' // System user
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

            // Save message mapping
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

        case 'list': {
          // List open tickets for this phone number
          const { data: userTickets } = await supabase
            .from('support_tickets')
            .select('*')
            .or(`contact_phone.ilike.%${formatPhoneForQuery(senderPhone)}%`)
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(10);

          if (!userTickets || userTickets.length === 0) {
            await sendResponse('📭 Você não possui chamados abertos no momento.');
          } else {
            let listMessage = `📋 *Seus Chamados Abertos*\n\n`;
            userTickets.forEach((t, i) => {
              listMessage += `${i + 1}. *${t.ticket_number}*\n`;
              listMessage += `   📝 ${t.title}\n`;
              listMessage += `   ${getStatusEmoji(t.status)} ${getStatusLabel(t.status)} | ${getPriorityEmoji(t.priority)} ${getPriorityLabel(t.priority)}\n\n`;
            });
            listMessage += `\n💡 Use *detalhes ${userTickets[0].ticket_number.split('-')[2]}* para ver mais.`;
            
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
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Command processed' }),
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
