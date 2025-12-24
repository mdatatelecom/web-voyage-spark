# 🔧 Backend Node.js

Este documento detalha a configuração do backend Node.js que substitui as Edge Functions do Supabase.

## 1. Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # Conexão PostgreSQL
│   │   ├── auth.ts          # Configuração JWT
│   │   └── storage.ts       # Configuração de arquivos
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── buildings.controller.ts
│   │   ├── floors.controller.ts
│   │   ├── rooms.controller.ts
│   │   ├── racks.controller.ts
│   │   ├── equipment.controller.ts
│   │   ├── ports.controller.ts
│   │   ├── connections.controller.ts
│   │   ├── tickets.controller.ts
│   │   ├── whatsapp.controller.ts
│   │   ├── alerts.controller.ts
│   │   └── system.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── cors.middleware.ts
│   │   └── logger.middleware.ts
│   ├── routes/
│   │   └── index.ts
│   ├── services/
│   │   ├── whatsapp.service.ts
│   │   ├── email.service.ts
│   │   └── storage.service.ts
│   ├── websocket/
│   │   └── terminal.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## 2. Package.json

```json
{
  "name": "datacenter-backend",
  "version": "1.0.0",
  "description": "Backend do Sistema de Gerenciamento de Datacenter",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "resend": "^2.0.0",
    "ws": "^8.16.0",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/pg": "^8.10.9",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "@types/multer": "^1.4.11",
    "@types/ws": "^8.5.10",
    "@types/node-cron": "^3.0.11",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "eslint": "^8.56.0",
    "vitest": "^1.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 3. Configuração (src/config/)

### database.ts

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'datacenter_db',
  user: process.env.DB_USER || 'datacenter',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  return res;
};

export const getClient = () => pool.connect();
```

### auth.ts

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};
```

### storage.ts

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Garantir que o diretório existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.params.folder || 'general';
    const destPath = path.join(UPLOAD_DIR, folder);
    
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const getPublicUrl = (filePath: string): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${filePath}`;
};

export const deleteFile = (filePath: string): boolean => {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
```

## 4. Middleware (src/middleware/)

### auth.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '../config/auth';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Token inválido, mas continua sem autenticação
    next();
  }
};
```

### role.middleware.ts

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireTechnician = requireRole('admin', 'technician');
export const requireViewer = requireRole('admin', 'technician', 'viewer', 'network_viewer');
```

### logger.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};
```

## 5. Controllers (src/controllers/)

### auth.controller.ts

```typescript
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../config/auth';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // Verificar se email já existe
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criar usuário
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    
    await query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [userId, email, passwordHash]
    );

    // Criar perfil
    await query(
      'INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3)',
      [userId, fullName, phone]
    );

    // Atribuir papel padrão (viewer)
    await query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [userId, 'viewer']
    );

    // Gerar tokens
    const tokenPayload = { userId, email, roles: ['viewer'] };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Salvar refresh token
    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', $3, $4)',
      [userId, refreshToken, req.ip, req.get('user-agent')]
    );

    res.status(201).json({
      user: { id: userId, email },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const result = await query(
      'SELECT u.id, u.email, u.password_hash FROM users u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar senha
    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar roles
    const rolesResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map(r => r.role);

    // Atualizar last_sign_in
    await query('UPDATE users SET last_sign_in_at = NOW() WHERE id = $1', [user.id]);

    // Gerar tokens
    const tokenPayload = { userId: user.id, email: user.email, roles };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Salvar refresh token
    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', $3, $4)',
      [user.id, refreshToken, req.ip, req.get('user-agent')]
    );

    res.json({
      user: { id: user.id, email: user.email, roles },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    }

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido' });
    }

    // Verificar se o refresh token existe e não expirou
    const result = await query(
      'SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token = $1 AND s.expires_at > NOW()',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }

    const session = result.rows[0];

    // Buscar roles
    const rolesResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [session.user_id]
    );
    const roles = rolesResult.rows.map(r => r.role);

    // Gerar novos tokens
    const tokenPayload = { userId: session.user_id, email: session.email, roles };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Atualizar refresh token
    await query(
      'UPDATE sessions SET refresh_token = $1, expires_at = NOW() + INTERVAL \'7 days\' WHERE id = $2',
      [newRefreshToken, session.id]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const result = await query(
      `SELECT u.id, u.email, u.created_at, p.full_name, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    res.json({
      ...user,
      roles: req.user.roles,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
```

### Generic CRUD Controller Template

```typescript
// src/controllers/buildings.controller.ts
import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM buildings ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Erro ao buscar prédios' });
  }
};

export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM buildings WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching building:', error);
    res.status(500).json({ error: 'Erro ao buscar prédio' });
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, building_type, internal_code, zip_code, city, state, latitude, longitude, contact_name, contact_phone, contact_email, notes } = req.body;
    
    const result = await query(
      `INSERT INTO buildings (name, address, building_type, internal_code, zip_code, city, state, latitude, longitude, contact_name, contact_phone, contact_email, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [name, address, building_type, internal_code, zip_code, city, state, latitude, longitude, contact_name, contact_phone, contact_email, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ error: 'Erro ao criar prédio' });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, building_type, internal_code, zip_code, city, state, latitude, longitude, contact_name, contact_phone, contact_email, notes } = req.body;
    
    const result = await query(
      `UPDATE buildings SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        building_type = COALESCE($3, building_type),
        internal_code = COALESCE($4, internal_code),
        zip_code = COALESCE($5, zip_code),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        latitude = COALESCE($8, latitude),
        longitude = COALESCE($9, longitude),
        contact_name = COALESCE($10, contact_name),
        contact_phone = COALESCE($11, contact_phone),
        contact_email = COALESCE($12, contact_email),
        notes = COALESCE($13, notes)
       WHERE id = $14
       RETURNING *`,
      [name, address, building_type, internal_code, zip_code, city, state, latitude, longitude, contact_name, contact_phone, contact_email, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ error: 'Erro ao atualizar prédio' });
  }
};

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM buildings WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prédio não encontrado' });
    }
    
    res.json({ message: 'Prédio removido com sucesso' });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ error: 'Erro ao remover prédio' });
  }
};
```

## 6. Routes (src/routes/index.ts)

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as buildingsController from '../controllers/buildings.controller';
// ... outros controllers
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireTechnician, requireViewer } from '../middleware/role.middleware';

const router = Router();

// Auth routes (públicas)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refreshToken);
router.get('/auth/me', authMiddleware, authController.getMe);

// Buildings routes
router.get('/buildings', authMiddleware, requireViewer, buildingsController.getAll);
router.get('/buildings/:id', authMiddleware, requireViewer, buildingsController.getById);
router.post('/buildings', authMiddleware, requireTechnician, buildingsController.create);
router.put('/buildings/:id', authMiddleware, requireTechnician, buildingsController.update);
router.delete('/buildings/:id', authMiddleware, requireAdmin, buildingsController.remove);

// ... outras rotas seguem o mesmo padrão

export default router;
```

## 7. Entry Point (src/index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';

import routes from './routes';
import { requestLogger, logger } from './middleware/logger.middleware';
import { setupTerminalWebSocket } from './websocket/terminal';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket para terminal
setupTerminalWebSocket(wss);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

## 8. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 9. .env.example

```env
# Server
NODE_ENV=production
PORT=3000
BASE_URL=https://api.seudominio.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=datacenter_db
DB_USER=datacenter
DB_PASSWORD=sua_senha_segura

# Auth
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://seudominio.com

# Storage
UPLOAD_DIR=./uploads

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# WhatsApp (Evolution API)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE=datacenter

# Logging
LOG_LEVEL=info
```

## 10. Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
```

---

## ✅ Checklist de Conclusão

- [ ] Estrutura de projeto criada
- [ ] Dependências instaladas
- [ ] Configurações implementadas
- [ ] Controllers implementados
- [ ] Middleware implementado
- [ ] Rotas configuradas
- [ ] WebSocket terminal implementado
- [ ] Dockerfile criado
- [ ] Testes realizados

---

## 🔜 Próximo Passo

[Frontend e Nginx →](./04-frontend-nginx.md)
