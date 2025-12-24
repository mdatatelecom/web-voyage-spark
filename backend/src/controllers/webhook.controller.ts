import { Request, Response } from 'express';
import { pool } from '../config/database';
import { whatsAppService, formatPhoneNumber } from '../services/whatsapp.service';
import fs from 'fs';
import path from 'path';

// ============================================
// CONSTANTES E HELPERS
// ============================================

const TICKET_CATEGORIES = [
  { key: 'network', label: 'Rede/Conectividade' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'software', label: 'Software' },
  { key: 'access', label: 'Acesso/Permissões' },
  { key: 'infrastructure', label: 'Infraestrutura' },
  { key: 'security', label: 'Segurança' },
  { key: 'other', label: 'Outros' },
];

const PRIORITIES = [
  { key: 'low', label: 'Baixa', emoji: '🟢' },
  { key: 'medium', label: 'Média', emoji: '🟡' },
  { key: 'high', label: 'Alta', emoji: '🟠' },
  { key: 'critical', label: 'Crítica', emoji: '🔴' },
];

const STATUSES = [
  { key: 'open', label: 'Aberto', emoji: '📋' },
  { key: 'in_progress', label: 'Em Andamento', emoji: '🔧' },
  { key: 'resolved', label: 'Resolvido', emoji: '✅' },
  { key: 'closed', label: 'Fechado', emoji: '🔒' },
];

function getPriorityEmoji(priority: string): string {
  return PRIORITIES.find(p => p.key === priority)?.emoji || '⚪';
}

function getPriorityLabel(priority: string): string {
  return PRIORITIES.find(p => p.key === priority)?.label || priority;
}

function getStatusEmoji(status: string): string {
  return STATUSES.find(s => s.key === status)?.emoji || '❓';
}

function getStatusLabel(status: string): string {
  return STATUSES.find(s => s.key === status)?.label || status;
}

function getCategoryLabel(category: string): string {
  return TICKET_CATEGORIES.find(c => c.key === category)?.label || category;
}

function getMediaTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    image: '📷 Imagem',
    document: '📄 Documento',
    audio: '🎵 Áudio',
    video: '🎬 Vídeo',
    sticker: '🎨 Sticker',
  };
  return labels[type] || '📎 Arquivo';
}

function extractTicketNumber(text: string): string | null {
  const patterns = [
    /TKT-\d{4}-\d{5}/i,
    /#?(\d{5})/,
    /chamado\s*#?\s*(\d+)/i,
    /ticket\s*#?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].toUpperCase().startsWith('TKT-')) {
        return match[0].toUpperCase();
      }
      return match[1];
    }
  }
  return null;
}

function formatPhoneForQuery(phone: string): string[] {
  const cleaned = phone.replace(/\D/g, '');
  const variants: string[] = [cleaned];

  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    variants.push(cleaned.substring(2));
  }
  if (!cleaned.startsWith('55')) {
    variants.push('55' + cleaned);
  }

  // With/without 9th digit
  for (const v of [...variants]) {
    if (v.length === 11 && v[2] === '9') {
      variants.push(v.substring(0, 2) + v.substring(3));
    }
    if (v.length === 10) {
      variants.push(v.substring(0, 2) + '9' + v.substring(2));
    }
    if (v.length === 13 && v[4] === '9') {
      variants.push(v.substring(0, 4) + v.substring(5));
    }
    if (v.length === 12 && v.startsWith('55')) {
      variants.push(v.substring(0, 4) + '9' + v.substring(4));
    }
  }

  return [...new Set(variants)];
}

function parseTicketNumberFromArgs(args: string): { ticketNumber: string | null; rest: string } {
  const trimmed = args.trim();
  const match = trimmed.match(/^(TKT-\d{4}-\d{5}|\d{5})\s*(.*)/i);
  if (match) {
    return { ticketNumber: match[1].toUpperCase(), rest: match[2].trim() };
  }
  return { ticketNumber: null, rest: trimmed };
}

function parsePriority(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (['1', 'baixa', 'low'].includes(lower)) return 'low';
  if (['2', 'media', 'média', 'medium'].includes(lower)) return 'medium';
  if (['3', 'alta', 'high'].includes(lower)) return 'high';
  if (['4', 'critica', 'crítica', 'critical', 'urgente'].includes(lower)) return 'critical';
  return null;
}

interface ExtractedCommand {
  command: string;
  args: string;
}

function extractCommand(text: string): ExtractedCommand | null {
  const trimmed = text.trim().toLowerCase();
  
  const commands = [
    'ajuda', 'help', '?',
    'status',
    'detalhes', 'detalhe', 'ver',
    'iniciar', 'atender',
    'resolver', 'resolvido',
    'encerrar', 'fechar',
    'reabrir',
    'prioridade',
    'comentar', 'comentário', 'comentario',
    'atribuir',
    'transferir',
    'cancelar',
    'novo', 'criar chamado', 'abrir chamado',
    'disponiveis', 'disponíveis',
    'meus chamados', 'meus tickets',
    'todos chamados', 'todos tickets',
    'minhas estatisticas', 'minhas estatísticas', 'minha performance',
    'meus resolvidos',
    'anexar',
  ];

  for (const cmd of commands) {
    if (trimmed === cmd || trimmed.startsWith(cmd + ' ') || trimmed.startsWith(cmd + ':')) {
      const separator = trimmed.startsWith(cmd + ':') ? ':' : ' ';
      const args = text.substring(cmd.length).replace(/^[:\s]+/, '').trim();
      return { command: cmd.replace(/\s+/g, '_'), args };
    }
  }

  return null;
}

// ============================================
// WIZARD SESSION MANAGEMENT
// ============================================

interface WizardSession {
  state: string;
  data: Record<string, any>;
}

async function getSession(phone: string): Promise<WizardSession | null> {
  const result = await pool.query(
    `SELECT state, data FROM whatsapp_sessions WHERE phone = $1`,
    [phone]
  );
  if (result.rows.length > 0) {
    return { state: result.rows[0].state, data: result.rows[0].data || {} };
  }
  return null;
}

async function setSession(phone: string, state: string, data: Record<string, any>): Promise<void> {
  await pool.query(
    `INSERT INTO whatsapp_sessions (phone, state, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (phone) DO UPDATE SET state = $2, data = $3, updated_at = NOW()`,
    [phone, state, data]
  );
}

async function clearSession(phone: string): Promise<void> {
  await pool.query(`DELETE FROM whatsapp_sessions WHERE phone = $1`, [phone]);
}

// ============================================
// TICKET OPERATIONS
// ============================================

async function findTicketByNumber(ticketNumber: string): Promise<any | null> {
  let query = `SELECT * FROM support_tickets WHERE `;
  let param = ticketNumber;

  if (ticketNumber.toUpperCase().startsWith('TKT-')) {
    query += `ticket_number = $1`;
  } else {
    query += `ticket_number LIKE '%' || $1`;
  }

  const result = await pool.query(query, [param]);
  return result.rows[0] || null;
}

async function findUserByPhone(phone: string): Promise<any | null> {
  const variants = formatPhoneForQuery(phone);
  const placeholders = variants.map((_, i) => `$${i + 1}`).join(', ');

  const result = await pool.query(
    `SELECT u.id, u.email, p.full_name, p.phone 
     FROM users u 
     JOIN profiles p ON p.id = u.id 
     WHERE p.phone IN (${placeholders})`,
    variants
  );

  return result.rows[0] || null;
}

async function getUserRole(userId: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT role FROM user_roles WHERE user_id = $1 ORDER BY 
     CASE role WHEN 'admin' THEN 1 WHEN 'technician' THEN 2 ELSE 3 END LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.role || null;
}

async function checkTicketPermission(ticket: any, senderPhone: string): Promise<{ allowed: boolean; reason?: string; user?: any }> {
  const user = await findUserByPhone(senderPhone);
  
  if (!user) {
    return { allowed: false, reason: 'Usuário não cadastrado no sistema.' };
  }

  const role = await getUserRole(user.id);

  if (role === 'admin' || role === 'technician') {
    return { allowed: true, user };
  }

  // Check if user is creator or contact
  const userPhoneVariants = formatPhoneForQuery(senderPhone);
  const ticketContactVariants = ticket.contact_phone ? formatPhoneForQuery(ticket.contact_phone) : [];

  const isCreator = ticket.created_by === user.id;
  const isContact = userPhoneVariants.some(v => ticketContactVariants.includes(v));

  if (isCreator || isContact) {
    return { allowed: true, user };
  }

  return { allowed: false, reason: 'Você não tem permissão para acessar este chamado.' };
}

// ============================================
// MEDIA HANDLING
// ============================================

async function downloadAndUploadMedia(
  messageKey: any,
  mediaType: string,
  ticketId: string
): Promise<{ url: string; filename: string } | null> {
  try {
    const settings = await whatsAppService.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      console.error('WhatsApp settings incomplete for media download');
      return null;
    }

    const apiUrl = settings.evolutionApiUrl.replace(/\/$/, '');
    const response = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${settings.evolutionInstance}`, {
      method: 'POST',
      headers: {
        'apikey': settings.evolutionApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { key: messageKey } }),
    });

    if (!response.ok) {
      console.error('Failed to download media:', response.status);
      return null;
    }

    const data = await response.json();
    const base64 = data.base64;
    const mimetype = data.mimetype || 'application/octet-stream';

    if (!base64) {
      console.error('No base64 data in response');
      return null;
    }

    // Determine extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'video/mp4': 'mp4',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    const ext = extMap[mimetype] || 'bin';
    const filename = `${ticketId}_${Date.now()}.${ext}`;

    // Save to local storage
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets', ticketId);
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/tickets/${ticketId}/${filename}`;
    return { url, filename };
  } catch (error) {
    console.error('Error downloading media:', error);
    return null;
  }
}

// ============================================
// MESSAGE SENDING HELPERS
// ============================================

async function sendReply(target: string, message: string, isGroup: boolean = false): Promise<void> {
  if (isGroup) {
    await whatsAppService.sendToGroup(target, message);
  } else {
    await whatsAppService.sendMessage(target, message);
  }
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function handleHelp(senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  const isTechnician = role === 'admin' || role === 'technician';

  let message = `📚 *COMANDOS DISPONÍVEIS*\n\n`;

  message += `*Consulta:*\n`;
  message += `• status [número] - Ver status\n`;
  message += `• detalhes [número] - Ver detalhes completos\n\n`;

  message += `*Criação:*\n`;
  message += `• novo - Criar chamado (wizard)\n`;
  message += `• novo: [título] - Criar rápido\n\n`;

  if (isTechnician) {
    message += `*Técnico:*\n`;
    message += `• iniciar [número] - Iniciar atendimento\n`;
    message += `• resolver [número] - Marcar resolvido\n`;
    message += `• encerrar [número] - Fechar chamado\n`;
    message += `• reabrir [número] - Reabrir\n`;
    message += `• prioridade [número] [1-4] - Alterar\n`;
    message += `• comentar [número] [texto] - Comentar\n`;
    message += `• atribuir [número] - Se atribuir\n`;
    message += `• transferir [número] [tel] - Transferir\n`;
    message += `• cancelar [número] - Cancelar atribuição\n`;
    message += `• anexar [número] - Anexar mídia\n\n`;

    message += `*Listagem:*\n`;
    message += `• disponiveis - Sem atribuição\n`;
    message += `• meus chamados - Meus tickets\n`;
    message += `• minhas estatisticas - Performance\n`;
  }

  message += `\n💡 *Dica:* Envie uma imagem/documento para anexar a um chamado.`;

  await sendReply(target, message, isGroup);
}

async function handleStatus(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const { ticketNumber } = parseTicketNumberFromArgs(args);
  
  if (!ticketNumber) {
    await sendReply(target, '❌ Por favor, informe o número do chamado.\nExemplo: status 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  const message = `📋 *CHAMADO ${ticket.ticket_number}*\n\n` +
    `${getStatusEmoji(ticket.status)} Status: *${getStatusLabel(ticket.status)}*\n` +
    `${getPriorityEmoji(ticket.priority)} Prioridade: ${getPriorityLabel(ticket.priority)}\n` +
    `📁 Categoria: ${getCategoryLabel(ticket.category)}\n` +
    `📅 Criado: ${new Date(ticket.created_at).toLocaleDateString('pt-BR')}\n\n` +
    `📝 *${ticket.title}*\n\n` +
    `Digite *detalhes ${ticket.ticket_number}* para mais informações.`;

  await sendReply(target, message, isGroup);
}

async function handleDetails(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const { ticketNumber } = parseTicketNumberFromArgs(args);
  
  if (!ticketNumber) {
    await sendReply(target, '❌ Por favor, informe o número do chamado.\nExemplo: detalhes 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  // Get assignee name
  let assigneeName = 'Não atribuído';
  if (ticket.assigned_to) {
    const assigneeResult = await pool.query(
      `SELECT full_name FROM profiles WHERE id = $1`,
      [ticket.assigned_to]
    );
    assigneeName = assigneeResult.rows[0]?.full_name || 'Desconhecido';
  }

  // Get creator name
  const creatorResult = await pool.query(
    `SELECT full_name FROM profiles WHERE id = $1`,
    [ticket.created_by]
  );
  const creatorName = creatorResult.rows[0]?.full_name || 'Desconhecido';

  // Get comments count
  const commentsResult = await pool.query(
    `SELECT COUNT(*) as count FROM ticket_comments WHERE ticket_id = $1`,
    [ticket.id]
  );
  const commentsCount = commentsResult.rows[0]?.count || 0;

  let message = `📋 *DETALHES DO CHAMADO*\n\n`;
  message += `🔢 *Número:* ${ticket.ticket_number}\n`;
  message += `📝 *Título:* ${ticket.title}\n\n`;
  message += `📄 *Descrição:*\n${ticket.description}\n\n`;
  message += `${getStatusEmoji(ticket.status)} *Status:* ${getStatusLabel(ticket.status)}\n`;
  message += `${getPriorityEmoji(ticket.priority)} *Prioridade:* ${getPriorityLabel(ticket.priority)}\n`;
  message += `📁 *Categoria:* ${getCategoryLabel(ticket.category)}\n\n`;
  message += `👤 *Criado por:* ${creatorName}\n`;
  message += `🔧 *Atribuído a:* ${assigneeName}\n`;
  message += `📅 *Criado em:* ${new Date(ticket.created_at).toLocaleString('pt-BR')}\n`;
  
  if (ticket.resolved_at) {
    message += `✅ *Resolvido em:* ${new Date(ticket.resolved_at).toLocaleString('pt-BR')}\n`;
  }
  if (ticket.closed_at) {
    message += `🔒 *Fechado em:* ${new Date(ticket.closed_at).toLocaleString('pt-BR')}\n`;
  }

  message += `\n💬 *Comentários:* ${commentsCount}`;

  // Check for attachments
  const attachments = ticket.attachments || [];
  if (attachments.length > 0) {
    message += `\n📎 *Anexos:* ${attachments.length}`;
  }

  await sendReply(target, message, isGroup);
}

async function handleStart(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado.', isGroup);
    return;
  }

  const role = await getUserRole(user.id);
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem iniciar chamados.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: iniciar 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  if (ticket.status === 'closed') {
    await sendReply(target, '❌ Este chamado está fechado.', isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET status = 'in_progress', assigned_to = $1, updated_at = NOW() WHERE id = $2`,
    [user.id, ticket.id]
  );

  await sendReply(target, `✅ Chamado *${ticket.ticket_number}* iniciado!\n\n🔧 Status: Em Andamento\n👤 Atribuído a: ${user.full_name}`, isGroup);
}

async function handleResolve(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: resolver 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  // Set confirmation state
  await setSession(senderPhone, 'confirm_resolve', { ticketId: ticket.id, ticketNumber: ticket.ticket_number });
  await sendReply(target, `⚠️ Confirma resolver o chamado *${ticket.ticket_number}*?\n\nResponda *sim* ou *não*.`, isGroup);
}

async function handleClose(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: encerrar 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  await setSession(senderPhone, 'confirm_close', { ticketId: ticket.id, ticketNumber: ticket.ticket_number });
  await sendReply(target, `⚠️ Confirma encerrar o chamado *${ticket.ticket_number}*?\n\nResponda *sim* ou *não*.`, isGroup);
}

async function handleReopen(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem reabrir chamados.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: reabrir 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
    await sendReply(target, '❌ Apenas chamados resolvidos ou fechados podem ser reabertos.', isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET status = 'open', resolved_at = NULL, closed_at = NULL, updated_at = NOW() WHERE id = $1`,
    [ticket.id]
  );

  await sendReply(target, `✅ Chamado *${ticket.ticket_number}* reaberto!\n\n📋 Status: Aberto`, isGroup);
}

async function handlePriority(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem alterar prioridade.', isGroup);
    return;
  }

  const { ticketNumber, rest } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número e a prioridade.\nExemplo: prioridade 12345 alta', isGroup);
    return;
  }

  const priority = parsePriority(rest);
  if (!priority) {
    await sendReply(target, '❌ Prioridade inválida.\nUse: baixa, media, alta ou critica', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET priority = $1, updated_at = NOW() WHERE id = $2`,
    [priority, ticket.id]
  );

  await sendReply(target, `✅ Prioridade do chamado *${ticket.ticket_number}* alterada!\n\n${getPriorityEmoji(priority)} Nova prioridade: ${getPriorityLabel(priority)}`, isGroup);
}

async function handleComment(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado.', isGroup);
    return;
  }

  const { ticketNumber, rest } = parseTicketNumberFromArgs(args);
  if (!ticketNumber || !rest) {
    await sendReply(target, '❌ Informe o número e o comentário.\nExemplo: comentar 12345 Aguardando peça', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  await pool.query(
    `INSERT INTO ticket_comments (ticket_id, user_id, comment, source, whatsapp_sender_phone) VALUES ($1, $2, $3, 'whatsapp', $4)`,
    [ticket.id, user.id, rest, senderPhone]
  );

  await pool.query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [ticket.id]);

  await sendReply(target, `✅ Comentário adicionado ao chamado *${ticket.ticket_number}*!`, isGroup);
}

async function handleAssign(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem se atribuir a chamados.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: atribuir 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET assigned_to = $1, technician_phone = $2, updated_at = NOW() WHERE id = $3`,
    [user!.id, senderPhone, ticket.id]
  );

  await sendReply(target, `✅ Chamado *${ticket.ticket_number}* atribuído a você!\n\n👤 Técnico: ${user!.full_name}`, isGroup);
}

async function handleTransfer(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem transferir chamados.', isGroup);
    return;
  }

  const { ticketNumber, rest } = parseTicketNumberFromArgs(args);
  if (!ticketNumber || !rest) {
    await sendReply(target, '❌ Informe o número e o telefone.\nExemplo: transferir 12345 11999998888', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const newTechnician = await findUserByPhone(rest);
  if (!newTechnician) {
    await sendReply(target, `❌ Técnico com telefone ${rest} não encontrado.`, isGroup);
    return;
  }

  const newRole = await getUserRole(newTechnician.id);
  if (newRole !== 'admin' && newRole !== 'technician') {
    await sendReply(target, '❌ O usuário informado não é um técnico.', isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET assigned_to = $1, technician_phone = $2, updated_at = NOW() WHERE id = $3`,
    [newTechnician.id, rest, ticket.id]
  );

  await sendReply(target, `✅ Chamado *${ticket.ticket_number}* transferido!\n\n👤 Novo técnico: ${newTechnician.full_name}`, isGroup);
}

async function handleCancel(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Apenas técnicos podem cancelar atribuição.', isGroup);
    return;
  }

  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: cancelar 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  await pool.query(
    `UPDATE support_tickets SET assigned_to = NULL, technician_phone = NULL, status = 'open', updated_at = NOW() WHERE id = $1`,
    [ticket.id]
  );

  await sendReply(target, `✅ Atribuição do chamado *${ticket.ticket_number}* cancelada!\n\n📋 Status: Aberto`, isGroup);
}

async function handleNew(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado no sistema.', isGroup);
    return;
  }

  // Quick create with title
  if (args.length > 5) {
    await setSession(senderPhone, 'wizard_descricao', {
      category: 'other',
      title: args,
      userId: user.id,
      userName: user.full_name,
    });
    await sendReply(target, `📝 *Criando chamado:* ${args}\n\nAgora descreva o problema em detalhes (mínimo 10 caracteres):`, isGroup);
    return;
  }

  // Start wizard
  await setSession(senderPhone, 'wizard_categoria', { userId: user.id, userName: user.full_name });

  let message = `📋 *CRIAR NOVO CHAMADO*\n\nEscolha a categoria:\n\n`;
  TICKET_CATEGORIES.forEach((cat, i) => {
    message += `${i + 1}. ${cat.label}\n`;
  });
  message += `\nDigite o número da categoria (1-7):`;

  await sendReply(target, message, isGroup);
}

async function handleAvailable(senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Comando disponível apenas para técnicos.', isGroup);
    return;
  }

  const result = await pool.query(
    `SELECT ticket_number, title, priority, category, created_at 
     FROM support_tickets 
     WHERE assigned_to IS NULL AND status IN ('open', 'in_progress') 
     ORDER BY 
       CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at
     LIMIT 10`
  );

  if (result.rows.length === 0) {
    await sendReply(target, '✅ Nenhum chamado disponível no momento.', isGroup);
    return;
  }

  let message = `📋 *CHAMADOS DISPONÍVEIS*\n\n`;
  result.rows.forEach(ticket => {
    message += `${getPriorityEmoji(ticket.priority)} *${ticket.ticket_number}*\n`;
    message += `${ticket.title.substring(0, 50)}${ticket.title.length > 50 ? '...' : ''}\n`;
    message += `📁 ${getCategoryLabel(ticket.category)}\n\n`;
  });
  message += `\nUse *atribuir [número]* para assumir.`;

  await sendReply(target, message, isGroup);
}

async function handleMyTickets(senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  if (!user) {
    await sendReply(target, '❌ Usuário não cadastrado.', isGroup);
    return;
  }

  const result = await pool.query(
    `SELECT ticket_number, title, status, priority, created_at 
     FROM support_tickets 
     WHERE (assigned_to = $1 OR created_by = $1) AND status NOT IN ('closed') 
     ORDER BY 
       CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT 10`,
    [user.id]
  );

  if (result.rows.length === 0) {
    await sendReply(target, '📋 Você não tem chamados ativos.', isGroup);
    return;
  }

  let message = `📋 *MEUS CHAMADOS*\n\n`;
  result.rows.forEach(ticket => {
    message += `${getStatusEmoji(ticket.status)} ${getPriorityEmoji(ticket.priority)} *${ticket.ticket_number}*\n`;
    message += `${ticket.title.substring(0, 40)}${ticket.title.length > 40 ? '...' : ''}\n\n`;
  });

  await sendReply(target, message, isGroup);
}

async function handleMyStats(senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const user = await findUserByPhone(senderPhone);
  const role = user ? await getUserRole(user.id) : null;
  
  if (role !== 'admin' && role !== 'technician') {
    await sendReply(target, '❌ Comando disponível apenas para técnicos.', isGroup);
    return;
  }

  const stats = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
       COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
       COUNT(*) FILTER (WHERE status = 'closed') as closed,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND status IN ('resolved', 'closed')) as resolved_30d
     FROM support_tickets WHERE assigned_to = $1`,
    [user!.id]
  );

  const s = stats.rows[0];

  let message = `📊 *MINHAS ESTATÍSTICAS*\n\n`;
  message += `👤 *${user!.full_name}*\n\n`;
  message += `🔧 Em andamento: ${s.in_progress || 0}\n`;
  message += `✅ Resolvidos: ${s.resolved || 0}\n`;
  message += `🔒 Fechados: ${s.closed || 0}\n\n`;
  message += `📅 Últimos 30 dias: ${s.resolved_30d || 0} concluídos`;

  await sendReply(target, message, isGroup);
}

async function handleAttach(args: string, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const { ticketNumber } = parseTicketNumberFromArgs(args);
  if (!ticketNumber) {
    await sendReply(target, '❌ Informe o número do chamado.\nExemplo: anexar 12345', isGroup);
    return;
  }

  const ticket = await findTicketByNumber(ticketNumber);
  if (!ticket) {
    await sendReply(target, `❌ Chamado ${ticketNumber} não encontrado.`, isGroup);
    return;
  }

  const permission = await checkTicketPermission(ticket, senderPhone);
  if (!permission.allowed) {
    await sendReply(target, `❌ ${permission.reason}`, isGroup);
    return;
  }

  await setSession(senderPhone, 'awaiting_attach_ticket', { ticketId: ticket.id, ticketNumber: ticket.ticket_number });
  await sendReply(target, `📎 Envie a imagem ou documento que deseja anexar ao chamado *${ticket.ticket_number}*.`, isGroup);
}

// ============================================
// WIZARD HANDLERS
// ============================================

async function handleWizardCategoria(text: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const num = parseInt(text.trim());
  if (isNaN(num) || num < 1 || num > TICKET_CATEGORIES.length) {
    await sendReply(target, '❌ Opção inválida. Digite um número de 1 a 7:', isGroup);
    return;
  }

  const category = TICKET_CATEGORIES[num - 1];
  await setSession(senderPhone, 'wizard_titulo', { ...session.data, category: category.key });
  await sendReply(target, `📁 Categoria: *${category.label}*\n\nAgora digite o *título* do chamado (resumo curto):`, isGroup);
}

async function handleWizardTitulo(text: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  if (text.trim().length < 5) {
    await sendReply(target, '❌ O título deve ter pelo menos 5 caracteres. Tente novamente:', isGroup);
    return;
  }

  await setSession(senderPhone, 'wizard_descricao', { ...session.data, title: text.trim() });
  await sendReply(target, `📝 Título: *${text.trim()}*\n\nAgora *descreva* o problema em detalhes (mínimo 10 caracteres):`, isGroup);
}

async function handleWizardDescricao(text: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  if (text.trim().length < 10) {
    await sendReply(target, '❌ A descrição deve ter pelo menos 10 caracteres. Tente novamente:', isGroup);
    return;
  }

  // Create ticket
  const result = await pool.query(
    `INSERT INTO support_tickets (title, description, category, priority, status, created_by, contact_phone)
     VALUES ($1, $2, $3, 'medium', 'open', $4, $5)
     RETURNING id, ticket_number`,
    [session.data.title, text.trim(), session.data.category, session.data.userId, senderPhone]
  );

  const ticket = result.rows[0];
  await clearSession(senderPhone);

  let message = `✅ *CHAMADO CRIADO COM SUCESSO!*\n\n`;
  message += `🔢 Número: *${ticket.ticket_number}*\n`;
  message += `📝 ${session.data.title}\n`;
  message += `📁 ${getCategoryLabel(session.data.category)}\n`;
  message += `${getPriorityEmoji('medium')} Prioridade: Média\n\n`;
  message += `Acompanhe digitando *status ${ticket.ticket_number}*`;

  await sendReply(target, message, isGroup);
}

async function handleConfirmResolve(text: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const lower = text.toLowerCase().trim();
  
  if (lower === 'sim' || lower === 's' || lower === 'yes') {
    await pool.query(
      `UPDATE support_tickets SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [session.data.ticketId]
    );
    await clearSession(senderPhone);
    await sendReply(target, `✅ Chamado *${session.data.ticketNumber}* marcado como resolvido!`, isGroup);
  } else if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'no') {
    await clearSession(senderPhone);
    await sendReply(target, '❌ Operação cancelada.', isGroup);
  } else {
    await sendReply(target, 'Por favor, responda *sim* ou *não*.', isGroup);
  }
}

async function handleConfirmClose(text: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const lower = text.toLowerCase().trim();
  
  if (lower === 'sim' || lower === 's' || lower === 'yes') {
    await pool.query(
      `UPDATE support_tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [session.data.ticketId]
    );
    await clearSession(senderPhone);
    await sendReply(target, `🔒 Chamado *${session.data.ticketNumber}* encerrado!`, isGroup);
  } else if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'no') {
    await clearSession(senderPhone);
    await sendReply(target, '❌ Operação cancelada.', isGroup);
  } else {
    await sendReply(target, 'Por favor, responda *sim* ou *não*.', isGroup);
  }
}

async function handleAwaitingAttach(messageKey: any, mediaType: string, session: WizardSession, senderPhone: string, isGroup: boolean, target: string): Promise<void> {
  const media = await downloadAndUploadMedia(messageKey, mediaType, session.data.ticketId);
  
  if (!media) {
    await sendReply(target, '❌ Erro ao processar o arquivo. Tente novamente.', isGroup);
    return;
  }

  // Add to ticket attachments
  const ticket = await pool.query(`SELECT attachments FROM support_tickets WHERE id = $1`, [session.data.ticketId]);
  const attachments = ticket.rows[0]?.attachments || [];
  attachments.push({ url: media.url, filename: media.filename, type: mediaType, uploadedAt: new Date().toISOString() });

  await pool.query(
    `UPDATE support_tickets SET attachments = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(attachments), session.data.ticketId]
  );

  await clearSession(senderPhone);
  await sendReply(target, `✅ ${getMediaTypeLabel(mediaType)} anexado ao chamado *${session.data.ticketNumber}*!`, isGroup);
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

export class WebhookController {
  async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      console.log('Webhook received:', JSON.stringify(payload).substring(0, 500));

      // Early return for non-message events
      if (!payload.data || payload.event !== 'messages.upsert') {
        return res.status(200).json({ status: 'ignored' });
      }

      const messageData = payload.data;
      const message = messageData.message;
      
      if (!message) {
        return res.status(200).json({ status: 'no_message' });
      }

      // Skip status messages
      if (messageData.key?.fromMe) {
        return res.status(200).json({ status: 'own_message' });
      }

      // Extract sender and target info
      const remoteJid = messageData.key?.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');
      const target = remoteJid;
      
      let senderPhone = '';
      if (isGroup) {
        senderPhone = messageData.key?.participant?.replace('@s.whatsapp.net', '') || '';
      } else {
        senderPhone = remoteJid.replace('@s.whatsapp.net', '');
      }

      if (!senderPhone) {
        console.log('Could not determine sender phone');
        return res.status(200).json({ status: 'no_sender' });
      }

      // Extract message content
      let textContent = '';
      let mediaType: string | null = null;
      const messageKey = messageData.key;

      if (message.conversation) {
        textContent = message.conversation;
      } else if (message.extendedTextMessage?.text) {
        textContent = message.extendedTextMessage.text;
      } else if (message.imageMessage) {
        mediaType = 'image';
        textContent = message.imageMessage.caption || '';
      } else if (message.documentMessage) {
        mediaType = 'document';
        textContent = message.documentMessage.caption || '';
      } else if (message.audioMessage) {
        mediaType = 'audio';
      } else if (message.videoMessage) {
        mediaType = 'video';
        textContent = message.videoMessage.caption || '';
      } else if (message.stickerMessage) {
        mediaType = 'sticker';
      }

      console.log(`Message from ${senderPhone}: "${textContent}" (media: ${mediaType})`);

      // Check for active session
      const session = await getSession(senderPhone);

      // Handle media with active session
      if (mediaType && session) {
        if (session.state === 'awaiting_attach_ticket') {
          await handleAwaitingAttach(messageKey, mediaType, session, senderPhone, isGroup, target);
          return res.status(200).json({ status: 'media_attached' });
        }
      }

      // Handle wizard states
      if (session && textContent) {
        switch (session.state) {
          case 'wizard_categoria':
            await handleWizardCategoria(textContent, session, senderPhone, isGroup, target);
            return res.status(200).json({ status: 'wizard_categoria' });
          case 'wizard_titulo':
            await handleWizardTitulo(textContent, session, senderPhone, isGroup, target);
            return res.status(200).json({ status: 'wizard_titulo' });
          case 'wizard_descricao':
            await handleWizardDescricao(textContent, session, senderPhone, isGroup, target);
            return res.status(200).json({ status: 'wizard_descricao' });
          case 'confirm_resolve':
            await handleConfirmResolve(textContent, session, senderPhone, isGroup, target);
            return res.status(200).json({ status: 'confirm_resolve' });
          case 'confirm_close':
            await handleConfirmClose(textContent, session, senderPhone, isGroup, target);
            return res.status(200).json({ status: 'confirm_close' });
        }
      }

      // Handle media without session - suggest attach
      if (mediaType && !session) {
        const user = await findUserByPhone(senderPhone);
        if (user) {
          await sendReply(target, `📎 Recebi seu ${getMediaTypeLabel(mediaType).toLowerCase()}!\n\nPara anexar a um chamado, use:\n*anexar [número]*\n\nExemplo: anexar 12345`, isGroup);
        }
        return res.status(200).json({ status: 'media_hint' });
      }

      // Handle commands
      if (textContent) {
        const cmd = extractCommand(textContent);
        
        if (cmd) {
          switch (cmd.command) {
            case 'ajuda':
            case 'help':
            case '?':
              await handleHelp(senderPhone, isGroup, target);
              break;
            case 'status':
              await handleStatus(cmd.args, senderPhone, isGroup, target);
              break;
            case 'detalhes':
            case 'detalhe':
            case 'ver':
              await handleDetails(cmd.args, senderPhone, isGroup, target);
              break;
            case 'iniciar':
            case 'atender':
              await handleStart(cmd.args, senderPhone, isGroup, target);
              break;
            case 'resolver':
            case 'resolvido':
              await handleResolve(cmd.args, senderPhone, isGroup, target);
              break;
            case 'encerrar':
            case 'fechar':
              await handleClose(cmd.args, senderPhone, isGroup, target);
              break;
            case 'reabrir':
              await handleReopen(cmd.args, senderPhone, isGroup, target);
              break;
            case 'prioridade':
              await handlePriority(cmd.args, senderPhone, isGroup, target);
              break;
            case 'comentar':
            case 'comentário':
            case 'comentario':
              await handleComment(cmd.args, senderPhone, isGroup, target);
              break;
            case 'atribuir':
              await handleAssign(cmd.args, senderPhone, isGroup, target);
              break;
            case 'transferir':
              await handleTransfer(cmd.args, senderPhone, isGroup, target);
              break;
            case 'cancelar':
              await handleCancel(cmd.args, senderPhone, isGroup, target);
              break;
            case 'novo':
            case 'criar_chamado':
            case 'abrir_chamado':
              await handleNew(cmd.args, senderPhone, isGroup, target);
              break;
            case 'disponiveis':
            case 'disponíveis':
              await handleAvailable(senderPhone, isGroup, target);
              break;
            case 'meus_chamados':
            case 'meus_tickets':
              await handleMyTickets(senderPhone, isGroup, target);
              break;
            case 'minhas_estatisticas':
            case 'minhas_estatísticas':
            case 'minha_performance':
              await handleMyStats(senderPhone, isGroup, target);
              break;
            case 'anexar':
              await handleAttach(cmd.args, senderPhone, isGroup, target);
              break;
          }
          return res.status(200).json({ status: 'command_processed', command: cmd.command });
        }

        // Check if message mentions a ticket number
        const ticketNumber = extractTicketNumber(textContent);
        if (ticketNumber) {
          await handleStatus(ticketNumber, senderPhone, isGroup, target);
          return res.status(200).json({ status: 'ticket_status' });
        }
      }

      return res.status(200).json({ status: 'no_action' });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const webhookController = new WebhookController();
