/**
 * Database Queries for NRCS Soil Interpretation Engine
 * Replaces JSON data loaders with database queries
 */

import { eq, and, inArray, sql } from 'drizzle-orm';
import { getDb } from './client';
import { 
  interpretations, 
  evaluations, 
  properties,
  categories,
  interpretationProperties,
  interpretationEvaluations,
  evaluationResultsCache,
  type Interpretation,
  type Evaluation,
  type Property,
  type Category,
} from './schema';
import type { RuleNode } from '@/types/interpretation';

const db = getDb();

/**
 * Get all interpretations with their categories
 */
export async function getAllInterpretations() {
  const results = await db
    .select({
      id: interpretations.id,
      interpid: interpretations.interpid,
      name: interpretations.name,
      categoryId: interpretations.categoryId,
      categoryName: categories.name,
      treeStructure: interpretations.treeStructure,
      createdAt: interpretations.createdAt,
      updatedAt: interpretations.updatedAt,
    })
    .from(interpretations)
    .leftJoin(categories, eq(interpretations.categoryId, categories.id))
    .orderBy(interpretations.name);
  
  return results;
}

/**
 * Get interpretation by name
 */
export async function getInterpretationByName(name: string) {
  const [result] = await db
    .select()
    .from(interpretations)
    .where(eq(interpretations.name, name))
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  // Parse tree structure
  const treeStructure = result.treeStructure as RuleNode[];
  
  return {
    ...result,
    tree: treeStructure,
  };
}

/**
 * Get interpretation by ID
 */
export async function getInterpretationById(id: number) {
  const [result] = await db
    .select()
    .from(interpretations)
    .where(eq(interpretations.id, id))
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  const treeStructure = result.treeStructure as RuleNode[];
  
  return {
    ...result,
    tree: treeStructure,
  };
}

/**
 * Get required properties for an interpretation
 */
export async function getInterpretationProperties(interpretationId: number) {
  const results = await db
    .select({
      id: properties.id,
      propiid: properties.propiid,
      propname: properties.propname,
      propuom: properties.propuom,
      propmin: properties.propmin,
      propmax: properties.propmax,
      propmod: properties.propmod,
      dataafuse: properties.dataafuse,
      required: interpretationProperties.required,
    })
    .from(interpretationProperties)
    .innerJoin(properties, eq(interpretationProperties.propertyId, properties.id))
    .where(eq(interpretationProperties.interpretationId, interpretationId))
    .orderBy(properties.propname);
  
  return results;
}

/**
 * Get required properties by interpretation name
 */
export async function getPropertiesByInterpretationName(interpretationName: string) {
  const interpretation = await getInterpretationByName(interpretationName);
  
  if (!interpretation) {
    return [];
  }
  
  return getInterpretationProperties(interpretation.id);
}

/**
 * Get all evaluations
 */
export async function getAllEvaluations() {
  const results = await db
    .select()
    .from(evaluations)
    .orderBy(evaluations.evalname);
  
  return results.map(evaluation => ({
    ...evaluation,
    points: evaluation.points ? JSON.parse(evaluation.points as string) : null,
  }));
}

/**
 * Get evaluation by name
 */
export async function getEvaluationByName(name: string) {
  const [result] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.evalname, name))
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  return {
    ...result,
    points: result.points ? JSON.parse(result.points as string) : null,
  };
}

/**
 * Get evaluations for an interpretation
 */
export async function getInterpretationEvaluations(interpretationId: number) {
  const results = await db
    .select({
      id: evaluations.id,
      evaliid: evaluations.evaliid,
      evalname: evaluations.evalname,
      evaldesc: evaluations.evaldesc,
      evaluationtype: evaluations.evaluationtype,
      invertevaluationresults: evaluations.invertevaluationresults,
      propname: evaluations.propname,
      propmod: evaluations.propmod,
      evalxml: evaluations.evalxml,
      points: evaluations.points,
      interpolation: evaluations.interpolation,
      crispExpression: evaluations.crispExpression,
    })
    .from(interpretationEvaluations)
    .innerJoin(evaluations, eq(interpretationEvaluations.evaluationId, evaluations.id))
    .where(eq(interpretationEvaluations.interpretationId, interpretationId))
    .orderBy(evaluations.evalname);
  
  return results.map(evaluation => ({
    ...evaluation,
    points: evaluation.points ? JSON.parse(evaluation.points as string) : null,
  }));
}

/**
 * Get all properties
 */
export async function getAllProperties() {
  const results = await db
    .select()
    .from(properties)
    .orderBy(properties.propname);
  
  return results;
}

/**
 * Get property by name
 */
export async function getPropertyByName(name: string) {
  const [result] = await db
    .select()
    .from(properties)
    .where(eq(properties.propname, name))
    .limit(1);
  
  return result || null;
}

/**
 * Get all categories
 */
export async function getAllCategories() {
  const results = await db
    .select()
    .from(categories)
    .orderBy(categories.name);
  
  return results;
}

/**
 * Cache evaluation result
 */
export async function cacheEvaluationResult(
  interpretationId: number,
  propertyDataHash: string,
  propertyData: Record<string, number | string | null>,
  result: {
    fuzzyValue: number;
    ratingClass: string;
    ratingValue?: number;
    limitationClass?: string;
    evaluationResults?: Record<string, number>;
  }
) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute TTL
  
  await db
    .insert(evaluationResultsCache)
    .values({
      interpretationId,
      propertyDataHash,
      propertyData: JSON.stringify(propertyData),
      fuzzyValue: result.fuzzyValue.toString(),
      ratingClass: result.ratingClass,
      ratingValue: result.ratingValue?.toString() || null,
      limitationClass: result.limitationClass || null,
      evaluationResults: result.evaluationResults ? JSON.stringify(result.evaluationResults) : null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [evaluationResultsCache.interpretationId, evaluationResultsCache.propertyDataHash],
      set: {
        fuzzyValue: result.fuzzyValue.toString(),
        ratingClass: result.ratingClass,
        ratingValue: result.ratingValue?.toString() || null,
        limitationClass: result.limitationClass || null,
        evaluationResults: result.evaluationResults ? JSON.stringify(result.evaluationResults) : null,
        expiresAt,
      },
    });
}

/**
 * Get cached evaluation result
 */
export async function getCachedEvaluationResult(
  interpretationId: number,
  propertyDataHash: string
) {
  const [result] = await db
    .select()
    .from(evaluationResultsCache)
    .where(
      and(
        eq(evaluationResultsCache.interpretationId, interpretationId),
        eq(evaluationResultsCache.propertyDataHash, propertyDataHash),
        sql`${evaluationResultsCache.expiresAt} > NOW()`
      )
    )
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  return {
    fuzzyValue: parseFloat(result.fuzzyValue),
    ratingClass: result.ratingClass,
    ratingValue: result.ratingValue ? parseFloat(result.ratingValue) : undefined,
    limitationClass: result.limitationClass || undefined,
    evaluationResults: result.evaluationResults 
      ? JSON.parse(result.evaluationResults as string)
      : undefined,
  };
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache() {
  const result = await db
    .delete(evaluationResultsCache)
    .where(sql`${evaluationResultsCache.expiresAt} <= NOW()`)
    .returning({ id: evaluationResultsCache.id });
  
  return result.length;
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics() {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      expired: sql<number>`count(*) filter (where ${evaluationResultsCache.expiresAt} <= NOW())`,
      valid: sql<number>`count(*) filter (where ${evaluationResultsCache.expiresAt} > NOW())`,
    })
    .from(evaluationResultsCache);
  
  return stats;
}
