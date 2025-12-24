import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Equipment
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { rackId, type, status, search, buildingId } = req.query;

    let sql = `
      SELECT e.*, ra.name as rack_name, r.name as room_name, b.name as building_name,
        (SELECT COUNT(*) FROM ports WHERE equipment_id = e.id) as port_count,
        (SELECT COUNT(*) FROM ports p WHERE p.equipment_id = e.id AND p.status = 'in_use') as ports_in_use
      FROM equipment e
      JOIN racks ra ON ra.id = e.rack_id
      JOIN rooms r ON r.id = ra.room_id
      JOIN floors f ON f.id = r.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (rackId) {
      sql += ` AND e.rack_id = $${paramIndex}`;
      params.push(rackId);
      paramIndex++;
    }

    if (type) {
      sql += ` AND e.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      sql += ` AND e.equipment_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (buildingId) {
      sql += ` AND f.building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (e.name ILIKE $${paramIndex} OR e.hostname ILIKE $${paramIndex} OR e.ip_address ILIKE $${paramIndex} OR e.serial_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY b.name, ra.name, e.position_u_start DESC NULLS LAST';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Equipment list error:', error);
    res.status(500).json({ error: 'Erro ao listar equipamentos' });
  }
}

// ===========================================
// Obter Equipment por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT e.*, ra.name as rack_name, ra.size_u as rack_size, 
              r.name as room_name, f.name as floor_name, b.name as building_name
       FROM equipment e
       JOIN racks ra ON ra.id = e.rack_id
       JOIN rooms r ON r.id = ra.room_id
       JOIN floors f ON f.id = r.floor_id
       JOIN buildings b ON b.id = f.building_id
       WHERE e.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Buscar portas
    const { rows: ports } = await query(
      `SELECT p.*, 
        (SELECT c.id FROM connections c WHERE c.port_a_id = p.id OR c.port_b_id = p.id LIMIT 1) as connection_id
       FROM ports p
       WHERE p.equipment_id = $1
       ORDER BY p.port_number, p.name`,
      [id]
    );

    res.json({ ...rows[0], ports });
  } catch (error) {
    console.error('Equipment getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamento' });
  }
}

// ===========================================
// Criar Equipment
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const {
      rackId, name, type, manufacturer, model, serialNumber, hostname, ipAddress,
      positionUStart, positionUEnd, mountSide, powerConsumptionWatts, poeBudgetWatts,
      assetTag, equipmentStatus, airflow, primaryMacAddress, notes, ports: portList
    } = req.body;

    if (!rackId || !name || !type) {
      return res.status(400).json({ error: 'Rack ID, nome e tipo são obrigatórios' });
    }

    // Verificar se posição está disponível
    if (positionUStart) {
      const { rows: conflicts } = await query(
        `SELECT id, name FROM equipment 
         WHERE rack_id = $1 
         AND mount_side = $3
         AND (
           (position_u_start <= $2 AND COALESCE(position_u_end, position_u_start) >= $2)
           OR (position_u_start <= COALESCE($4, $2) AND COALESCE(position_u_end, position_u_start) >= COALESCE($4, $2))
           OR (position_u_start >= $2 AND COALESCE(position_u_end, position_u_start) <= COALESCE($4, $2))
         )`,
        [rackId, positionUStart, mountSide || 'front', positionUEnd]
      );

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          error: `Posição ocupada pelo equipamento: ${conflicts[0].name}` 
        });
      }
    }

    const equipmentId = uuidv4();

    await transaction(async (client) => {
      // Criar equipamento
      await client.query(
        `INSERT INTO equipment (
          id, rack_id, name, type, manufacturer, model, serial_number, hostname, ip_address,
          position_u_start, position_u_end, mount_side, power_consumption_watts, poe_budget_watts,
          asset_tag, equipment_status, airflow, primary_mac_address, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())`,
        [equipmentId, rackId, name, type, manufacturer, model, serialNumber, hostname, ipAddress,
         positionUStart, positionUEnd, mountSide || 'front', powerConsumptionWatts, poeBudgetWatts,
         assetTag, equipmentStatus || 'active', airflow, primaryMacAddress, notes]
      );

      // Criar portas se especificado
      if (portList && Array.isArray(portList)) {
        for (const port of portList) {
          await client.query(
            `INSERT INTO ports (id, equipment_id, name, port_number, port_type, speed, status, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [uuidv4(), equipmentId, port.name, port.portNumber, port.portType || 'rj45', port.speed, 'available', port.notes]
          );
        }
      }
    });

    const { rows } = await query('SELECT * FROM equipment WHERE id = $1', [equipmentId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Equipment create error:', error);
    res.status(500).json({ error: 'Erro ao criar equipamento' });
  }
}

// ===========================================
// Atualizar Equipment
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name, type, manufacturer, model, serialNumber, hostname, ipAddress,
      positionUStart, positionUEnd, mountSide, powerConsumptionWatts, poeBudgetWatts,
      assetTag, equipmentStatus, airflow, primaryMacAddress, notes
    } = req.body;

    const { rows } = await query(
      `UPDATE equipment SET
        name = COALESCE($2, name),
        type = COALESCE($3, type),
        manufacturer = COALESCE($4, manufacturer),
        model = COALESCE($5, model),
        serial_number = COALESCE($6, serial_number),
        hostname = COALESCE($7, hostname),
        ip_address = COALESCE($8, ip_address),
        position_u_start = COALESCE($9, position_u_start),
        position_u_end = COALESCE($10, position_u_end),
        mount_side = COALESCE($11, mount_side),
        power_consumption_watts = COALESCE($12, power_consumption_watts),
        poe_budget_watts = COALESCE($13, poe_budget_watts),
        asset_tag = COALESCE($14, asset_tag),
        equipment_status = COALESCE($15, equipment_status),
        airflow = COALESCE($16, airflow),
        primary_mac_address = COALESCE($17, primary_mac_address),
        notes = COALESCE($18, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, type, manufacturer, model, serialNumber, hostname, ipAddress,
       positionUStart, positionUEnd, mountSide, powerConsumptionWatts, poeBudgetWatts,
       assetTag, equipmentStatus, airflow, primaryMacAddress, notes]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Equipment update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
}

// ===========================================
// Deletar Equipment
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se tem conexões
    const { rows: connections } = await query(
      `SELECT c.id FROM connections c
       JOIN ports p ON p.id = c.port_a_id OR p.id = c.port_b_id
       WHERE p.equipment_id = $1
       LIMIT 1`,
      [id]
    );

    if (connections.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir equipamento com conexões ativas' 
      });
    }

    await transaction(async (client) => {
      // Deletar portas
      await client.query('DELETE FROM ports WHERE equipment_id = $1', [id]);
      // Deletar equipamento
      await client.query('DELETE FROM equipment WHERE id = $1', [id]);
    });

    res.json({ message: 'Equipamento excluído com sucesso' });
  } catch (error) {
    console.error('Equipment delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir equipamento' });
  }
}

// ===========================================
// Criar Portas em Lote
// ===========================================
export async function createPorts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { ports, prefix, count, portType, speed } = req.body;

    // Verificar se equipamento existe
    const { rows: equipment } = await query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (equipment.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    const createdPorts: any[] = [];

    await transaction(async (client) => {
      if (ports && Array.isArray(ports)) {
        // Criar portas específicas
        for (const port of ports) {
          const portId = uuidv4();
          await client.query(
            `INSERT INTO ports (id, equipment_id, name, port_number, port_type, speed, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'available', NOW(), NOW())`,
            [portId, id, port.name, port.portNumber, port.portType || 'rj45', port.speed]
          );
          createdPorts.push({ id: portId, ...port });
        }
      } else if (prefix && count) {
        // Criar portas em lote
        for (let i = 1; i <= count; i++) {
          const portId = uuidv4();
          const portName = `${prefix}${i}`;
          await client.query(
            `INSERT INTO ports (id, equipment_id, name, port_number, port_type, speed, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'available', NOW(), NOW())`,
            [portId, id, portName, i, portType || 'rj45', speed]
          );
          createdPorts.push({ id: portId, name: portName, portNumber: i });
        }
      }
    });

    res.status(201).json({ created: createdPorts.length, ports: createdPorts });
  } catch (error) {
    console.error('Equipment createPorts error:', error);
    res.status(500).json({ error: 'Erro ao criar portas' });
  }
}

export default { list, getById, create, update, remove, createPorts };
