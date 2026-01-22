/**
 * Database Client with Connection Pooling
 * Provides singleton database connection for the application
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Global database connection pool
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    console.log('Database connection pool created');
  }

  return pool;
}

/**
 * Get or create Drizzle database instance
 */
export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

/**
 * Close database connection pool
 * Should be called during application shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('Database connection pool closed');
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Execute raw SQL query (use sparingly, prefer Drizzle ORM)
 */
export async function executeRawQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(query, params);
  return result.rows;
}

// Export schema for use in queries
export { schema };
