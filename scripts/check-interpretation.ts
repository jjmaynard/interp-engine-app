/**
 * Diagnostic script to check interpretation data integrity
 * Run with: npx tsx scripts/check-interpretation.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { getDb } from '../src/lib/db/client';
import { interpretations, evaluations, properties, interpretationProperties } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const db = getDb();

async function checkInterpretation(interpName: string) {
  console.log(`\n🔍 Checking interpretation: ${interpName}\n`);

  // 1. Get the interpretation
  const interp = await db
    .select()
    .from(interpretations)
    .where(eq(interpretations.name, interpName))
    .limit(1);

  if (interp.length === 0) {
    console.error('❌ Interpretation not found in database');
    return;
  }

  console.log('✅ Interpretation found:');
  console.log(`   ID: ${interp[0].id}`);
  console.log(`   interpid: ${interp[0].interpid}`);
  console.log(`   Name: ${interp[0].name}`);

  // 2. Get associated properties via junction table
  const interpProps = await db
    .select({
      propname: properties.propname,
      propiid: properties.propiid,
      propuom: properties.propuom,
      propmin: properties.propmin,
      propmax: properties.propmax,
    })
    .from(interpretationProperties)
    .innerJoin(properties, eq(interpretationProperties.propertyId, properties.id))
    .where(eq(interpretationProperties.interpretationId, interp[0].id));

  console.log(`\n📊 Properties from junction table: ${interpProps.length}`);
  if (interpProps.length > 0) {
    console.log('   First 5 properties:');
    interpProps.slice(0, 5).forEach(p => {
      console.log(`   - ${p.propname} (${p.propiid})`);
    });
  }

  // 3. Get the rule tree from the treeStructure JSON field
  const treeStructure = interp[0].treeStructure as any;
  const ruleTree = Array.isArray(treeStructure) ? treeStructure : [];

  console.log(`\n🌳 Rule tree nodes: ${ruleTree.length}`);
  if (ruleTree.length > 0) {
    console.log('   First 10 rules:');
    ruleTree.slice(0, 10).forEach((r: any, idx: number) => {
      console.log(`   ${idx}: ${r.levelName || 'N/A'} | RefId: ${r.RefId || r.rule_refid || 'none'} | Type: ${r.Type || 'none'}`);
    });
  } else {
    console.log('   ⚠️  No rules found!');
  }

  // 4. Find evaluation references in the tree
  const evalRefs = ruleTree
    .filter((r: any) => r.RefId || r.rule_refid)
    .map((r: any) => r.RefId || r.rule_refid)
    .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i); // unique

  console.log(`\n🔗 Unique evaluation references in tree: ${evalRefs.length}`);
  if (evalRefs.length > 0) {
    console.log('   Evaluation IDs:');
    evalRefs.slice(0, 10).forEach(ref => {
      console.log(`   - ${ref}`);
    });
  }

  // 5. Check if those evaluations exist
  if (evalRefs.length > 0) {
    const evals = await db
      .select({
        evaliid: evaluations.evaliid,
        evalname: evaluations.evalname,
        propname: evaluations.propname,
      })
      .from(evaluations)
      .where(eq(evaluations.evaliid, evalRefs[0]));

    console.log(`\n📋 Checking first evaluation (${evalRefs[0]}):`);
    if (evals.length > 0) {
      console.log(`   ✅ Found: ${evals[0].evalname}`);
      console.log(`   Property Name: ${evals[0].propname}`);
      
      // Check the property
      if (evals[0].propname) {
        const prop = await db
          .select()
          .from(properties)
          .where(eq(properties.propname, evals[0].propname))
          .limit(1);
        
        if (prop.length > 0) {
          console.log(`   ✅ Property exists: ${prop[0].propname}`);
        } else {
          console.log(`   ❌ Property not found for propname: ${evals[0].propname}`);
        }
      }
    } else {
      console.log(`   ❌ Evaluation not found!`);
    }
  }

  // 6. Summary
  console.log('\n📝 SUMMARY:');
  console.log(`   Interpretation exists: ✅`);
  console.log(`   Properties in junction table: ${interpProps.length}`);
  console.log(`   Rules in tree: ${ruleTree.length}`);
  console.log(`   Evaluation references: ${evalRefs.length}`);
  console.log(`   Status: ${interpProps.length > 0 && ruleTree.length > 0 ? '✅ OK' : '⚠️  INCOMPLETE'}`);

  if (interpProps.length === 0) {
    console.log('\n⚠️  No properties linked in interpretation_properties table!');
  }
  if (ruleTree.length === 0) {
    console.log('\n⚠️  No rule tree data!');
  }
  if (evalRefs.length === 0) {
    console.log('\n⚠️  No evaluation references in tree!');
  }
}

// Run the check
const interpName = process.argv[2] || 'AWM - Manure and Food Processing Waste (DE)';
checkInterpretation(interpName)
  .then(() => {
    console.log('\n✅ Check complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
