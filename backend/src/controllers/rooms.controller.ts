import { Request, Response } from 'express';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Rooms
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { floorId, buildingId, roomType } = req.query;

    let sql = `
      SELECT r.*, f.name as floor_name, b.name as building_name,
        (SELECT COUNT(*) FROM racks WHERE room_id = r.id) as rack_count
      FROM rooms r
      JOIN floors f ON f.id = r.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (floorId) {
      sql += ` AND r.floor_id = $${paramIndex}`;
      params.push(floorId);
      paramIndex++;
    }

    if (buildingId) {
      sql += ` AND f.building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    if (roomType) {
      sql += ` AND r.room_type = $${paramIndex}`;
      params.push(roomType);
      paramIndex++;
    }

    sql += ' ORDER BY b.name, f.floor_number, r.name';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Rooms list error:', error);
    res.status(500).json({ error: 'Erro ao listar salas' });
  }
}

// ===========================================
// Obter Room por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT r.*, f.name as floor_name, f.building_id, b.name as building_name,
        (SELECT COUNT(*) FROM racks WHERE room_id = r.id) as rack_count
       FROM rooms r
       JOIN floors f ON f.id = r.floor_id
       JOIN buildings b ON b.id = f.building_id
       WHERE r.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Rooms getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
}

// ===========================================
// Criar Room
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const { floorId, name, roomType, capacity, hasAccessControl, notes } = req.body;

    if (!floorId || !name) {
      return res.status(400).json({ error: 'Floor ID e nome são obrigatórios' });
    }

    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO rooms (id, floor_id, name, room_type, capacity, has_access_control, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [id, floorId, name, roomType, capacity, hasAccessControl, notes]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Rooms create error:', error);
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
}

// ===========================================
// Atualizar Room
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, roomType, capacity, hasAccessControl, notes } = req.body;

    const { rows } = await query(
      `UPDATE rooms SET
        name = COALESCE($2, name),
        room_type = COALESCE($3, room_type),
        capacity = COALESCE($4, capacity),
        has_access_control = COALESCE($5, has_access_control),
        notes = COALESCE($6, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, roomType, capacity, hasAccessControl, notes]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Rooms update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar sala' });
  }
}

// ===========================================
// Deletar Room
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se tem racks vinculados
    const { rows: racks } = await query(
      'SELECT id FROM racks WHERE room_id = $1 LIMIT 1',
      [id]
    );

    if (racks.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir sala com racks vinculados' 
      });
    }

    const { rowCount } = await query('DELETE FROM rooms WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    res.json({ message: 'Sala excluída com sucesso' });
  } catch (error) {
    console.error('Rooms delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir sala' });
  }
}

export default { list, getById, create, update, remove };
