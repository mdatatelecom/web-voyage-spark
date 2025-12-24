import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Tickets
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { status, priority, category, assignedTo, createdBy, search } = req.query;

    let sql = `
      SELECT t.*,
        p_creator.full_name as creator_name,
        p_assigned.full_name as assigned_name
      FROM support_tickets t
      LEFT JOIN profiles p_creator ON p_creator.id = t.created_by
      LEFT JOIN profiles p_assigned ON p_assigned.id = t.assigned_to
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      sql += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (category) {
      sql += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (assignedTo) {
      sql += ` AND t.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    if (createdBy) {
      sql += ` AND t.created_by = $${paramIndex}`;
      params.push(createdBy);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (t.title ILIKE $${paramIndex} OR t.ticket_number ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY t.created_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Tickets list error:', error);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
}

// ===========================================
// Obter Ticket por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT t.*,
        p_creator.full_name as creator_name, p_creator.phone as creator_phone,
        p_assigned.full_name as assigned_name, p_assigned.phone as assigned_phone,
        b.name as building_name, r.name as room_name, ra.name as rack_name, e.name as equipment_name
       FROM support_tickets t
       LEFT JOIN profiles p_creator ON p_creator.id = t.created_by
       LEFT JOIN profiles p_assigned ON p_assigned.id = t.assigned_to
       LEFT JOIN buildings b ON b.id = t.related_building_id
       LEFT JOIN rooms r ON r.id = t.related_room_id
       LEFT JOIN racks ra ON ra.id = t.related_rack_id
       LEFT JOIN equipment e ON e.id = t.related_equipment_id
       WHERE t.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Buscar comentários
    const { rows: comments } = await query(
      `SELECT c.*, p.full_name as user_name, p.avatar_url
       FROM ticket_comments c
       LEFT JOIN profiles p ON p.id = c.user_id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({ ...rows[0], comments });
  } catch (error) {
    console.error('Tickets getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamado' });
  }
}

// ===========================================
// Criar Ticket
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const {
      title, description, category, priority, contactPhone,
      relatedBuildingId, relatedRoomId, relatedRackId, relatedEquipmentId,
      dueDate, attachments
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    }

    const ticketId = uuidv4();
    
    // Gerar número do ticket
    const year = new Date().getFullYear();
    const { rows: countResult } = await query(
      "SELECT COUNT(*) as count FROM support_tickets WHERE ticket_number LIKE $1",
      [`TKT-${year}-%`]
    );
    const ticketNumber = `TKT-${year}-${String(parseInt(countResult[0].count) + 1).padStart(5, '0')}`;

    const { rows } = await query(
      `INSERT INTO support_tickets (
        id, ticket_number, title, description, category, priority, status,
        created_by, contact_phone, related_building_id, related_room_id, 
        related_rack_id, related_equipment_id, due_date, attachments, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [ticketId, ticketNumber, title, description, category || 'other', priority || 'medium',
       req.user?.userId, contactPhone, relatedBuildingId, relatedRoomId, 
       relatedRackId, relatedEquipmentId, dueDate, JSON.stringify(attachments || [])]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Tickets create error:', error);
    res.status(500).json({ error: 'Erro ao criar chamado' });
  }
}

// ===========================================
// Atualizar Ticket
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      title, description, category, priority, status, assignedTo,
      contactPhone, technicianPhone, dueDate, attachments
    } = req.body;

    // Atualizar campos de data de resolução/fechamento
    let resolvedAt = null;
    let closedAt = null;
    
    if (status === 'resolved') {
      resolvedAt = new Date().toISOString();
    } else if (status === 'closed') {
      closedAt = new Date().toISOString();
    }

    const { rows } = await query(
      `UPDATE support_tickets SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        assigned_to = COALESCE($7, assigned_to),
        contact_phone = COALESCE($8, contact_phone),
        technician_phone = COALESCE($9, technician_phone),
        due_date = COALESCE($10, due_date),
        attachments = COALESCE($11, attachments),
        resolved_at = COALESCE($12, resolved_at),
        closed_at = COALESCE($13, closed_at),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, title, description, category, priority, status, assignedTo,
       contactPhone, technicianPhone, dueDate, attachments ? JSON.stringify(attachments) : null,
       resolvedAt, closedAt]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Tickets update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
}

// ===========================================
// Deletar Ticket
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await transaction(async (client) => {
      // Deletar comentários
      await client.query('DELETE FROM ticket_comments WHERE ticket_id = $1', [id]);
      // Deletar mapeamentos WhatsApp
      await client.query('DELETE FROM whatsapp_message_mapping WHERE ticket_id = $1', [id]);
      // Deletar ticket
      await client.query('DELETE FROM support_tickets WHERE id = $1', [id]);
    });

    res.json({ message: 'Chamado excluído com sucesso' });
  } catch (error) {
    console.error('Tickets delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir chamado' });
  }
}

// ===========================================
// Adicionar Comentário
// ===========================================
export async function addComment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { comment, isInternal, attachments } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comentário é obrigatório' });
    }

    const commentId = uuidv4();

    const { rows } = await query(
      `INSERT INTO ticket_comments (id, ticket_id, user_id, comment, is_internal, attachments, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'web', NOW())
       RETURNING *`,
      [commentId, id, req.user?.userId, comment, isInternal || false, JSON.stringify(attachments || [])]
    );

    // Atualizar ticket
    await query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [id]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Tickets addComment error:', error);
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
}

// ===========================================
// Obter Estatísticas
// ===========================================
export async function getStats(req: Request, res: Response) {
  try {
    const { rows } = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved', 'closed')) as critical_open,
        COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved', 'closed')) as high_open,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
      FROM support_tickets
    `);

    res.json(rows[0]);
  } catch (error) {
    console.error('Tickets getStats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}

export default { list, getById, create, update, remove, addComment, getStats };
