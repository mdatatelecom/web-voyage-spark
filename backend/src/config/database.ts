import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Se não tiver DATABASE_URL, usar variáveis individuais
if (!process.env.DATABASE_URL) {
  Object.assign(poolConfig, {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'datacenter',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD,
  });
}

export const pool = new Pool(poolConfig);

// Função helper para queries
export async function query<T = any>(
  text: string, 
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production' && duration > 100) {
      console.log('Slow query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transação helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Testar conexão
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export default { pool, query, transaction, testConnection };
