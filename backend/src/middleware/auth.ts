import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../config/auth';

// Extender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

// Middleware de autenticação obrigatória
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Falha na autenticação' });
  }
}

// Middleware de autenticação opcional
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme === 'Bearer' && token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Ignorar erros de token - continuar sem usuário
    next();
  }
}

export default { authMiddleware, optionalAuthMiddleware };
