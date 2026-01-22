/**
 * Database-backed Data Loader
 * Replaces JSON file loaders with database queries
 */

import {
  getAllInterpretations,
  getAllEvaluations,
  getAllProperties,
  getInterpretationByName,
  getEvaluationByName,
  getPropertyByName,
} from '../db/queries';
import type { InterpretationTree, Evaluation, Property } from '@/types/interpretation';

/**
 * Load all interpretation trees from database
 */
export async function loadInterpretationTrees(): Promise<InterpretationTree[]> {
  const results = await getAllInterpretations();
  
  return results.map(result => ({
    name: [result.name], // Wrap in array for compatibility with existing type
    tree: result.treeStructure as any,
    categoryId: result.categoryId,
    categoryName: result.categoryName || undefined,
  }));
}

/**
 * Load all evaluations from database
 */
export async function loadEvaluations(): Promise<Evaluation[]> {
  const results = await getAllEvaluations();
  
  return results.map(eval => ({
    evaliid: eval.evaliid,
    evalname: eval.evalname,
    evaldesc: eval.evaldesc || '',
    evaluationtype: eval.evaluationtype as 'Crisp' | 'Fuzzy' | 'Continuous',
    invertevaluationresults: eval.invertevaluationresults || false,
    propname: eval.propname,
    propmod: eval.propmod || '',
    evalxml: eval.evalxml || undefined,
    points: eval.points || undefined,
    interpolation: eval.interpolation as 'linear' | 'spline' | 'step' | undefined,
    crispExpression: eval.crispExpression || undefined,
  }));
}

/**
 * Load all properties from database
 */
export async function loadProperties(): Promise<Property[]> {
  const results = await getAllProperties();
  
  return results.map(prop => ({
    propiid: prop.propiid,
    propname: prop.propname,
    propuom: prop.propuom || undefined,
    propmin: prop.propmin ? parseFloat(prop.propmin) : undefined,
    propmax: prop.propmax ? parseFloat(prop.propmax) : undefined,
    propmod: prop.propmod || '',
    dataafuse: prop.dataafuse || false,
  }));
}

/**
 * Get interpretation by name from database
 */
export async function getInterpretation(name: string): Promise<InterpretationTree | null> {
  const result = await getInterpretationByName(name);
  
  if (!result) {
    return null;
  }
  
  return {
    name: [result.name],
    tree: result.tree as any,
  };
}

/**
 * Get evaluation by name from database
 */
export async function getEvaluation(name: string): Promise<Evaluation | null> {
  const result = await getEvaluationByName(name);
  
  if (!result) {
    return null;
  }
  
  return {
    evaliid: result.evaliid,
    evalname: result.evalname,
    evaldesc: result.evaldesc || '',
    evaluationtype: result.evaluationtype as 'Crisp' | 'Fuzzy' | 'Continuous',
    invertevaluationresults: result.invertevaluationresults || false,
    propname: result.propname,
    propmod: result.propmod || '',
    evalxml: result.evalxml || undefined,
    points: result.points || undefined,
    interpolation: result.interpolation as 'linear' | 'spline' | 'step' | undefined,
    crispExpression: result.crispExpression || undefined,
  };
}

/**
 * Get property by name from database
 */
export async function getProperty(name: string): Promise<Property | null> {
  const result = await getPropertyByName(name);
  
  if (!result) {
    return null;
  }
  
  return {
    propiid: result.propiid,
    propname: result.propname,
    propuom: result.propuom || undefined,
    propmin: result.propmin ? parseFloat(result.propmin) : undefined,
    propmax: result.propmax ? parseFloat(result.propmax) : undefined,
    propmod: result.propmod || '',
    dataafuse: result.dataafuse || false,
  };
}
