/**
 * Database Migration Script
 * Runs Drizzle migrations to create database schema
 * 
 * Usage: npx tsx scripts/migrate.ts
 */

import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

dotenv.config();

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
  });
  
  const db = drizzle(pool);
  
  try {
    console.log('📦 Running migrations...');
    
    await migrate(db, {
      migrationsFolder: './drizzle',
    });
    
    console.log('✅ Migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
