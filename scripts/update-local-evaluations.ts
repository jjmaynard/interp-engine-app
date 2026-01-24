/**
 * Update Local Evaluations File
 * Parses XML from evaluations.json and updates the file with crisp expressions and points
 * 
 * Usage: npx tsx scripts/update-local-evaluations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(__dirname, '../data');

/**
 * Parse XML evaluation data and extract DomainPoints, RangePoints, and CrispExpression
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
    // Extract DomainPoints, RangePoints, and CrispExpression
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

async function updateLocalEvaluations() {
  console.log('🚀 Updating local evaluations.json with parsed XML data...\n');
  
  try {
    // Load evaluations data
    const filePath = path.join(dataDir, 'evaluations.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const evaluationsData = JSON.parse(content);
    
    console.log(`📊 Found ${evaluationsData.length} evaluations to process\n`);
    
    let updated = 0;
    let withPoints = 0;
    let withCrispExpr = 0;
    
    for (const evaluation of evaluationsData) {
      // Parse the XML to extract points and crisp expression
      const { points, crispExpression } = evaluation.eval 
        ? parseEvaluationXML(evaluation.eval, evaluation.evaluationtype)
        : { points: null, crispExpression: null };
      
      if (points && points.length > 0) {
        withPoints++;
      }
      
      if (crispExpression) {
        withCrispExpr++;
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

      // Update the evaluation object
      evaluation.points = points;
      evaluation.interpolation = interpolation;
      evaluation.crispExpression = crispExpression;
      
      updated++;
      
      if (updated % 1000 === 0) {
        console.log(`  Processed ${updated} evaluations...`);
      }
    }
    
    // Write updated data back to file
    console.log('\n📝 Writing updated data to file...');
    fs.writeFileSync(filePath, JSON.stringify(evaluationsData, null, 2));
    
    console.log(`\n✅ Update completed!`);
    console.log(`   Total processed: ${updated} evaluations`);
    console.log(`   With fuzzy curves: ${withPoints}`);
    console.log(`   With crisp expressions: ${withCrispExpr}`);
    
  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

// Run update
updateLocalEvaluations();
