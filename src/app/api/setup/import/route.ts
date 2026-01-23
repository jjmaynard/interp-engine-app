/**
 * One-time Database Import API
 * 
 * Call this endpoint once after deployment to import data
 * DELETE THIS FILE after successful import for security
 * 
 * Imports PRIMARY interpretations only (primaryinterp: true from NASIS)
 * Component rules are included automatically in the interpretation trees
 * 
 * Usage: POST https://your-app.vercel.app/api/setup/import
 * Or visit in browser: GET https://your-app.vercel.app/api/setup/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { 
  categories, 
  interpretations, 
  properties, 
  evaluations,
  interpretationProperties,
} from '@/lib/db/schema';

// Import data from JSON files
import interpretationTreesData from '@/data/primary_interpretation_trees.json';
import evaluationsData from '@/data/evaluations.json';
import propertiesData from '@/data/properties.json';

export const maxDuration = 300; // 5 minutes for import

export async function GET(request: NextRequest) {
  return runImport();
}

export async function POST(request: NextRequest) {
  return runImport();
}

async function runImport() {
  const startTime = Date.now();
  const log: string[] = [];

  try {
    const db = getDb();

    // 1. Import Categories
    log.push('📁 Importing categories...');
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
    
    const categoryMap = new Map<string, number>();
    for (const cat of categoriesToInsert) {
      const [inserted] = await db
        .insert(categories)
        .values(cat)
        .onConflictDoNothing()
        .returning({ id: categories.id });
      
      if (inserted) {
        categoryMap.set(cat.name, inserted.id);
      }
    }
    log.push(`✅ Imported ${categoryMap.size} categories`);

    // 2. Import Properties (chunked for performance)
    log.push('🏗️  Importing properties...');
    const chunkSize = 100;
    let propertiesImported = 0;
    
    for (let i = 0; i < propertiesData.length; i += chunkSize) {
      const chunk = propertiesData.slice(i, i + chunkSize);
      
      const values = chunk.map((prop: any) => ({
        propiid: prop.propiid,
        propname: prop.propname,
        propuom: prop.propuom || null,
        propmin: prop.propmin?.toString() || null,
        propmax: prop.propmax?.toString() || null,
        propmod: prop.propmod || '',
        dataafuse: prop.dataafuse || false,
      }));
      
      await db.insert(properties).values(values).onConflictDoNothing();
      propertiesImported += chunk.length;
      
      if (i % 1000 === 0 && i > 0) {
        log.push(`  Progress: ${i} properties...`);
      }
    }
    log.push(`✅ Imported ${propertiesImported} properties`);

    // 3. Import Evaluations (chunked)
    log.push('📊 Importing evaluations...');
    let evaluationsImported = 0;
    
    for (let i = 0; i < evaluationsData.length; i += chunkSize) {
      const chunk = evaluationsData.slice(i, i + chunkSize);
      
      const values = chunk.map((evaluation: any) => ({
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
      }));
      
      await db.insert(evaluations).values(values).onConflictDoNothing();
      evaluationsImported += chunk.length;
      
      if (i % 1000 === 0 && i > 0) {
        log.push(`  Progress: ${i} evaluations...`);
      }
    }
    log.push(`✅ Imported ${evaluationsImported} evaluations`);

    // 4. Import Interpretations
    log.push('🌳 Importing interpretations...');
    let interpretationsImported = 0;
    const defaultCategoryId = categoryMap.values().next().value || 1;
    
    for (const interp of interpretationTreesData as any[]) {
      const interpName = Array.isArray(interp.name) ? interp.name[0] : interp.name;
      
      const [inserted] = await db
        .insert(interpretations)
        .values({
          interpid: interpretationsImported + 1,
          name: interpName,
          categoryId: defaultCategoryId,
          treeStructure: JSON.stringify(interp.tree),
        })
        .onConflictDoNothing()
        .returning({ id: interpretations.id });
      
      if (inserted && interp.properties && Array.isArray(interp.properties)) {
        for (const prop of interp.properties) {
          const propName = typeof prop === 'string' ? prop : prop.propname;
          
          const [propertyRecord] = await db
            .select({ id: properties.id })
            .from(properties)
            .where(eq(properties.propname, propName))
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
      
      interpretationsImported++;
    }
    log.push(`✅ Imported ${interpretationsImported} interpretations`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.push(`\n✅ Import completed in ${duration}s`);
    log.push('\n⚠️  IMPORTANT: Delete /api/setup/import/route.ts for security!');

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      summary: {
        categories: categoryMap.size,
        properties: propertiesImported,
        evaluations: evaluationsImported,
        interpretations: interpretationsImported,
      },
      log,
    });

  } catch (error) {
    console.error('Import failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      log,
    }, { status: 500 });
  }
}
