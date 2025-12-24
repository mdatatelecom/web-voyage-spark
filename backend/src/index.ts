import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

import { requestLogger, errorLogger, logger } from './middleware/logger';
import { pool, testConnection } from './config/database';
import routes from './routes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ===========================================
// Middlewares de Segurança
// ===========================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Ajustar em produção
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===========================================
// Middlewares Gerais
// ===========================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logger de requisições
app.use(requestLogger);

// ===========================================
// Arquivos Estáticos (uploads)
// ===========================================
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadDir));

// ===========================================
// Rotas
// ===========================================
app.use('/api', routes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Datacenter API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// ===========================================
// Error Handler
// ===========================================
app.use(errorLogger);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ===========================================
// Inicialização
// ===========================================
async function startServer() {
  try {
    // Testar conexão com banco
    await testConnection();
    logger.info('✅ Conexão com banco de dados estabelecida');

    // Iniciar servidor
    app.listen(Number(PORT), HOST, () => {
      logger.info(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
      logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

startServer();

export default app;
