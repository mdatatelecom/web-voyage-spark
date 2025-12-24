import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { hashPassword, verifyPassword, generateTokens, verifyRefreshToken } from '../config/auth';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Registro de novo usuário
// ===========================================
export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Verificar se usuário já existe
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    // Criar usuário e perfil em transação
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
        [userId, fullName || null, phone || null]
      );

      // Atribuir role padrão (viewer)
      await client.query(
        `INSERT INTO user_roles (id, user_id, role, assigned_at)
         VALUES ($1, $2, 'viewer', NOW())`,
        [uuidv4(), userId]
      );
    });

    // Buscar roles
    const { rows: roles } = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );

    // Gerar tokens
    const tokens = generateTokens({
      userId,
      email: email.toLowerCase(),
      roles: roles.map(r => r.role),
    });

    res.status(201).json({
      user: { id: userId, email: email.toLowerCase(), fullName, phone },
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
}

// ===========================================
// Login
// ===========================================
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const { rows: users } = await query(
      `SELECT u.id, u.email, u.password_hash, p.full_name, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = users[0];

    // Verificar senha
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar roles
    const { rows: roles } = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );

    // Gerar tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      roles: roles.map(r => r.role),
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        roles: roles.map(r => r.role),
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

// ===========================================
// Refresh Token
// ===========================================
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido' });
    }

    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Buscar roles atuais
    const { rows: roles } = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [decoded.userId]
    );

    // Gerar novos tokens
    const tokens = generateTokens({
      userId: decoded.userId,
      email: decoded.email,
      roles: roles.map(r => r.role),
    });

    res.json(tokens);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expirado' });
    }
    res.status(401).json({ error: 'Refresh token inválido' });
  }
}

// ===========================================
// Get Current User
// ===========================================
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { rows: users } = await query(
      `SELECT u.id, u.email, p.full_name, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { rows: roles } = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );

    const user = users[0];

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      roles: roles.map(r => r.role),
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

// ===========================================
// Logout (invalidar tokens no cliente)
// ===========================================
export async function logout(req: Request, res: Response) {
  // JWT é stateless, então apenas confirmar logout
  // Em implementação mais robusta, adicionar token a blacklist
  res.json({ message: 'Logout realizado com sucesso' });
}

// ===========================================
// Change Password
// ===========================================
export async function changePassword(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senhas são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    // Buscar senha atual
    const { rows: users } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const isValid = await verifyPassword(currentPassword, users[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Atualizar senha
    const newHash = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
}

export default { register, login, refreshToken, getMe, logout, changePassword };
