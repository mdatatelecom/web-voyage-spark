import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Configuração do logger
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: customFormat,
  transports: [
    // Console (colorido em desenvolvimento)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    // Arquivo de logs gerais
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Arquivo de erros
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Middleware para logar requisições
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl}`;
    
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
    };

    if (res.statusCode >= 500) {
      logger.error(message, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  });

  next();
}

// Middleware para logar erros
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    userId: req.user?.userId,
  });

  next(err);
}

export default { logger, requestLogger, errorLogger };
