import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ===========================================
// Middleware de Validação com Zod
// ===========================================

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Cria um middleware de validação para Express
 * @param schema - Schema Zod para validar
 * @param target - Onde buscar os dados (body, query, params)
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      
      // Substituir dados originais pelos validados/transformados
      req[target] = validated as any;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: 'Erro de validação',
          details: formattedErrors,
        });
      }

      // Erro inesperado
      console.error('Validation middleware error:', error);
      return res.status(500).json({ error: 'Erro interno de validação' });
    }
  };
}

/**
 * Valida body da requisição
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * Valida query params
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * Valida path params
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}

/**
 * Combina múltiplas validações
 */
export function validateAll(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  const middlewares: ((req: Request, res: Response, next: NextFunction) => void)[] = [];

  if (schemas.params) {
    middlewares.push(validate(schemas.params, 'params'));
  }
  if (schemas.query) {
    middlewares.push(validate(schemas.query, 'query'));
  }
  if (schemas.body) {
    middlewares.push(validate(schemas.body, 'body'));
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    for (const middleware of middlewares) {
      const result = await new Promise<boolean>((resolve) => {
        middleware(req, res, (err?: any) => {
          if (err) {
            next(err);
            resolve(false);
          } else if (res.headersSent) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      if (!result) return;
    }
    next();
  };
}

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
};
