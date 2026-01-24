import 'server-only';

/**
 * Static Data Loader
 * Loads interpretation data from static JSON files instead of database
 * This eliminates database transfer costs and improves performance
 */

import { Evaluation, Property, InterpretationTree } from '@/types/interpretation';
import fs from 'fs';
import path from 'path';

// Cache loaded data in memory
let evaluationsCache: Evaluation[] | null = null;
let propertiesCache: Property[] | null = null;
let interpretationsCache: InterpretationTree[] | null = null;

/**
 * Load all evaluations from static data
 */
export function loadEvaluations(): Evaluation[] {
  if (evaluationsCache) {
    return evaluationsCache;
  }
  
  const filePath = path.join(process.cwd(), 'data', 'evaluations.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  evaluationsCache = data as Evaluation[];
  return evaluationsCache;
}

/**
 * Load all properties from static data
 */
export function loadProperties(): Property[] {
  if (propertiesCache) {
    return propertiesCache;
  }
  
  const filePath = path.join(process.cwd(), 'data', 'properties.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  propertiesCache = data as Property[];
  return propertiesCache;
}

/**
 * Load all interpretation trees from static data
 */
export function loadInterpretationTrees(): InterpretationTree[] {
  if (interpretationsCache) {
    return interpretationsCache;
  }
  
  const filePath = path.join(process.cwd(), 'data', 'primary_interpretation_trees.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  interpretationsCache = (data as any[]).map(interp => {
    const parsed = typeof interp.treeStructure === 'string' 
      ? JSON.parse(interp.treeStructure) 
      : interp.treeStructure;
    
    // If treeStructure is the full interpretation object with properties
    if (parsed && typeof parsed === 'object' && 'tree' in parsed) {
      return {
        name: [interp.name],
        tree: parsed.tree || [],
        properties: parsed.properties || [],
        property_count: parsed.property_count || parsed.properties?.length || 0,
        metadata: parsed.metadata || {},
      };
    }
    
    // Otherwise, assume tree is the structure itself
    return {
      name: [interp.name],
      tree: parsed || [],
      properties: [],
      property_count: 0,
      metadata: {},
    };
  });
  
  return interpretationsCache;
}
