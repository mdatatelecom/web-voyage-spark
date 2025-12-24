import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { hashPassword } from '../config/auth';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Listar Users
// ===========================================
export async function list(req: Request, res: Response) {
  try {
    const { role, search } = req.query;

    let sql = `
      SELECT u.id, u.email, u.created_at,
        p.full_name, p.phone, p.avatar_url,
        array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (u.email ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' GROUP BY u.id, u.email, u.created_at, p.full_name, p.phone, p.avatar_url';

    if (role) {
      sql += ` HAVING $${paramIndex} = ANY(array_agg(ur.role))`;
      params.push(role);
      paramIndex++;
    }

    sql += ' ORDER BY u.created_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
}

// ===========================================
// Obter User por ID
// ===========================================
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT u.id, u.email, u.created_at,
        p.full_name, p.phone, p.avatar_url, p.avatar_updated_at
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { rows: roles } = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [id]
    );

    res.json({ ...rows[0], roles: roles.map(r => r.role) });
  } catch (error) {
    console.error('Users getById error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

// ===========================================
// Criar User (Admin only)
// ===========================================
export async function create(req: Request, res: Response) {
  try {
    const { email, password, fullName, phone, roles } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    await transaction(async (client) => {
      // Criar usuário
      await client.query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [userId, email.toLowerCase(), passwordHash]
      );

      // Criar perfil
      await client.query(
        `INSERT INTO profiles (id, full_name, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [userId, fullName, phone]
      );

      // Criar roles
      const userRoles = roles && roles.length > 0 ? roles : ['viewer'];
      for (const role of userRoles) {
        await client.query(
          `INSERT INTO user_roles (id, user_id, role, assigned_at, assigned_by)
           VALUES ($1, $2, $3, NOW(), $4)`,
          [uuidv4(), userId, role, req.user?.userId]
        );
      }
    });

    res.status(201).json({ 
      id: userId, 
      email: email.toLowerCase(), 
      fullName, 
      phone,
      roles: roles || ['viewer']
    });
  } catch (error) {
    console.error('Users create error:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

// ===========================================
// Atualizar User
// ===========================================
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fullName, phone, avatarUrl } = req.body;

    const { rows } = await query(
      `UPDATE profiles SET
        full_name = COALESCE($2, full_name),
        phone = COALESCE($3, phone),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, fullName, phone, avatarUrl]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Users update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

// ===========================================
// Atualizar Roles do User
// ===========================================
export async function updateRoles(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles são obrigatórias' });
    }

    await transaction(async (client) => {
      // Remover roles existentes
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

      // Adicionar novas roles
      for (const role of roles) {
        await client.query(
          `INSERT INTO user_roles (id, user_id, role, assigned_at, assigned_by)
           VALUES ($1, $2, $3, NOW(), $4)`,
          [uuidv4(), id, role, req.user?.userId]
        );
      }
    });

    res.json({ message: 'Roles atualizadas com sucesso', roles });
  } catch (error) {
    console.error('Users updateRoles error:', error);
    res.status(500).json({ error: 'Erro ao atualizar roles' });
  }
}

// ===========================================
// Deletar User
// ===========================================
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Não permitir deletar o próprio usuário
    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
    }

    await transaction(async (client) => {
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      await client.query('DELETE FROM notification_settings WHERE user_id = $1', [id]);
      await client.query('DELETE FROM profiles WHERE id = $1', [id]);
      await client.query('DELETE FROM users WHERE id = $1', [id]);
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Users delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
}

// ===========================================
// Listar Técnicos
// ===========================================
export async function listTechnicians(req: Request, res: Response) {
  try {
    const { rows } = await query(`
      SELECT u.id, u.email, p.full_name, p.phone, p.avatar_url
      FROM users u
      JOIN profiles p ON p.id = u.id
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role IN ('admin', 'technician')
      ORDER BY p.full_name
    `);

    res.json(rows);
  } catch (error) {
    console.error('Users listTechnicians error:', error);
    res.status(500).json({ error: 'Erro ao listar técnicos' });
  }
}

export default { list, getById, create, update, updateRoles, remove, listTechnicians };
