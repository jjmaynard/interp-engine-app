/**
 * Fix existing interpretations to include properties in treeStructure
 * 
 * This updates all interpretations to store the full object with:
 * - tree
 * - properties  
 * - property_count
 */

import { readFileSync } from 'fs';
import { getDb } from '@/lib/db/client';
import { interpretations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface InterpretationTree {
  name: string;
  tree: any[];
  properties: any[];
  property_count: number;
}

async function fixInterpretations() {
  console.log('🔧 Fixing interpretation data structures...\n');
  
  const db = getDb();
  
  // Load the source data
  const sourceData: InterpretationTree[] = JSON.parse(
    readFileSync('./src/data/interpretation_trees.json', 'utf-8')
  );
  
  console.log(`📦 Loaded ${sourceData.length} interpretations from source file\n`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const interp of sourceData) {
    // Find the interpretation by name
    const [existing] = await db
      .select()
      .from(interpretations)
      .where(eq(interpretations.name, interp.name))
      .limit(1);
    
    if (!existing) {
      notFound++;
      console.log(`⚠️  Not found: ${interp.name}`);
      continue;
    }
    
    // Update with full structure
    await db
      .update(interpretations)
      .set({
        treeStructure: JSON.stringify({
          tree: interp.tree,
          properties: interp.properties,
          property_count: interp.property_count,
        }),
      })
      .where(eq(interpretations.id, existing.id));
    
    updated++;
    
    if (updated % 100 === 0) {
      console.log(`✓ Updated ${updated} interpretations...`);
    }
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log('\n✨ Done!\n');
}

fixInterpretations().catch(console.error);
