/**
 * Data Import Script
 * Migrates JSON data files to PostgreSQL database
 * 
 * Usage: npx tsx scripts/import-data.ts
 */

import * as dotenv from 'dotenv';
import { getDb, getPool, testConnection, closePool } from '../src/lib/db/client';
import { 
  categories, 
  interpretations, 
  properties, 
  evaluations,
  interpretationProperties,
  interpretationEvaluations,
} from '../src/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Import JSON data
const dataDir = path.join(__dirname, '../data');

interface JSONInterpretation {
  name: string[];
  tree: any[];
  properties?: any[];
}

interface JSONEvaluation {
  evaliid: number;
  evalname: string;
  evaldesc?: string;
  evaluationtype: string;
  invertevaluationresults?: boolean;
  propname: string;
  propmod: string;
  evalxml?: string;
  points?: any[];
  interpolation?: string;
  crispExpression?: string;
}

interface JSONProperty {
  propiid: string;
  propname: string;
  propuom?: string;
  propmin?: number;
  propmax?: number;
  propmod: string;
  dataafuse?: boolean;
}

async function loadJSONFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function importCategories(db: ReturnType<typeof getDb>) {
  console.log('\n📁 Importing categories...');
  
  // Load interpretation category summary
  const categoryData = await loadJSONFile<any[]>('interpretation_category_summary.csv');
  
  const categoryMap = new Map<string, number>();
  const uniqueCategories = new Set<string>();
  
  // Extract unique categories from the data
  // Note: This assumes your CSV has been converted to JSON
  // Adjust based on your actual data structure
  const categoriesToInsert = [
    { name: 'Vegetative Productivity', description: 'Interpretations related to plant growth and productivity' },
    { name: 'Building Site Development', description: 'Interpretations for construction and development' },
    { name: 'Sanitary Facilities', description: 'Interpretations for waste management systems' },
    { name: 'Construction Materials', description: 'Interpretations for soil as construction material' },
    { name: 'Soil Features', description: 'Interpretations related to soil characteristics' },
    { name: 'Water Management', description: 'Interpretations for water and irrigation' },
    { name: 'Recreational Development', description: 'Interpretations for recreation facilities' },
    { name: 'Wildlife Habitat', description: 'Interpretations for wildlife and habitat' },
  ];
  
  for (const cat of categoriesToInsert) {
    const [inserted] = await db
      .insert(categories)
      .values(cat)
      .returning({ id: categories.id });
    
    categoryMap.set(cat.name, inserted.id);
    uniqueCategories.add(cat.name);
  }
  
  console.log(`✅ Imported ${uniqueCategories.size} categories`);
  return categoryMap;
}

async function importProperties(db: ReturnType<typeof getDb>) {
  console.log('\n🏗️  Importing properties...');
  
  const propertiesData = await loadJSONFile<JSONProperty[]>('properties.json');
  
  let imported = 0;
  let skipped = 0;
  
  for (const prop of propertiesData) {
    try {
      await db
        .insert(properties)
        .values({
          propiid: prop.propiid,
          propname: prop.propname,
          propuom: prop.propuom || null,
          propmin: prop.propmin?.toString() || null,
          propmax: prop.propmax?.toString() || null,
          propmod: prop.propmod || '',
          dataafuse: prop.dataafuse || false,
        })
        .onConflictDoNothing();
      
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`  Imported ${imported} properties...`);
      }
    } catch (error) {
      skipped++;
      console.error(`  Error importing property ${prop.propname}:`, error);
    }
  }
  
  console.log(`✅ Imported ${imported} properties (${skipped} skipped)`);
}

async function importEvaluations(db: ReturnType<typeof getDb>) {
  console.log('\n📊 Importing evaluations...');
  
  const evaluationsData = await loadJSONFile<JSONEvaluation[]>('evaluations.json');
  
  let imported = 0;
  let skipped = 0;
  
  for (const evaluation of evaluationsData) {
    try {
      await db
        .insert(evaluations)
        .values({
          evaliid: evaluation.evaliid,
          evalname: evaluation.evalname,
          evaldesc: evaluation.evaldesc || null,
          evaluationtype: evaluation.evaluationtype,
          invertevaluationresults: evaluation.invertevaluationresults || false,
          propname: evaluation.propname,
          propmod: evaluation.propmod || '',
          evalxml: evaluation.evalxml || null,
          points: evaluation.points ? JSON.stringify(evaluation.points) : null,
          interpolation: evaluation.interpolation || null,
          crispExpression: evaluation.crispExpression || null,
        })
        .onConflictDoNothing();
      
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`  Imported ${imported} evaluations...`);
      }
    } catch (error) {
      skipped++;
      console.error(`  Error importing evaluation ${evaluation.evalname}:`, error);
    }
  }
  
  console.log(`✅ Imported ${imported} evaluations (${skipped} skipped)`);
}

async function importInterpretations(
  db: ReturnType<typeof getDb>,
  categoryMap: Map<string, number>
) {
  console.log('\n🌳 Importing interpretations...');
  
  const interpretationsData = await loadJSONFile<JSONInterpretation[]>('interpretation_trees.json');
  
  let imported = 0;
  let skipped = 0;
  
  for (const interp of interpretationsData) {
    try {
      const interpName = Array.isArray(interp.name) ? interp.name[0] : interp.name;
      
      // Default to first category if we can't determine the specific one
      const defaultCategoryId = categoryMap.values().next().value || 1;
      
      const [inserted] = await db
        .insert(interpretations)
        .values({
          interpid: imported + 1, // Generate sequential ID
          name: interpName,
          categoryId: defaultCategoryId,
          treeStructure: JSON.stringify(interp.tree),
        })
        .returning({ id: interpretations.id });
      
      // Link properties if available
      if (interp.properties && Array.isArray(interp.properties)) {
        for (const prop of interp.properties) {
          const propName = typeof prop === 'string' ? prop : prop.propname;
          
          // Find property ID by name
          const [propertyRecord] = await db
            .select({ id: properties.id })
            .from(properties)
            .where((t) => t.propname === propName)
            .limit(1);
          
          if (propertyRecord) {
            await db
              .insert(interpretationProperties)
              .values({
                interpretationId: inserted.id,
                propertyId: propertyRecord.id,
                required: true,
              })
              .onConflictDoNothing();
          }
        }
      }
      
      imported++;
      console.log(`  Imported: ${interpName}`);
      
    } catch (error) {
      skipped++;
      console.error(`  Error importing interpretation:`, error);
    }
  }
  
  console.log(`✅ Imported ${imported} interpretations (${skipped} skipped)`);
}

async function main() {
  console.log('🚀 Starting data import...\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
  
  const db = getDb();
  
  try {
    // Import in correct order (respecting foreign keys)
    const categoryMap = await importCategories(db);
    await importProperties(db);
    await importEvaluations(db);
    await importInterpretations(db, categoryMap);
    
    console.log('\n✅ Data import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Data import failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run import
main();
