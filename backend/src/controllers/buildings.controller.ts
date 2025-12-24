import { Request, Response } from 'express';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Buildings
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { search, buildingType, state, city } = req.query;

    let sql = `
      SELECT b.*, 
        (SELECT COUNT(*) FROM floors WHERE building_id = b.id) as floor_count
      FROM buildings b
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (b.name ILIKE $${paramIndex} OR b.address ILIKE $${paramIndex} OR b.internal_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (buildingType) {
      sql += ` AND b.building_type = $${paramIndex}`;
      params.push(buildingType);
      paramIndex++;
    }

    if (state) {
      sql += ` AND b.state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (city) {
      sql += ` AND b.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    sql += ' ORDER BY b.name ASC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Buildings list error:', error);
    res.status(500).json({ error: 'Erro ao listar prédios' });
  }
}

// ===========================================
// Obter Building por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT b.*, 
        (SELECT COUNT(*) FROM floors WHERE building_id = b.id) as floor_count,
        (SELECT COUNT(*) FROM rooms r JOIN floors f ON r.floor_id = f.id WHERE f.building_id = b.id) as room_count,
        (SELECT COUNT(*) FROM racks ra JOIN rooms r ON ra.room_id = r.id JOIN floors f ON r.floor_id = f.id WHERE f.building_id = b.id) as rack_count
       FROM buildings b
       WHERE b.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Buildings getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar prédio' });
  }
}

// ===========================================
// Criar Building
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const {
      name, address, buildingType, internalCode, zipCode, city, state,
      contactName, contactPhone, contactEmail, notes, latitude, longitude
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO buildings (
        id, name, address, building_type, internal_code, zip_code, city, state,
        contact_name, contact_phone, contact_email, notes, latitude, longitude,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [id, name, address, buildingType, internalCode, zipCode, city, state,
       contactName, contactPhone, contactEmail, notes, latitude, longitude]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Buildings create error:', error);
    res.status(500).json({ error: 'Erro ao criar prédio' });
  }
}

// ===========================================
// Atualizar Building
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name, address, buildingType, internalCode, zipCode, city, state,
      contactName, contactPhone, contactEmail, notes, latitude, longitude
    } = req.body;

    const { rows } = await query(
      `UPDATE buildings SET
        name = COALESCE($2, name),
        address = COALESCE($3, address),
        building_type = COALESCE($4, building_type),
        internal_code = COALESCE($5, internal_code),
        zip_code = COALESCE($6, zip_code),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        contact_name = COALESCE($9, contact_name),
        contact_phone = COALESCE($10, contact_phone),
        contact_email = COALESCE($11, contact_email),
        notes = COALESCE($12, notes),
        latitude = COALESCE($13, latitude),
        longitude = COALESCE($14, longitude),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, address, buildingType, internalCode, zipCode, city, state,
       contactName, contactPhone, contactEmail, notes, latitude, longitude]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Buildings update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar prédio' });
  }
}

// ===========================================
// Deletar Building
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se tem floors vinculados
    const { rows: floors } = await query(
      'SELECT id FROM floors WHERE building_id = $1 LIMIT 1',
      [id]
    );

    if (floors.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir prédio com andares vinculados' 
      });
    }

    const { rowCount } = await query(
      'DELETE FROM buildings WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }

    res.json({ message: 'Prédio excluído com sucesso' });
  } catch (error) {
    console.error('Buildings delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir prédio' });
  }
}

// ===========================================
// Obter Hierarquia completa
// ===========================================
export async function getHierarchy(req: Request, res: Response) {
  try {
    const { rows: buildings } = await query(`
      SELECT 
        b.id, b.name, b.internal_code, b.building_type,
        json_agg(
          json_build_object(
            'id', f.id,
            'name', f.name,
            'floor_number', f.floor_number,
            'rooms', (
              SELECT json_agg(
                json_build_object(
                  'id', r.id,
                  'name', r.name,
                  'room_type', r.room_type,
                  'rack_count', (SELECT COUNT(*) FROM racks WHERE room_id = r.id)
                )
              )
              FROM rooms r WHERE r.floor_id = f.id
            )
          )
        ) FILTER (WHERE f.id IS NOT NULL) as floors
      FROM buildings b
      LEFT JOIN floors f ON f.building_id = b.id
      GROUP BY b.id, b.name, b.internal_code, b.building_type
      ORDER BY b.name
    `);

    res.json(buildings);
  } catch (error) {
    console.error('Buildings hierarchy error:', error);
    res.status(500).json({ error: 'Erro ao buscar hierarquia' });
  }
}

export default { list, getById, create, update, remove, getHierarchy };
