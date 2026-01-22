/**
 * Tree Evaluator
 * 
 * Recursive evaluation of hierarchical rule trees for soil interpretations.
 * Based on the R InterpretationEngine package's interpret.R and tree_eval.R
 */

import type {
  RuleNode,
  InterpretationTree,
  InterpretationResult,
  Evaluation,
  Property,
} from '@/types/interpretation';
import { evaluateProperty } from './evaluations';
import { applyOperator } from './operators';
import { applyHedge } from './hedges';

/**
 * Property data input for evaluation
 * Keys are property names, values are the property values
 */
export type PropertyData = Record<string, number | string | null | undefined>;

/**
 * Evaluation context for tracking state during recursive evaluation
 */
interface EvaluationContext {
  propertyData: PropertyData;
  evaluations: Map<string, Evaluation>;
  properties: Map<string, Property>;
  debug: boolean;
}

/**
 * Result of evaluating a single node
 */
interface NodeEvaluationResult {
  rating: number;
  propertyValues?: Record<string, number | string | null>;
  evaluationResults?: Record<string, number>;
}

/**
 * Evaluate a rule tree node recursively
 * 
 * @param node - The node to evaluate
 * @param context - Evaluation context with property data and definitions
 * @returns Node evaluation result
 */
export function evaluateNode(
  node: RuleNode,
  context: EvaluationContext
): NodeEvaluationResult {
  const { propertyData, evaluations, properties, debug } = context;

  // Handle leaf nodes (evaluations)
  if (node.Type === 'Evaluation' && node.RefId) {
    const evaluation = evaluations.get(node.RefId);
    
    if (!evaluation) {
      if (debug) {
        console.warn(`Evaluation not found: ${node.RefId}`);
      }
      return { rating: NaN };
    }

    // Get the property this evaluation uses
    const property = properties.get(evaluation.propiid || '');
    
    if (!property) {
      if (debug) {
        console.warn(`Property not found for evaluation: ${evaluation.evalname}`);
      }
      return { rating: NaN };
    }

    // Get the property value from input data
    const propertyName = property.propname;
    const propertyValue = propertyData[propertyName];

    if (debug) {
      console.log(`Evaluating: ${evaluation.evalname} (${propertyName} = ${propertyValue})`);
    }

    // Evaluate the property
    const rating = evaluateProperty(propertyValue, evaluation);

    return {
      rating,
      propertyValues: { [propertyName]: propertyValue ?? null },
      evaluationResults: { [evaluation.evalname]: rating },
    };
  }

  // Handle operator nodes (AND, OR, PRODUCT, etc.)
  if (node.Type === 'Operator' && node.Value) {
    if (!node.children || node.children.length === 0) {
      if (debug) {
        console.warn(`Operator node has no children: ${node.Value}`);
      }
      return { rating: NaN };
    }

    // Recursively evaluate all children
    const childResults = node.children.map(child => evaluateNode(child, context));
    const childRatings = childResults.map(r => r.rating);

    // Apply the operator
    const rating = applyOperator(node.Value, childRatings);

    // Merge property values and evaluation results
    const propertyValues: Record<string, number | string | null> = {};
    const evaluationResults: Record<string, number> = {};

    for (const result of childResults) {
      if (result.propertyValues) {
        Object.assign(propertyValues, result.propertyValues);
      }
      if (result.evaluationResults) {
        Object.assign(evaluationResults, result.evaluationResults);
      }
    }

    if (debug) {
      console.log(`Operator ${node.Value}: ${childRatings.join(', ')} => ${rating}`);
    }

    return { rating, propertyValues, evaluationResults };
  }

  // Handle hedge nodes (NOT, MULTIPLY, etc.)
  if (node.Type === 'Hedge' && node.Value) {
    if (!node.children || node.children.length === 0) {
      if (debug) {
        console.warn(`Hedge node has no children: ${node.Value}`);
      }
      return { rating: NaN };
    }

    // Evaluate the child (hedges typically have one child)
    const childResult = evaluateNode(node.children[0], context);

    // Parse hedge parameter if present (e.g., "MULTIPLY 0.5")
    const hedgeParts = node.Value.split(/\s+/);
    const hedgeType = hedgeParts[0];
    const hedgeParam = hedgeParts.length > 1 ? parseFloat(hedgeParts[1]) : undefined;

    // Apply the hedge
    const rating = applyHedge(hedgeType, childResult.rating, hedgeParam) as number;

    if (debug) {
      console.log(`Hedge ${node.Value}: ${childResult.rating} => ${rating}`);
    }

    return {
      rating,
      propertyValues: childResult.propertyValues,
      evaluationResults: childResult.evaluationResults,
    };
  }

  // Handle rule nodes (aggregation of children)
  if (node.Type === 'Rule' || node.levelName) {
    if (!node.children || node.children.length === 0) {
      if (debug) {
        console.warn(`Rule node has no children: ${node.levelName}`);
      }
      return { rating: NaN };
    }

    // Recursively evaluate all children
    const childResults = node.children.map(child => evaluateNode(child, context));

    // For rule nodes, typically use the first (and often only) child's rating
    const rating = childResults[0].rating;

    // Merge property values and evaluation results
    const propertyValues: Record<string, number | string | null> = {};
    const evaluationResults: Record<string, number> = {};

    for (const result of childResults) {
      if (result.propertyValues) {
        Object.assign(propertyValues, result.propertyValues);
      }
      if (result.evaluationResults) {
        Object.assign(evaluationResults, result.evaluationResults);
      }
    }

    if (debug) {
      console.log(`Rule ${node.levelName}: => ${rating}`);
    }

    return { rating, propertyValues, evaluationResults };
  }

  // Unknown node type
  if (debug) {
    console.warn(`Unknown node type:`, node);
  }
  return { rating: NaN };
}

/**
 * Lookup rating class based on rating value
 * 
 * @param rating - Numeric rating value [0, 1]
 * @returns Rating class string (e.g., "Not suited", "Moderately suited", "Well suited")
 */
export function lookupRatingClass(rating: number): 'not rated' | 'slight' | 'moderate' | 'severe' | 'very severe' {
  if (isNaN(rating)) {
    return 'not rated';
  }

  // Standard NRCS rating classes
  // Map fuzzy values to standard NRCS limitation classes
  if (rating <= 0.1) return 'slight';
  if (rating <= 0.3) return 'moderate';
  if (rating <= 0.6) return 'severe';
  return 'very severe';
}

/**
 * Evaluate an interpretation tree with property data
 * 
 * @param tree - Interpretation tree definition
 * @param propertyData - Input property values
 * @param evaluations - Map of evaluation definitions
 * @param properties - Map of property definitions
 * @param debug - Enable debug logging
 * @returns Interpretation result
 */
export function evaluateInterpretation(
  tree: InterpretationTree,
  propertyData: PropertyData,
  evaluations: Map<string, Evaluation>,
  properties: Map<string, Property>,
  debug: boolean = false
): InterpretationResult {
  if (!tree.tree || tree.tree.length === 0) {
    return {
      rating: NaN,
      ratingClass: 'not rated',
      propertyValues: {},
      evaluationResults: {},
      timestamp: new Date(),
    };
  }

  const context: EvaluationContext = {
    propertyData,
    evaluations,
    properties,
    debug,
  };

  // Evaluate the root node
  const result = evaluateNode(tree.tree[0], context);

  return {
    rating: result.rating,
    ratingClass: lookupRatingClass(result.rating),
    propertyValues: result.propertyValues || {},
    evaluationResults: result.evaluationResults || {},
    timestamp: new Date(),
  };
}

/**
 * Batch evaluate an interpretation tree with multiple property data records
 * 
 * @param tree - Interpretation tree definition
 * @param propertyDataArray - Array of input property value records
 * @param evaluations - Map of evaluation definitions
 * @param properties - Map of property definitions
 * @param debug - Enable debug logging
 * @returns Array of interpretation results
 */
export function batchEvaluateInterpretation(
  tree: InterpretationTree,
  propertyDataArray: PropertyData[],
  evaluations: Map<string, Evaluation>,
  properties: Map<string, Property>,
  debug: boolean = false
): InterpretationResult[] {
  return propertyDataArray.map(propertyData =>
    evaluateInterpretation(tree, propertyData, evaluations, properties, debug)
  );
}

/**
 * Get required properties for an interpretation
 * 
 * @param tree - Interpretation tree definition
 * @param evaluations - Map of evaluation definitions
 * @param properties - Map of property definitions
 * @returns Array of required property names
 */
export function getRequiredProperties(
  tree: InterpretationTree,
  evaluations: Map<string, Evaluation>,
  properties: Map<string, Property>
): string[] {
  const propertyNames = new Set<string>();

  function traverseNode(node: RuleNode) {
    if (node.Type === 'Evaluation' && node.RefId) {
      const evaluation = evaluations.get(node.RefId);
      if (evaluation && evaluation.propiid) {
        const property = properties.get(evaluation.propiid);
        if (property) {
          propertyNames.add(property.propname);
        }
      }
    }

    if (node.children) {
      node.children.forEach(child => traverseNode(child));
    }
  }

  if (tree.tree && tree.tree.length > 0) {
    traverseNode(tree.tree[0]);
  }

  return Array.from(propertyNames);
}
