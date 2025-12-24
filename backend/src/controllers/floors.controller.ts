import { Request, Response } from 'express';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Floors
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { buildingId } = req.query;

    let sql = `
      SELECT f.*, b.name as building_name,
        (SELECT COUNT(*) FROM rooms WHERE floor_id = f.id) as room_count
      FROM floors f
      JOIN buildings b ON b.id = f.building_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (buildingId) {
      sql += ' AND f.building_id = $1';
      params.push(buildingId);
    }

    sql += ' ORDER BY b.name, f.floor_number NULLS LAST, f.name';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Floors list error:', error);
    res.status(500).json({ error: 'Erro ao listar andares' });
  }
}

// ===========================================
// Obter Floor por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT f.*, b.name as building_name,
        (SELECT COUNT(*) FROM rooms WHERE floor_id = f.id) as room_count
       FROM floors f
       JOIN buildings b ON b.id = f.building_id
       WHERE f.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Andar não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Floors getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar andar' });
  }
}

// ===========================================
// Criar Floor
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const { buildingId, name, floorNumber, areaSqm, hasAccessControl, notes } = req.body;

    if (!buildingId || !name) {
      return res.status(400).json({ error: 'Building ID e nome são obrigatórios' });
    }

    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO floors (id, building_id, name, floor_number, area_sqm, has_access_control, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [id, buildingId, name, floorNumber, areaSqm, hasAccessControl, notes]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Floors create error:', error);
    res.status(500).json({ error: 'Erro ao criar andar' });
  }
}

// ===========================================
// Atualizar Floor
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, floorNumber, areaSqm, hasAccessControl, notes } = req.body;

    const { rows } = await query(
      `UPDATE floors SET
        name = COALESCE($2, name),
        floor_number = COALESCE($3, floor_number),
        area_sqm = COALESCE($4, area_sqm),
        has_access_control = COALESCE($5, has_access_control),
        notes = COALESCE($6, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, floorNumber, areaSqm, hasAccessControl, notes]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Andar não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Floors update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar andar' });
  }
}

// ===========================================
// Deletar Floor
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se tem rooms vinculadas
    const { rows: rooms } = await query(
      'SELECT id FROM rooms WHERE floor_id = $1 LIMIT 1',
      [id]
    );

    if (rooms.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir andar com salas vinculadas' 
      });
    }

    const { rowCount } = await query('DELETE FROM floors WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Andar não encontrado' });
    }

    res.json({ message: 'Andar excluído com sucesso' });
  } catch (error) {
    console.error('Floors delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir andar' });
  }
}

export default { list, getById, create, update, remove };
