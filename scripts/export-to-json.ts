/**
 * Export Database to JSON Files
 * Exports updated evaluation data to static JSON files
 * 
 * Usage: npx tsx scripts/export-to-json.ts
 */

import * as dotenv from 'dotenv';
import { getDb, testConnection, closePool } from '../src/lib/db/client';
import { evaluations, properties, interpretations } from '../src/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const dataDir = path.join(__dirname, '../data');

async function exportToJSON() {
  console.log('🚀 Exporting database to JSON files...\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const db = getDb();
  
  try {
    // Export evaluations
    console.log('📊 Exporting evaluations...');
    const evalData = await db.select().from(evaluations);
    fs.writeFileSync(
      path.join(dataDir, 'evaluations.json'),
      JSON.stringify(evalData, null, 2)
    );
    console.log(`✅ Exported ${evalData.length} evaluations`);
    
    // Export properties
    console.log('📊 Exporting properties...');
    const propData = await db.select().from(properties);
    fs.writeFileSync(
      path.join(dataDir, 'properties.json'),
      JSON.stringify(propData, null, 2)
    );
    console.log(`✅ Exported ${propData.length} properties`);
    
    // Export interpretations
    console.log('📊 Exporting interpretations...');
    const interpData = await db.select().from(interpretations);
    fs.writeFileSync(
      path.join(dataDir, 'interpretation_trees.json'),
      JSON.stringify(interpData, null, 2)
    );
    console.log(`✅ Exported ${interpData.length} interpretations`);
    
    console.log('\n✅ Export completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

exportToJSON();
