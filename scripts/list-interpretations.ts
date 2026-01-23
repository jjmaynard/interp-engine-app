/**
 * List all interpretations with property counts
 * Run with: npx tsx scripts/list-interpretations.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { getDb } from '../src/lib/db/client';
import { interpretations, interpretationProperties } from '../src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const db = getDb();

async function listInterpretations() {
  console.log('\n📋 All Interpretations:\n');

  const interps = await db
    .select({
      id: interpretations.id,
      interpid: interpretations.interpid,
      name: interpretations.name,
      propCount: sql<number>`count(distinct ${interpretationProperties.propertyId})`,
    })
    .from(interpretations)
    .leftJoin(
      interpretationProperties,
      eq(interpretations.id, interpretationProperties.interpretationId)
    )
    .groupBy(interpretations.id, interpretations.interpid, interpretations.name)
    .orderBy(interpretations.name)
    .limit(50);

  interps.forEach((interp, idx) => {
    console.log(`${idx + 1}. ${interp.name}`);
    console.log(`   interpid: ${interp.interpid}`);
    console.log(`   Properties: ${interp.propCount}`);
    console.log('');
  });

  console.log(`\nTotal: ${interps.length} interpretations\n`);
}

listInterpretations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
