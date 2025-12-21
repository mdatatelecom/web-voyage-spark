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
            `📋 *#TKT-XXXX-XXXXX* - Ver status de um chamado\n` +
            `📋 *status XXXXX* - Ver status de um chamado\n` +
            `➕ *novo: [título]* - Criar novo chamado\n` +
            `📝 *meus chamados* - Listar seus chamados abertos\n` +
            `❓ *ajuda* - Mostrar esta mensagem\n\n` +
            `💡 *Dica:* Responda a uma notificação de chamado para adicionar um comentário!\n` +
            `📎 Você também pode enviar imagens e documentos como anexos.`;
          
          await sendResponse(helpMessage);
          break;
        }

        case 'status': {
          // Try to find ticket by number
          const searchNumber = command.args.replace(/\D/g, '').padStart(5, '0');
          const year = new Date().getFullYear();
          const fullTicketNumber = `TKT-${year}-${searchNumber}`;
          
          const { data: statusTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('ticket_number', fullTicketNumber)
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
            await sendResponse(`❌ Chamado ${fullTicketNumber} não encontrado.`);
          }
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
              `Acompanhe seu chamado pelo número acima.`;
            
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
              listMessage += `   ${getStatusEmoji(t.status)} ${getStatusLabel(t.status)}\n\n`;
            });
            listMessage += `\n💡 Use *#${userTickets[0].ticket_number}* para ver detalhes.`;
            
            await sendResponse(listMessage);
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