/**
 * Interpretation Engine
 * 
 * Main class for evaluating NRCS soil interpretations using fuzzy logic.
 * Based on the R InterpretationEngine package.
 */

import type {
  InterpretationTree,
  Evaluation,
  Property,
  InterpretationResult,
} from '@/types/interpretation';
import {
  evaluateInterpretation,
  batchEvaluateInterpretation,
  getRequiredProperties,
  type PropertyData,
} from './evaluator';
import { dataCache } from '@/lib/data/cache';
import { enhanceProperties } from './propertyUtils';

/**
 * Configuration options for InterpretationEngine
 */
export interface InterpretationEngineConfig {
  /**
   * Enable debug logging during evaluation
   */
  debug?: boolean;

  /**
   * Custom evaluations data (overrides cached data)
   */
  evaluations?: Evaluation[];

  /**
   * Custom properties data (overrides cached data)
   */
  properties?: Property[];
}

/**
 * Main Interpretation Engine class
 * 
 * Provides methods for evaluating soil interpretations using fuzzy logic
 */
export class InterpretationEngine {
  private config: InterpretationEngineConfig;
  private evaluationsMap: Map<string, Evaluation>;
  private propertiesMap: Map<string, Property>;

  constructor(config: InterpretationEngineConfig = {}) {
    this.config = config;
    this.evaluationsMap = new Map();
    this.propertiesMap = new Map();
  }

  /**
   * Initialize the engine by loading evaluation and property data
   */
  async initialize(): Promise<void> {
    // Use custom data if provided, otherwise load from cache
    const evaluations = this.config.evaluations || (await dataCache.getEvaluations());
    const properties = this.config.properties || (await dataCache.getProperties());

    // Build lookup maps
    for (const evaluation of evaluations) {
      if (evaluation.evaliid) {
        this.evaluationsMap.set(String(evaluation.evaliid), evaluation);
      }
      if (evaluation.evalname) {
        this.evaluationsMap.set(evaluation.evalname, evaluation);
      }
    }

    for (const property of properties) {
      if (property.propiid) {
        this.propertiesMap.set(property.propiid, property);
      }
      if (property.propname) {
        this.propertiesMap.set(property.propname, property);
      }
    }

    if (this.config.debug) {
      console.log(`Loaded ${evaluations.length} evaluations and ${properties.length} properties`);
    }
  }

  /**
   * Evaluate a single interpretation with property data
   * 
   * @param interpretationName - Name of interpretation to evaluate
   * @param propertyData - Input property values
   * @returns Interpretation result
   */
  async evaluate(
    interpretationName: string,
    propertyData: PropertyData
  ): Promise<InterpretationResult> {
    // Get the interpretation tree
    const tree = await this.getInterpretationTree(interpretationName);

    if (!tree) {
      throw new Error(`Interpretation not found: ${interpretationName}`);
    }

    // Evaluate
    return evaluateInterpretation(
      tree,
      propertyData,
      this.evaluationsMap,
      this.propertiesMap,
      this.config.debug
    );
  }

  /**
   * Batch evaluate an interpretation with multiple property data records
   * 
   * @param interpretationName - Name of interpretation to evaluate
   * @param propertyDataArray - Array of input property value records
   * @returns Array of interpretation results
   */
  async batchEvaluate(
    interpretationName: string,
    propertyDataArray: PropertyData[]
  ): Promise<InterpretationResult[]> {
    // Get the interpretation tree
    const tree = await this.getInterpretationTree(interpretationName);

    if (!tree) {
      throw new Error(`Interpretation not found: ${interpretationName}`);
    }

    // Batch evaluate
    return batchEvaluateInterpretation(
      tree,
      propertyDataArray,
      this.evaluationsMap,
      this.propertiesMap,
      this.config.debug
    );
  }

  /**
   * Get required properties for an interpretation with categorical metadata
   * 
   * @param interpretationName - Name of interpretation
   * @returns Array of required property names and definitions
   */
  async getRequiredProperties(
    interpretationName: string
  ): Promise<Property[]> {
    const tree = await this.getInterpretationTree(interpretationName);

    if (!tree) {
      throw new Error(`Interpretation not found: ${interpretationName}`);
    }

    const propertyNames = getRequiredProperties(
      tree,
      this.evaluationsMap,
      this.propertiesMap
    );

    const properties = propertyNames
      .map(name => this.propertiesMap.get(name))
      .filter((prop): prop is Property => prop !== undefined);

    // Enhance properties with categorical metadata (choices, etc.)
    const evaluations = Array.from(this.evaluationsMap.values());
    return enhanceProperties(properties, evaluations);
  }

  /**
   * Get the rule tree for an interpretation
   * 
   * @param interpretationName - Name of interpretation
   * @returns Rule tree array
   */
  async getRuleTree(interpretationName: string): Promise<any[]> {
    const tree = await this.getInterpretationTree(interpretationName);

    if (!tree) {
      throw new Error(`Interpretation not found: ${interpretationName}`);
    }

    // Handle both array and object tree formats
    if (Array.isArray(tree.tree)) {
      return tree.tree;
    } else if (tree.tree && typeof tree.tree === 'object') {
      // tree.tree is the root node object - wrap it in an array
      return [tree.tree];
    }
    
    return [];
  }

  /**
   * Get interpretation tree by name
   * 
   * @param name - Interpretation name
   * @returns Interpretation tree or null if not found
   */
  private async getInterpretationTree(
    name: string
  ): Promise<InterpretationTree | null> {
    const trees = await dataCache.getInterpretationTrees();
    return trees.find(t => Array.isArray(t.name) ? t.name[0] === name : t.name === name) || null;
  }

  /**
   * Get all available interpretations
   * 
   * @returns Array of interpretation trees
   */
  async getAvailableInterpretations(): Promise<InterpretationTree[]> {
    return await dataCache.getInterpretationTrees();
  }

  /**
   * Get evaluation by ID or name
   * 
   * @param idOrName - Evaluation ID or name
   * @returns Evaluation or undefined if not found
   */
  getEvaluation(idOrName: string): Evaluation | undefined {
    return this.evaluationsMap.get(idOrName);
  }

  /**
   * Get property by ID or name
   * 
   * @param idOrName - Property ID or name
   * @returns Property or undefined if not found
   */
  getProperty(idOrName: string): Property | undefined {
    return this.propertiesMap.get(idOrName);
  }

  /**
   * Clear the engine's cache
   */
  clearCache(): void {
    dataCache.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return dataCache.getCacheStats();
  }
}

/**
 * Create and initialize a new InterpretationEngine instance
 * 
 * @param config - Engine configuration
 * @returns Initialized InterpretationEngine
 */
export async function createInterpretationEngine(
  config: InterpretationEngineConfig = {}
): Promise<InterpretationEngine> {
  const engine = new InterpretationEngine(config);
  await engine.initialize();
  return engine;
}

/**
 * Singleton instance for convenience
 */
let defaultEngineInstance: InterpretationEngine | null = null;

/**
 * Get the default InterpretationEngine instance (singleton)
 * Automatically initializes on first call
 * 
 * @returns Default InterpretationEngine instance
 */
export async function getDefaultEngine(): Promise<InterpretationEngine> {
  if (!defaultEngineInstance) {
    defaultEngineInstance = await createInterpretationEngine();
  }
  return defaultEngineInstance;
}

/**
 * Reset the default engine instance
 * Useful for testing or when configuration changes
 */
export function resetDefaultEngine(): void {
  defaultEngineInstance = null;
}
