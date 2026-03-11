import 'server-only';

/**
 * Static Data Loader
 * Loads interpretation data from static JSON files instead of database
 * This eliminates database transfer costs and improves performance
 */

import { Evaluation, Property, InterpretationTree } from '@/types/interpretation';
import {
  loadEvaluationsServer,
  loadInterpretationTreesServer,
  loadPropertiesServer,
} from '@/lib/data/server-loader';

/**
 * Load all evaluations from static data
 */
export function loadEvaluations(): Evaluation[] {
  return loadEvaluationsServer();
}

/**
 * Load all properties from static data
 */
export function loadProperties(): Property[] {
  return loadPropertiesServer();
}

/**
 * Load all interpretation trees from static data
 * Enriches properties array with propname and evaluation fields
 */
export function loadInterpretationTrees(): InterpretationTree[] {
  const data = loadInterpretationTreesServer();
  
  // Load properties and evaluations for enrichment
  const allProperties = loadProperties();
  const allEvaluations = loadEvaluations();
  
  // Create lookup maps
  const propMap = new Map(allProperties.map(p => [String(p.propiid), p]));
  const evalByPropId = new Map<string, Evaluation[]>();
  allEvaluations.forEach(e => {
    const propId = String(e.propiid);
    if (!evalByPropId.has(propId)) {
      evalByPropId.set(propId, []);
    }
    evalByPropId.get(propId)!.push(e);
  });
  
  // Enrich each interpretation's properties array
  const enriched = data.map((interp: any) => {
    if (interp.properties && Array.isArray(interp.properties)) {
      interp.properties = interp.properties.map((prop: any) => {
        const propId = String(prop.propiid);
        const propDef = propMap.get(propId);
        const evals = evalByPropId.get(propId) || [];
        
        return {
          propiid: propId,
          propname: propDef?.propname || 'Unknown Property',
          evaluation: evals.length > 0 ? evals[0].evalname : undefined
        };
      });
    }
    return interp;
  });
  
  return enriched as InterpretationTree[];
}
