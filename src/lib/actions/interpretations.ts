/**
 * Server Actions for Soil Interpretation Engine
 * 
 * These are server-side functions that can be called directly from client components
 * without needing API routes.
 */

'use server';

import { getDefaultEngine } from '@/lib/engine';
import type { PropertyData } from '@/lib/engine/evaluator';
import type { InterpretationResult, InterpretationTree, Property } from '@/types/interpretation';

/**
 * Server action response wrapper
 */
interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Evaluate an interpretation with property data
 * 
 * @param interpretationName - Name of the interpretation to evaluate
 * @param propertyData - Property values for evaluation
 * @returns Interpretation result
 */
export async function evaluateInterpretation(
  interpretationName: string,
  propertyData: PropertyData
): Promise<ActionResponse<InterpretationResult>> {
  try {
    // Validate inputs
    if (!interpretationName || typeof interpretationName !== 'string') {
      return {
        success: false,
        error: 'Invalid interpretation name',
      };
    }

    if (!propertyData || typeof propertyData !== 'object') {
      return {
        success: false,
        error: 'Invalid property data',
      };
    }

    // Get engine and evaluate
    const engine = await getDefaultEngine();
    const result = await engine.evaluate(interpretationName, propertyData);

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    console.error('Server action error - evaluateInterpretation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Evaluation failed',
    };
  }
}

/**
 * Batch evaluate an interpretation with multiple property data records
 * 
 * @param interpretationName - Name of the interpretation to evaluate
 * @param propertyDataArray - Array of property value records
 * @returns Array of interpretation results
 */
export async function batchEvaluateInterpretation(
  interpretationName: string,
  propertyDataArray: PropertyData[]
): Promise<ActionResponse<InterpretationResult[]>> {
  try {
    // Validate inputs
    if (!interpretationName || typeof interpretationName !== 'string') {
      return {
        success: false,
        error: 'Invalid interpretation name',
      };
    }

    if (!Array.isArray(propertyDataArray)) {
      return {
        success: false,
        error: 'Property data must be an array',
      };
    }

    if (propertyDataArray.length === 0) {
      return {
        success: false,
        error: 'Property data array cannot be empty',
      };
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 1000;
    if (propertyDataArray.length > MAX_BATCH_SIZE) {
      return {
        success: false,
        error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`,
      };
    }

    // Get engine and evaluate
    const engine = await getDefaultEngine();
    const results = await engine.batchEvaluate(interpretationName, propertyDataArray);

    return {
      success: true,
      data: results,
    };

  } catch (error) {
    console.error('Server action error - batchEvaluateInterpretation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Batch evaluation failed',
    };
  }
}

/**
 * Get all available interpretations
 * 
 * @returns List of available interpretations
 */
export async function getAvailableInterpretations(): Promise<
  ActionResponse<Array<{ name: string; propertyCount: number }>>
> {
  try {
    const engine = await getDefaultEngine();
    const interpretations = await engine.getAvailableInterpretations();

    const formatted = interpretations.map(interp => ({
      name: interp.rulename || 'Unknown',
      propertyCount: interp.properties?.length || 0,
    }));

    return {
      success: true,
      data: formatted,
    };

  } catch (error) {
    console.error('Server action error - getAvailableInterpretations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch interpretations',
    };
  }
}

/**
 * Get required properties for an interpretation
 * 
 * @param interpretationName - Name of the interpretation
 * @returns List of required properties
 */
export async function getRequiredProperties(
  interpretationName: string
): Promise<ActionResponse<Property[]>> {
  try {
    if (!interpretationName || typeof interpretationName !== 'string') {
      return {
        success: false,
        error: 'Invalid interpretation name',
      };
    }

    const engine = await getDefaultEngine();
    const properties = await engine.getRequiredProperties(interpretationName);

    return {
      success: true,
      data: properties,
    };

  } catch (error) {
    console.error('Server action error - getRequiredProperties:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch properties',
    };
  }
}

/**
 * Get interpretation tree details
 * 
 * @param interpretationName - Name of the interpretation
 * @returns Interpretation tree
 */
export async function getInterpretationTree(
  interpretationName: string
): Promise<ActionResponse<InterpretationTree>> {
  try {
    if (!interpretationName || typeof interpretationName !== 'string') {
      return {
        success: false,
        error: 'Invalid interpretation name',
      };
    }

    const engine = await getDefaultEngine();
    const trees = await engine.getAvailableInterpretations();
    const tree = trees.find(t => 
      t.rulename === interpretationName
    );

    if (!tree) {
      return {
        success: false,
        error: `Interpretation not found: ${interpretationName}`,
      };
    }

    return {
      success: true,
      data: tree,
    };

  } catch (error) {
    console.error('Server action error - getInterpretationTree:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch interpretation tree',
    };
  }
}

/**
 * Clear the engine cache
 * 
 * @returns Success status
 */
export async function clearEngineCache(): Promise<ActionResponse<{ cleared: boolean }>> {
  try {
    const engine = await getDefaultEngine();
    engine.clearCache();

    return {
      success: true,
      data: { cleared: true },
    };

  } catch (error) {
    console.error('Server action error - clearEngineCache:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache',
    };
  }
}

/**
 * Get engine cache statistics
 * 
 * @returns Cache statistics
 */
export async function getCacheStats(): Promise<
  ActionResponse<{
    interpretations: boolean;
    evaluations: boolean;
    properties: boolean;
    ttlMinutes: number;
  }>
> {
  try {
    const engine = await getDefaultEngine();
    const stats = engine.getCacheStats();

    return {
      success: true,
      data: {
        interpretations: stats.isCached.interpretations,
        evaluations: stats.isCached.evaluations,
        properties: stats.isCached.properties,
        ttlMinutes: Math.floor(stats.cacheTTL / 1000 / 60),
      },
    };

  } catch (error) {
    console.error('Server action error - getCacheStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache stats',
    };
  }
}
