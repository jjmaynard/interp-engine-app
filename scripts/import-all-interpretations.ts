/**
 * Import ALL NASIS interpretations from R export
 * 
 * This imports the complete NASIS interpretation database:
 * - 2,113+ complete interpretations
 * - Built from 14,279 interpretation rules
 * - Includes national, state, regional, and specialized interpretations
 * 
 * Run after executing export_all_nasis_interpretations.R
 * 
 * Usage: tsx scripts/import-all-interpretations.ts
 */

import { readFileSync } from 'fs';
import { getDb } from '@/lib/db/client';
import { 
  categories, 
  interpretations, 
  properties,
  interpretationProperties,
  evaluations,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface PropertyData {
  propiid: number;
  propname: string;
  propuom?: string;
}

interface InterpretationTree {
  name: string;
  tree: any[];
  properties: PropertyData[];
  property_count: number;
}

async function importAllInterpretations() {
  const startTime = Date.now();
  console.log('🚀 Starting import of COMPLETE NASIS interpretation database...\n');

  const db = getDb();

  // Load the exported interpretation trees
  const interpData: InterpretationTree[] = JSON.parse(
    readFileSync('../data/primary_interpretation_trees.json', 'utf-8')
  );

  console.log(`📦 Loaded ${interpData.length} PRIMARY interpretations from NASIS export\n`);

  // Create all necessary categories first
  console.log('📁 Creating interpretation categories...\n');
  const categoryMap = await createAllCategories(db);
  console.log(`✅ Created/verified ${categoryMap.size} categories\n`);

  // Statistics
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const errors: { name: string; error: string }[] = [];
  const categoryStats: Record<string, number> = {};

  // Process in batches for better performance with large dataset
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(interpData.length / BATCH_SIZE);

  console.log(`Processing ${interpData.length} interpretations in ${totalBatches} batches...\n`);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, interpData.length);
    const batch = interpData.slice(start, end);
    
    console.log(`📦 Batch ${batchNum + 1}/${totalBatches} (${start + 1}-${end})...`);

    for (const interp of batch) {
      try {
        // Check if already exists
        const existing = await db
          .select({ id: interpretations.id })
          .from(interpretations)
          .where(eq(interpretations.name, interp.name))
          .limit(1);

        if (existing.length > 0) {
          skipCount++;
          continue;
        }

        // Determine category
        const categoryName = getCategoryFromName(interp.name);
        const categoryId = categoryMap.get(categoryName) || categoryMap.get('General')!;

        // Track category statistics
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + 1;

        // Insert interpretation
        const [inserted] = await db
          .insert(interpretations)
          .values({
            interpid: interp.interpid,
            name: interp.name,
            categoryId: categoryId,
            treeStructure: JSON.stringify(interp.tree),
          })
          .returning({ id: interpretations.id });

        if (!inserted) {
          throw new Error('Failed to insert interpretation');
        }

        // Link properties
        let linkedProps = 0;
        for (const prop of interp.properties) {
          const [propertyRecord] = await db
            .select({ id: properties.id })
            .from(properties)
            .where(eq(properties.propname, prop.propname))
            .limit(1);

          if (propertyRecord) {
            await db
              .insert(interpretationProperties)
              .values({
                interpretationId: inserted.id,
                propertyId: propertyRecord.id,
              })
              .onConflictDoNothing();
            linkedProps++;
          }
        }

        successCount++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failCount++;
        errors.push({ name: interp.name, error: errorMsg });
      }
    }

    // Progress update
    const progress = ((end / interpData.length) * 100).toFixed(1);
    console.log(`   Progress: ${progress}% (${successCount} imported, ${skipCount} skipped, ${failCount} failed)\n`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 Import Summary - NASIS Complete Database');
  console.log('='.repeat(70));
  console.log(`Total interpretations in export: ${interpData.length}`);
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Average: ${(interpData.length / parseFloat(duration)).toFixed(1)} interps/sec`);
  console.log('='.repeat(70));

  // Category breakdown
  if (Object.keys(categoryStats).length > 0) {
    console.log('\n📊 Interpretations by Category:');
    const sortedCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20); // Top 20 categories
    
    sortedCategories.forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.floor(count / 10));
      console.log(`  ${cat.padEnd(35)} ${count.toString().padStart(4)} ${bar}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ Failed Interpretations (first 20):');
    errors.slice(0, 20).forEach(e => {
      console.log(`  - ${e.name}`);
      console.log(`    Error: ${e.error}`);
    });
    
    if (errors.length > 20) {
      console.log(`\n  ... and ${errors.length - 20} more failures`);
    }
  }

  console.log('\n✅ Import complete!\n');
  process.exit(0);
}

/**
 * Create all necessary categories for NASIS interpretations
 */
async function createAllCategories(db: any): Promise<Map<string, number>> {
  const categoryDefinitions = [
    { name: 'General', description: 'General interpretations and uncategorized' },
    { name: 'Vegetative Productivity', description: 'Agriculture, forestry, rangeland, and crop production' },
    { name: 'Building Site Development', description: 'Engineering and construction applications' },
    { name: 'Sanitary Facilities', description: 'Septic systems and waste management' },
    { name: 'Construction Materials', description: 'Soil as construction material source' },
    { name: 'Soil Features', description: 'Soil characteristics and soil health' },
    { name: 'Water Management', description: 'Irrigation, drainage, and water structures' },
    { name: 'Recreational Development', description: 'Parks, trails, and recreation facilities' },
    { name: 'Wildlife Habitat', description: 'Wildlife and habitat suitability' },
    { name: 'Conservation Practices', description: 'NRCS conservation practice standards' },
    { name: 'Regional Interpretations', description: 'State and regional specific interpretations' },
    { name: 'Specialized Applications', description: 'Military, BLM, and agency-specific' },
  ];

  const categoryMap = new Map<string, number>();

  for (const cat of categoryDefinitions) {
    const [inserted] = await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing()
      .returning({ id: categories.id, name: categories.name });

    if (inserted) {
      categoryMap.set(inserted.name, inserted.id);
    } else {
      // Category already exists, fetch it
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, cat.name))
        .limit(1);
      
      if (existing) {
        categoryMap.set(cat.name, existing.id);
      }
    }
  }

  return categoryMap;
}

/**
 * Extract category from interpretation name based on comprehensive prefix mapping
 */
function getCategoryFromName(name: string): string {
  // Agriculture, Forestry, Rangeland
  if (name.match(/^(AGR|FOR|GRL|FOTG|CPI|NCCPI|TROP|FSG)-/)) {
    return 'Vegetative Productivity';
  }
  
  // Engineering and Construction
  if (name.match(/^(ENG|URB)-/)) {
    return 'Building Site Development';
  }
  
  // Septic and Waste
  if (name.match(/Septic|Sewage|Lagoon|Waste/i)) {
    return 'Sanitary Facilities';
  }
  
  // Construction Materials
  if (name.match(/Gravel Source|Sand Source|Topsoil|Roadfill|Reclamation/i)) {
    return 'Construction Materials';
  }
  
  // Soil Health and Features
  if (name.match(/^(SOH|CLASSRULE)-/) || name.match(/Soil Health|Carbon|Organic Matter|Compaction/i)) {
    return 'Soil Features';
  }
  
  // Water Management
  if (name.match(/^(WMS|AWM)-/) || name.match(/Irrigation|Drainage|Pond|Reservoir|Embankment/i)) {
    return 'Water Management';
  }
  
  // Recreation
  if (name.match(/^(REC|URB\/REC)-/) || name.match(/Camp|Picnic|Playground|Trail/i)) {
    return 'Recreational Development';
  }
  
  // Wildlife
  if (name.match(/^(WLF|GNB)-/) || name.match(/Wildlife|Habitat|Pollinator/i)) {
    return 'Wildlife Habitat';
  }
  
  // Conservation Practices
  if (name.match(/^(CPS|RTF)-/)) {
    return 'Conservation Practices';
  }
  
  // Specialized/Agency
  if (name.match(/^(MIL|BLM|DHS|SAS|CZSS|NPS)-/)) {
    return 'Specialized Applications';
  }
  
  // State/Regional
  if (name.match(/^(MO|NEIRT|IA|TX|CA|AK|OH|PA|WV|ND|ID|OR|WA|CT|MA|VT|ME|MI|NJ|NY|FL|GA|SC|NC|VA|MD|DE|LA|TN|KY|WI|MN|IL|IN|MT|WY|CO|NM|AZ|UT|NV|KS|NE|SD|OK|AR|MS|AL)-/) || 
      name.match(/\((TX|CA|AK|OH|PA|WV|ND|ID|OR|WA|CT|MA|VT|ME|MI|NJ|NY|FL|GA|SC|NC|VA|MD|DE|LA|TN|KY|WI|MN|IL|IN|MT|WY|CO|NM|AZ|UT|NV|KS|NE|SD|OK|AR|MS|AL)\)$/)) {
    return 'Regional Interpretations';
  }
  
  return 'General';
}

/**
 * Generate meaningful description for interpretation
 */
function generateDescription(interp: InterpretationTree): string {
  const propCount = interp.property_count;
  const name = interp.name;
  
  // Extract state if present
  const stateMatch = name.match(/\(([A-Z]{2})\)$/);
  const state = stateMatch ? stateMatch[1] : null;
  
  // Determine if it's a specialized interpretation
  const specialized = name.match(/^(MIL|BLM|DHS|SAS|DOD|USFS|NPS)-/);
  const draft = name.match(/draft|old|test|alpha|beta/i);
  
  let desc = `NASIS interpretation with ${propCount} ${propCount === 1 ? 'property' : 'properties'}`;
  
  if (state) {
    desc += ` (${state}-specific)`;
  } else if (specialized) {
    desc += ` (${specialized[1]} specialized application)`;
  }
  
  if (draft) {
    desc += ' [DRAFT/TESTING]';
  }
  
  return desc;
}

// Run import
importAllInterpretations().catch(console.error);
