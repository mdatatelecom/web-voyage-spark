import { Request, Response } from 'express';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Alerts
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { status, severity, type as alertType } = req.query;

    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (alertType) {
      sql += ` AND type = $${paramIndex}`;
      params.push(alertType);
      paramIndex++;
    }

    sql += ' ORDER BY created_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Alerts list error:', error);
    res.status(500).json({ error: 'Erro ao listar alertas' });
  }
}

// ===========================================
// Obter Alert por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query('SELECT * FROM alerts WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Alerts getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar alerta' });
  }
}

// ===========================================
// Reconhecer Alert
// ===========================================
export async function acknowledge(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `UPDATE alerts SET
        status = 'acknowledged',
        acknowledged_at = NOW(),
        acknowledged_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, req.user?.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Alerts acknowledge error:', error);
    res.status(500).json({ error: 'Erro ao reconhecer alerta' });
  }
}

// ===========================================
// Resolver Alert
// ===========================================
export async function resolve(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `UPDATE alerts SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, req.user?.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Alerts resolve error:', error);
    res.status(500).json({ error: 'Erro ao resolver alerta' });
  }
}

// ===========================================
// Verificar Capacidades (Cron Job)
// ===========================================
export async function checkCapacity(req: Request, res: Response) {
  try {
    // Buscar configurações de threshold
    const { rows: settings } = await query(
      "SELECT setting_key, setting_value FROM alert_settings WHERE setting_key IN ('rack_capacity_threshold', 'port_capacity_threshold', 'poe_capacity_threshold')"
    );

    const thresholds: Record<string, number> = {};
    settings.forEach(s => {
      thresholds[s.setting_key] = s.setting_value;
    });

    const rackThreshold = thresholds['rack_capacity_threshold'] || 80;
    const portThreshold = thresholds['port_capacity_threshold'] || 85;
    const poeThreshold = thresholds['poe_capacity_threshold'] || 80;

    const alertsCreated: any[] = [];

    // Verificar capacidade de racks
    const { rows: racks } = await query(`
      SELECT r.id, r.name, r.size_u,
        COALESCE(SUM(COALESCE(e.position_u_end, e.position_u_start) - e.position_u_start + 1), 0) as used_u,
        ro.name as room_name
      FROM racks r
      LEFT JOIN equipment e ON e.rack_id = r.id
      JOIN rooms ro ON ro.id = r.room_id
      GROUP BY r.id, r.name, r.size_u, ro.name
    `);

    for (const rack of racks) {
      const usagePercent = (rack.used_u / rack.size_u) * 100;
      
      if (usagePercent >= rackThreshold) {
        // Verificar se já existe alerta ativo
        const { rows: existing } = await query(
          "SELECT id FROM alerts WHERE type = 'rack_capacity' AND related_entity_id = $1 AND status = 'active'",
          [rack.id]
        );

        if (existing.length === 0) {
          const alertId = uuidv4();
          await query(
            `INSERT INTO alerts (id, type, severity, title, message, related_entity_type, related_entity_id, threshold_value, current_value, created_at)
             VALUES ($1, 'rack_capacity', $2, $3, $4, 'rack', $5, $6, $7, NOW())`,
            [
              alertId,
              usagePercent >= 95 ? 'critical' : 'warning',
              `Rack ${rack.name} atingiu ${Math.round(usagePercent)}% de ocupação`,
              `O rack ${rack.name} na sala ${rack.room_name} está com ${rack.used_u}U de ${rack.size_u}U ocupados.`,
              rack.id,
              rackThreshold,
              usagePercent
            ]
          );
          alertsCreated.push({ type: 'rack_capacity', rack: rack.name, usage: usagePercent });
        }
      }
    }

    // Verificar capacidade de portas
    const { rows: equipment } = await query(`
      SELECT e.id, e.name, e.type,
        COUNT(p.id) as total_ports,
        COUNT(p.id) FILTER (WHERE p.status = 'in_use') as used_ports
      FROM equipment e
      LEFT JOIN ports p ON p.equipment_id = e.id
      WHERE e.type IN ('switch', 'switch_poe', 'patch_panel', 'patch_panel_fiber')
      GROUP BY e.id, e.name, e.type
      HAVING COUNT(p.id) > 0
    `);

    for (const eq of equipment) {
      const usagePercent = (eq.used_ports / eq.total_ports) * 100;
      
      if (usagePercent >= portThreshold) {
        const { rows: existing } = await query(
          "SELECT id FROM alerts WHERE type = 'port_capacity' AND related_entity_id = $1 AND status = 'active'",
          [eq.id]
        );

        if (existing.length === 0) {
          const alertId = uuidv4();
          await query(
            `INSERT INTO alerts (id, type, severity, title, message, related_entity_type, related_entity_id, threshold_value, current_value, created_at)
             VALUES ($1, 'port_capacity', $2, $3, $4, 'equipment', $5, $6, $7, NOW())`,
            [
              alertId,
              usagePercent >= 95 ? 'critical' : 'warning',
              `${eq.name} atingiu ${Math.round(usagePercent)}% de portas ocupadas`,
              `O equipamento ${eq.name} está com ${eq.used_ports} de ${eq.total_ports} portas em uso.`,
              eq.id,
              portThreshold,
              usagePercent
            ]
          );
          alertsCreated.push({ type: 'port_capacity', equipment: eq.name, usage: usagePercent });
        }
      }
    }

    res.json({ 
      message: 'Verificação de capacidade concluída',
      alertsCreated 
    });
  } catch (error) {
    console.error('Alerts checkCapacity error:', error);
    res.status(500).json({ error: 'Erro ao verificar capacidades' });
  }
}

// ===========================================
// Obter Estatísticas de Alertas
// ===========================================
export async function getStats(req: Request, res: Response) {
  try {
    const { rows } = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical_active,
        COUNT(*) FILTER (WHERE severity = 'warning' AND status = 'active') as warning_active
      FROM alerts
    `);

    res.json(rows[0]);
  } catch (error) {
    console.error('Alerts getStats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}

export default { list, getById, acknowledge, resolve, checkCapacity, getStats };
