/**
 * Data loading utilities for NRCS Interpretation Engine
 * Loads interpretation trees, evaluations, and properties from JSON files
 */

import {
  InterpretationTree,
  Evaluation,
  Property,
  InterpretationSummary
} from '@/types/interpretation';

// Import JSON data files
// Using primary_interpretation_trees.json with complete NASIS database (2,111+ interpretations)
import interpretationTreesData from '@/data/primary_interpretation_trees.json';
import evaluationsData from '@/data/evaluations.json';
import propertiesData from '@/data/properties_enhanced.json';

/**
 * Load all interpretation trees
 */
export function loadInterpretationTrees(): InterpretationTree[] {
  return interpretationTreesData as unknown as InterpretationTree[];
}

/**
 * Load all evaluations
 */
export function loadEvaluations(): Evaluation[] {
  return evaluationsData as Evaluation[];
}

/**
 * Load all properties
 */
export function loadProperties(): Property[] {
  return propertiesData as unknown as Property[];
}

/**
 * Get a specific interpretation by name
 * @param name The name of the interpretation (case-sensitive)
 * @returns The interpretation tree or null if not found
 */
export function getInterpretationByName(name: string): InterpretationTree | null {
  const trees = loadInterpretationTrees();
  return trees.find(t => t.rulename === name) || null;
}

/**
 * Get all interpretation names
 * @returns Array of interpretation names
 */
export function getInterpretationNames(): string[] {
  const trees = loadInterpretationTrees();
  return trees.map(t => t.rulename);
}

/**
 * Get summary information for all interpretations
 * @returns Array of interpretation summaries
 */
export function getInterpretationSummaries(): InterpretationSummary[] {
  const trees = loadInterpretationTrees();
  return trees.map(interp => ({
    name: interp.rulename,
    propertyCount: interp.property_count || interp.properties?.length || 0,
    hasProperties: (interp.property_count || interp.properties?.length || 0) > 0
  }));
}

/**
 * Get evaluation by ID
 * @param evaliid Evaluation ID
 * @returns The evaluation or null if not found
 */
export function getEvaluationById(evaliid: number): Evaluation | null {
  const evaluations = loadEvaluations();
  return evaluations.find(e => e.evaliid === evaliid) || null;
}

/**
 * Get evaluation by name
 * @param name Evaluation name
 * @returns The evaluation or null if not found
 */
export function getEvaluationByName(name: string): Evaluation | null {
  const evaluations = loadEvaluations();
  return evaluations.find(e => e.evalname === name) || null;
}

/**
 * Get evaluations for a specific property
 * @param propertyName Property name
 * @returns Array of evaluations for the property
 */
export function getEvaluationsByProperty(propertyName: string): Evaluation[] {
  const evaluations = loadEvaluations();
  return evaluations.filter(e => e.propname === propertyName);
}

/**
 * Get property by ID
 * @param propiid Property ID
 * @returns The property or null if not found
 */
export function getPropertyById(propiid: number): Property | null {
  const properties = loadProperties();
  return properties.find(p => p.propiid === propiid) || null;
}

/**
 * Get property by name
 * @param name Property name
 * @returns The property or null if not found
 */
export function getPropertyByName(name: string): Property | null {
  const properties = loadProperties();
  return properties.find(p => p.propname === name) || null;
}

/**
 * Validate that required data files are present and valid
 * @returns Object with validation results
 */
export function validateDataFiles(): {
  valid: boolean;
  errors: string[];
  stats: {
    interpretations: number;
    evaluations: number;
    properties: number;
  };
} {
  const errors: string[] = [];
  
  try {
    const trees = loadInterpretationTrees();
    const evaluations = loadEvaluations();
    const properties = loadProperties();
    
    if (!Array.isArray(trees)) {
      errors.push('Interpretation trees data is not an array');
    }
    if (!Array.isArray(evaluations)) {
      errors.push('Evaluations data is not an array');
    }
    if (!Array.isArray(properties)) {
      errors.push('Properties data is not an array');
    }
    
    if (trees.length === 0) {
      errors.push('No interpretation trees found');
    }
    if (evaluations.length === 0) {
      errors.push('No evaluations found');
    }
    if (properties.length === 0) {
      errors.push('No properties found');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      stats: {
        interpretations: trees.length,
        evaluations: evaluations.length,
        properties: properties.length
      }
    };
  } catch (error) {
    errors.push(`Failed to load data files: ${error}`);
    return {
      valid: false,
      errors,
      stats: {
        interpretations: 0,
        evaluations: 0,
        properties: 0
      }
    };
  }
}
