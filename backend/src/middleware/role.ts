import { Request, Response, NextFunction } from 'express';

type Role = 'admin' | 'technician' | 'viewer' | 'network_viewer';

// Middleware para verificar role específica
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Requer uma das seguintes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// Middleware para admin apenas
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  next();
}

// Middleware para admin ou técnico
export function requireTechnician(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const roles = req.user.roles || [];
  if (!roles.includes('admin') && !roles.includes('technician')) {
    return res.status(403).json({ error: 'Acesso restrito a administradores e técnicos' });
  }

  next();
}

// Middleware para viewer (qualquer autenticado)
export function requireViewer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  next();
}

// Verificar se usuário tem role
export function hasRole(user: { roles?: string[] } | undefined, role: Role): boolean {
  return user?.roles?.includes(role) ?? false;
}

// Verificar se usuário é admin
export function isAdmin(user: { roles?: string[] } | undefined): boolean {
  return hasRole(user, 'admin');
}

// Verificar se usuário pode gerenciar (admin ou technician)
export function canManage(user: { roles?: string[] } | undefined): boolean {
  return hasRole(user, 'admin') || hasRole(user, 'technician');
}

export default { 
  requireRole, 
  requireAdmin, 
  requireTechnician, 
  requireViewer,
  hasRole,
  isAdmin,
  canManage
};
