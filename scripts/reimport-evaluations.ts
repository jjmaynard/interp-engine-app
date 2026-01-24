/**
 * Re-import Evaluations Script
 * Updates evaluations with parsed XML points data
 * 
 * Usage: npx tsx scripts/reimport-evaluations.ts
 */

import * as dotenv from 'dotenv';
import { getDb, getPool, testConnection, closePool } from '../src/lib/db/client';
import { evaluations } from '../src/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';

dotenv.config();

const dataDir = path.join(__dirname, '../../data');

/**
 * Parse XML evaluation data and extract DomainPoints and RangePoints
 */
function parseEvaluationXML(
  xmlString: string, 
  evaluationType?: string
): { 
  points: { x: number, y: number }[] | null,
  crispExpression: string | null 
} {
  if (!xmlString) {
    return { points: null, crispExpression: null };
  }

  try {
    // Extract DomainPoints
    const domainMatch = xmlString.match(/<DomainPoints>([\s\S]*?)<\/DomainPoints>/);
    const rangeMatch = xmlString.match(/<RangePoints>([\s\S]*?)<\/RangePoints>/);
    const crispMatch = xmlString.match(/<CrispExpression>([\s\S]*?)<\/CrispExpression>/);

    // Parse crisp expression if present
    const crispExpression = crispMatch ? crispMatch[1].trim() : null;

    // Parse domain and range points if both exist
    if (domainMatch) {
      const domainContent = domainMatch[1];
      const rangeContent = rangeMatch ? rangeMatch[1] : '';

      // Extract double values
      const domainValues = Array.from(domainContent.matchAll(/<double>(.*?)<\/double>/g))
        .map(m => parseFloat(m[1]));
      const rangeValues = Array.from(rangeContent.matchAll(/<double>(.*?)<\/double>/g))
        .map(m => parseFloat(m[1]));

      // Special handling for Sigmoid curves with empty RangePoints
      // Sigmoid curves implicitly go from 0 to 1
      if (domainValues.length > 0 && rangeValues.length === 0 && 
          evaluationType?.toLowerCase() === 'sigmoid') {
        const points = domainValues.map((x, i) => ({
          x: x,
          y: i / (domainValues.length - 1) // Distribute evenly from 0 to 1
        }));
        return { points, crispExpression };
      }

      // Create points array if we have matching domain and range values
      if (domainValues.length > 0 && domainValues.length === rangeValues.length) {
        const points = domainValues.map((x, i) => ({
          x: x,
          y: rangeValues[i]
        }));
        return { points, crispExpression };
      }
    }

    return { points: null, crispExpression };
  } catch (error) {
    console.error('Error parsing evaluation XML:', error);
    return { points: null, crispExpression: null };
  }
}

async function reimportEvaluations() {
  console.log('🚀 Re-importing evaluations with parsed XML data...\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const db = getDb();
  
  try {
    // Load evaluations data
    const filePath = path.join(dataDir, 'evaluations.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const evaluationsData = JSON.parse(content);
    
    console.log(`📊 Found ${evaluationsData.length} evaluations to process\n`);
    
    let updated = 0;
    let skipped = 0;
    let parsedPoints = 0;
    let errors = 0;
    
    for (const evaluation of evaluationsData) {
      try {
        // Parse the XML to extract points and crisp expression
        const { points, crispExpression } = evaluation.eval 
          ? parseEvaluationXML(evaluation.eval, evaluation.evaluationtype)
          : { points: null, crispExpression: null };

        if (points && points.length > 0) {
          parsedPoints++;
        }

        // Determine interpolation type based on evaluation type
        let interpolation: string | null = null;
        if (points && points.length > 0) {
          const evalType = evaluation.evaluationtype?.toLowerCase();
          switch (evalType) {
            case 'arbitrarycurve':
              interpolation = 'spline';
              break;
            case 'arbitrarylinear':
            case 'linear':
              interpolation = 'linear';
              break;
            case 'sigmoid':
              interpolation = 'sigmoid';
              break;
            case 'trapezoid':
            case 'triangle':
              interpolation = 'linear';
              break;
            default:
              interpolation = 'linear';
          }
        }

        // Update the evaluation
        const result = await db
          .update(evaluations)
          .set({
            evalxml: evaluation.eval || null,
            points: points ? JSON.stringify(points) : null,
            interpolation: interpolation,
            crispExpression: crispExpression,
          })
          .where(eq(evaluations.evaliid, evaluation.evaliid))
          .returning({ evaliid: evaluations.evaliid });

        if (result.length > 0) {
          updated++;
        } else {
          skipped++;
        }
        
        if (updated % 500 === 0) {
          console.log(`  Updated ${updated} evaluations (${parsedPoints} with points)...`);
        }
      } catch (error) {
        errors++;
        if (errors < 10) {
          console.error(`  Error updating evaluation ${evaluation.evalname}:`, error);
        }
      }
    }
    
    console.log(`\n✅ Re-import completed!`);
    console.log(`   Updated: ${updated} evaluations`);
    console.log(`   With fuzzy curves: ${parsedPoints}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('\n❌ Re-import failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run re-import
reimportEvaluations();
