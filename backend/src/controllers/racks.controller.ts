import { Request, Response } from 'express';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Racks
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { roomId, buildingId, search } = req.query;

    let sql = `
      SELECT ra.*, r.name as room_name, f.name as floor_name, b.name as building_name, b.id as building_id,
        (SELECT COUNT(*) FROM equipment WHERE rack_id = ra.id) as equipment_count,
        (SELECT COALESCE(SUM(COALESCE(position_u_end, position_u_start) - position_u_start + 1), 0) FROM equipment WHERE rack_id = ra.id) as used_u
      FROM racks ra
      JOIN rooms r ON r.id = ra.room_id
      JOIN floors f ON f.id = r.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (roomId) {
      sql += ` AND ra.room_id = $${paramIndex}`;
      params.push(roomId);
      paramIndex++;
    }

    if (buildingId) {
      sql += ` AND f.building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (ra.name ILIKE $${paramIndex} OR ra.notes ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY b.name, f.floor_number, r.name, ra.name';

    const { rows } = await query(sql, params);
    
    // Calcular ocupação
    const racksWithOccupancy = rows.map(rack => ({
      ...rack,
      free_u: rack.size_u - (rack.used_u || 0),
      occupancy_percent: Math.round(((rack.used_u || 0) / rack.size_u) * 100)
    }));

    res.json(racksWithOccupancy);
  } catch (error) {
    console.error('Racks list error:', error);
    res.status(500).json({ error: 'Erro ao listar racks' });
  }
}

// ===========================================
// Obter Rack por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT ra.*, r.name as room_name, r.id as room_id, f.name as floor_name, f.id as floor_id, 
              b.name as building_name, b.id as building_id
       FROM racks ra
       JOIN rooms r ON r.id = ra.room_id
       JOIN floors f ON f.id = r.floor_id
       JOIN buildings b ON b.id = f.building_id
       WHERE ra.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrado' });
    }

    // Buscar equipamentos
    const { rows: equipment } = await query(
      `SELECT e.*, 
        (SELECT COUNT(*) FROM ports WHERE equipment_id = e.id) as port_count,
        (SELECT COUNT(*) FROM ports p 
         JOIN connections c ON c.port_a_id = p.id OR c.port_b_id = p.id 
         WHERE p.equipment_id = e.id) as connection_count
       FROM equipment e
       WHERE e.rack_id = $1
       ORDER BY e.position_u_start DESC NULLS LAST`,
      [id]
    );

    const usedU = equipment.reduce((sum, eq) => {
      const start = eq.position_u_start || 0;
      const end = eq.position_u_end || start;
      return sum + (end - start + 1);
    }, 0);

    res.json({
      ...rows[0],
      equipment,
      used_u: usedU,
      free_u: rows[0].size_u - usedU,
      occupancy_percent: Math.round((usedU / rows[0].size_u) * 100)
    });
  } catch (error) {
    console.error('Racks getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar rack' });
  }
}

// ===========================================
// Criar Rack
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const { roomId, name, sizeU, notes } = req.body;

    if (!roomId || !name) {
      return res.status(400).json({ error: 'Room ID e nome são obrigatórios' });
    }

    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO racks (id, room_id, name, size_u, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, roomId, name, sizeU || 42, notes]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Racks create error:', error);
    res.status(500).json({ error: 'Erro ao criar rack' });
  }
}

// ===========================================
// Atualizar Rack
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, sizeU, notes } = req.body;

    const { rows } = await query(
      `UPDATE racks SET
        name = COALESCE($2, name),
        size_u = COALESCE($3, size_u),
        notes = COALESCE($4, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, sizeU, notes]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Racks update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar rack' });
  }
}

// ===========================================
// Deletar Rack
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se tem equipamentos vinculados
    const { rows: equipment } = await query(
      'SELECT id FROM equipment WHERE rack_id = $1 LIMIT 1',
      [id]
    );

    if (equipment.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir rack com equipamentos vinculados' 
      });
    }

    const { rowCount } = await query('DELETE FROM racks WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Rack não encontrado' });
    }

    res.json({ message: 'Rack excluído com sucesso' });
  } catch (error) {
    console.error('Racks delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir rack' });
  }
}

// ===========================================
// Obter Ocupação do Rack
// ===========================================
export async function getOccupancy(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows: rack } = await query('SELECT size_u FROM racks WHERE id = $1', [id]);

    if (rack.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrado' });
    }

    const { rows: equipment } = await query(
      `SELECT id, name, type, position_u_start, position_u_end, mount_side
       FROM equipment
       WHERE rack_id = $1
       ORDER BY position_u_start`,
      [id]
    );

    // Criar mapa de ocupação
    const occupancyMap: Record<number, any> = {};
    
    for (let u = 1; u <= rack[0].size_u; u++) {
      occupancyMap[u] = { u, occupied: false, equipment: null };
    }

    equipment.forEach(eq => {
      const start = eq.position_u_start || 1;
      const end = eq.position_u_end || start;
      
      for (let u = start; u <= end; u++) {
        if (occupancyMap[u]) {
          occupancyMap[u] = {
            u,
            occupied: true,
            equipment: {
              id: eq.id,
              name: eq.name,
              type: eq.type,
              mountSide: eq.mount_side
            }
          };
        }
      }
    });

    res.json({
      sizeU: rack[0].size_u,
      occupancy: Object.values(occupancyMap),
      summary: {
        total: rack[0].size_u,
        occupied: equipment.reduce((sum, eq) => {
          const start = eq.position_u_start || 0;
          const end = eq.position_u_end || start;
          return sum + (end - start + 1);
        }, 0),
        free: rack[0].size_u - equipment.reduce((sum, eq) => {
          const start = eq.position_u_start || 0;
          const end = eq.position_u_end || start;
          return sum + (end - start + 1);
        }, 0)
      }
    });
  } catch (error) {
    console.error('Racks getOccupancy error:', error);
    res.status(500).json({ error: 'Erro ao buscar ocupação do rack' });
  }
}

export default { list, getById, create, update, remove, getOccupancy };
