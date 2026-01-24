/**
 * Property utility functions
 * Helper functions for working with soil properties
 */

import type { Property, Evaluation } from '@/types/interpretation';

/**
 * Check if a property is categorical (choice-based) rather than numeric
 * Categorical properties typically don't have a unit of measure
 */
export function isCategoricalProperty(property: Property): boolean {
  const uom = property.propuom?.toLowerCase().trim();
  
  // No unit of measure = categorical
  if (!uom || uom === '' || uom === 'null') {
    return true;
  }
  
  // Explicit categorical units
  if (uom === 'code' || uom === 'choice' || uom === 'class') {
    return true;
  }
  
  // Has a numeric unit = not categorical
  return false;
}

/**
 * Extract valid choice values from evaluations for a categorical property
 * Parses crisp expressions like ="value" to get the valid choices
 */
export function extractChoicesFromEvaluations(
  propertyName: string,
  evaluations: Evaluation[]
): string[] {
  const choices = new Set<string>();
  
  // Find evaluations that use this property
  const propertyEvals = evaluations.filter(
    e => e.propname === propertyName && e.crispExpression
  );
  
  for (const evaluation of propertyEvals) {
    if (!evaluation.crispExpression) continue;
    
    const expr = evaluation.crispExpression.trim();
    
    // Match simple equality: ="value"
    const simpleMatch = expr.match(/^=\s*"([^"]+)"$/);
    if (simpleMatch) {
      choices.add(simpleMatch[1]);
      continue;
    }
    
    // Match OR expressions: = "value1" or "value2"
    const orMatch = expr.match(/^=\s*"([^"]+)"\s+or\s+"([^"]+)"$/);
    if (orMatch) {
      choices.add(orMatch[1]);
      choices.add(orMatch[2]);
      continue;
    }
    
    // Match complex OR with multiple values
    const allMatches = expr.matchAll(/"([^"]+)"/g);
    for (const match of allMatches) {
      choices.add(match[1]);
    }
  }
  
  return Array.from(choices).sort();
}

/**
 * Enhance a property with categorical metadata
 * Adds isCategorical flag and choice values if applicable
 */
export function enhanceProperty(
  property: Property,
  evaluations: Evaluation[]
): Property {
  const isCat = isCategoricalProperty(property);
  
  if (isCat) {
    const choices = extractChoicesFromEvaluations(property.propname, evaluations);
    return {
      ...property,
      isCategorical: true,
      choices: choices.length > 0 ? choices : undefined,
    };
  }
  
  return {
    ...property,
    isCategorical: false,
  };
}

/**
 * Enhance multiple properties with categorical metadata
 */
export function enhanceProperties(
  properties: Property[],
  evaluations: Evaluation[]
): Property[] {
  return properties.map(prop => enhanceProperty(prop, evaluations));
}
