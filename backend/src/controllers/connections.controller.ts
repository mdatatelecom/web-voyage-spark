import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Connections
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { status, cableType, search, equipmentId, rackId } = req.query;

    let sql = `
      SELECT c.*,
        pa.name as port_a_name, pa.port_number as port_a_number,
        pb.name as port_b_name, pb.port_number as port_b_number,
        ea.id as equipment_a_id, ea.name as equipment_a_name, ea.type as equipment_a_type,
        eb.id as equipment_b_id, eb.name as equipment_b_name, eb.type as equipment_b_type,
        ra.id as rack_a_id, ra.name as rack_a_name,
        rb.id as rack_b_id, rb.name as rack_b_name
      FROM connections c
      JOIN ports pa ON pa.id = c.port_a_id
      JOIN ports pb ON pb.id = c.port_b_id
      JOIN equipment ea ON ea.id = pa.equipment_id
      JOIN equipment eb ON eb.id = pb.equipment_id
      JOIN racks ra ON ra.id = ea.rack_id
      JOIN racks rb ON rb.id = eb.rack_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (cableType) {
      sql += ` AND c.cable_type = $${paramIndex}`;
      params.push(cableType);
      paramIndex++;
    }

    if (equipmentId) {
      sql += ` AND (ea.id = $${paramIndex} OR eb.id = $${paramIndex})`;
      params.push(equipmentId);
      paramIndex++;
    }

    if (rackId) {
      sql += ` AND (ra.id = $${paramIndex} OR rb.id = $${paramIndex})`;
      params.push(rackId);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (c.connection_code ILIKE $${paramIndex} OR c.notes ILIKE $${paramIndex} OR ea.name ILIKE $${paramIndex} OR eb.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY c.installed_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Connections list error:', error);
    res.status(500).json({ error: 'Erro ao listar conexões' });
  }
}

// ===========================================
// Obter Connection por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT c.*,
        pa.name as port_a_name, pa.port_number as port_a_number, pa.port_type as port_a_type,
        pb.name as port_b_name, pb.port_number as port_b_number, pb.port_type as port_b_type,
        ea.id as equipment_a_id, ea.name as equipment_a_name, ea.type as equipment_a_type, ea.ip_address as equipment_a_ip,
        eb.id as equipment_b_id, eb.name as equipment_b_name, eb.type as equipment_b_type, eb.ip_address as equipment_b_ip,
        ra.id as rack_a_id, ra.name as rack_a_name,
        rb.id as rack_b_id, rb.name as rack_b_name,
        roa.name as room_a_name, rob.name as room_b_name,
        ba.name as building_a_name, bb.name as building_b_name
       FROM connections c
       JOIN ports pa ON pa.id = c.port_a_id
       JOIN ports pb ON pb.id = c.port_b_id
       JOIN equipment ea ON ea.id = pa.equipment_id
       JOIN equipment eb ON eb.id = pb.equipment_id
       JOIN racks ra ON ra.id = ea.rack_id
       JOIN racks rb ON rb.id = eb.rack_id
       JOIN rooms roa ON roa.id = ra.room_id
       JOIN rooms rob ON rob.id = rb.room_id
       JOIN floors fa ON fa.id = roa.floor_id
       JOIN floors fb ON fb.id = rob.floor_id
       JOIN buildings ba ON ba.id = fa.building_id
       JOIN buildings bb ON bb.id = fb.building_id
       WHERE c.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    // Buscar labels
    const { rows: labels } = await query(
      'SELECT * FROM labels WHERE connection_id = $1 ORDER BY generated_at DESC',
      [id]
    );

    res.json({ ...rows[0], labels });
  } catch (error) {
    console.error('Connections getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar conexão' });
  }
}

// ===========================================
// Criar Connection
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const {
      portAId, portBId, cableType, cableLengthMeters, cableColor,
      status, vlanId, vlanName, vlanTagging, notes
    } = req.body;

    if (!portAId || !portBId || !cableType) {
      return res.status(400).json({ error: 'Porta A, Porta B e tipo de cabo são obrigatórios' });
    }

    // Verificar se portas estão disponíveis
    const { rows: ports } = await query(
      'SELECT id, status FROM ports WHERE id IN ($1, $2)',
      [portAId, portBId]
    );

    if (ports.length !== 2) {
      return res.status(400).json({ error: 'Uma ou ambas as portas não existem' });
    }

    const busyPort = ports.find(p => p.status === 'in_use');
    if (busyPort) {
      return res.status(400).json({ error: 'Uma das portas já está em uso' });
    }

    const connectionId = uuidv4();

    // Gerar código de conexão
    const { rows: codeResult } = await query('SELECT generate_connection_code() as code');
    const connectionCode = codeResult[0]?.code || `CONN-${Date.now()}`;

    await transaction(async (client) => {
      // Criar conexão
      await client.query(
        `INSERT INTO connections (
          id, connection_code, port_a_id, port_b_id, cable_type, cable_length_meters, cable_color,
          status, vlan_id, vlan_name, vlan_tagging, notes, installed_by, installed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
        [connectionId, connectionCode, portAId, portBId, cableType, cableLengthMeters, cableColor,
         status || 'active', vlanId, vlanName, vlanTagging || 'untagged', notes, req.user?.userId]
      );

      // Atualizar status das portas
      await client.query(
        "UPDATE ports SET status = 'in_use', updated_at = NOW() WHERE id IN ($1, $2)",
        [portAId, portBId]
      );
    });

    const { rows } = await query('SELECT * FROM connections WHERE id = $1', [connectionId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Connections create error:', error);
    res.status(500).json({ error: 'Erro ao criar conexão' });
  }
}

// ===========================================
// Atualizar Connection
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { cableLengthMeters, cableColor, status, vlanId, vlanName, vlanTagging, notes } = req.body;

    const { rows } = await query(
      `UPDATE connections SET
        cable_length_meters = COALESCE($2, cable_length_meters),
        cable_color = COALESCE($3, cable_color),
        status = COALESCE($4, status),
        vlan_id = COALESCE($5, vlan_id),
        vlan_name = COALESCE($6, vlan_name),
        vlan_tagging = COALESCE($7, vlan_tagging),
        notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, cableLengthMeters, cableColor, status, vlanId, vlanName, vlanTagging, notes]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Connections update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar conexão' });
  }
}

// ===========================================
// Deletar Connection
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Buscar conexão para obter portas
    const { rows: connection } = await query(
      'SELECT port_a_id, port_b_id FROM connections WHERE id = $1',
      [id]
    );

    if (connection.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    await transaction(async (client) => {
      // Deletar labels
      await client.query('DELETE FROM labels WHERE connection_id = $1', [id]);
      
      // Deletar conexão
      await client.query('DELETE FROM connections WHERE id = $1', [id]);
      
      // Liberar portas
      await client.query(
        "UPDATE ports SET status = 'available', updated_at = NOW() WHERE id IN ($1, $2)",
        [connection[0].port_a_id, connection[0].port_b_id]
      );
    });

    res.json({ message: 'Conexão excluída com sucesso' });
  } catch (error) {
    console.error('Connections delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir conexão' });
  }
}

// ===========================================
// Buscar por QR Code
// ===========================================
export async function getByCode(req: Request, res: Response) {
  try {
    const { code } = req.params;

    const { rows } = await query(
      `SELECT c.*,
        pa.name as port_a_name, ea.name as equipment_a_name, ra.name as rack_a_name,
        pb.name as port_b_name, eb.name as equipment_b_name, rb.name as rack_b_name
       FROM connections c
       JOIN ports pa ON pa.id = c.port_a_id
       JOIN ports pb ON pb.id = c.port_b_id
       JOIN equipment ea ON ea.id = pa.equipment_id
       JOIN equipment eb ON eb.id = pb.equipment_id
       JOIN racks ra ON ra.id = ea.rack_id
       JOIN racks rb ON rb.id = eb.rack_id
       WHERE c.connection_code = $1`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    // Registrar acesso
    if (req.user?.userId) {
      await query(
        `INSERT INTO access_logs (id, user_id, connection_id, action, details, created_at)
         VALUES ($1, $2, $3, 'qr_scanned', $4, NOW())`,
        [uuidv4(), req.user.userId, rows[0].id, JSON.stringify({ method: 'qr_code' })]
      );
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Connections getByCode error:', error);
    res.status(500).json({ error: 'Erro ao buscar conexão por código' });
  }
}

export default { list, getById, create, update, remove, getByCode };
