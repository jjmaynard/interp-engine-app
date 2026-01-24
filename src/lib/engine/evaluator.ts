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
  node: RuleNode | any,
  context: EvaluationContext
): NodeEvaluationResult {
  const { propertyData, evaluations, properties, debug } = context;

  if (!node) {
    console.warn('[Evaluator] Node is null or undefined');
    return { rating: NaN };
  }

  // Handle evaluation nodes (has RefId or rule_refid, but no Type or non-operator Type)
  // In hierarchical format, evaluation nodes have RefId but may or may not have Type
  const isEvaluationNode = (node.RefId || node.rule_refid) && !isOperatorType(node.Type) && !isHedgeType(node.Type);
  
  if (isEvaluationNode || node.Type === 'Evaluation') {
    const refId = node.RefId || node.rule_refid;
    const evaluation = evaluations.get(String(refId));
    
    if (!evaluation) {
      console.warn(`[Evaluator] Evaluation not found for RefId: ${refId}`);
      return { rating: NaN };
    }

    if (debug) {
      console.log(`[Evaluator] Found evaluation: ${evaluation.evalname}`);
    }

    // Get the property this evaluation uses
    const property = properties.get(evaluation.propname);
    
    if (!property) {
      console.warn(`[Evaluator] Property not found for evaluation: ${evaluation.evalname} (propname: "${evaluation.propname}")`);
      return { rating: NaN };
    }

    // Get the property value from input data
    const propertyName = property.propname;
    const propertyValue = propertyData[propertyName];

    if (debug) {
      console.log(`[Evaluator] Evaluating: ${evaluation.evalname} (${propertyName} = ${propertyValue})`);
    }

    // Evaluate the property
    const rating = evaluateProperty(propertyValue, evaluation);

    // Store result by both evaluation name AND evaliid for tree visualization
    const evaluationResults: Record<string, number> = {
      [evaluation.evalname]: rating
    };
    
    // Also store by evaliid (as string) for tree node lookup
    if (evaluation.evaliid) {
      evaluationResults[String(evaluation.evaliid)] = rating;
    }

    return {
      rating,
      propertyValues: { [propertyName]: propertyValue ?? null },
      evaluationResults,
    };
  }

  // Handle operator nodes (and, or, product, sum, etc.)
  const operatorTypes = ['and', 'or', 'product', 'sum', 'times', 'add', 'multiply', 'divide', 
                         'subtract', 'minus', 'plus', 'average', 'limit', 'power', 'weight',
                         'not_null_and', 'alpha'];
  
  if (node.Type && operatorTypes.includes(node.Type.toLowerCase())) {
    if (!node.children || node.children.length === 0) {
      if (debug) {
        console.warn(`Operator node has no children: ${node.Type}`);
      }
      return { rating: NaN };
    }

    // Recursively evaluate all children
    const childResults = node.children.map((child: any) => evaluateNode(child, context));
    const childRatings = childResults.map((r: NodeEvaluationResult) => r.rating);

    // Apply the operator
    const rating = applyOperator(node.Type, childRatings);

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
      console.log(`Operator ${node.Type}: ${childRatings.join(', ')} => ${rating}`);
    }

    return { rating, propertyValues, evaluationResults };
  }

  // Handle hedge nodes (not, very, slightly, somewhat, extremely, null_or, null_not_rated, etc.)
  const hedgeTypes = ['not', 'very', 'slightly', 'somewhat', 'extremely', 
                      'null_or', 'null_not_rated'];
  
  if (node.Type && hedgeTypes.includes(node.Type.toLowerCase())) {
    if (!node.children || node.children.length === 0) {
      if (debug) {
        console.warn(`Hedge node has no children: ${node.Type}`);
      }
      return { rating: NaN };
    }

    // Evaluate the child (hedges typically have one child)
    const childResult = evaluateNode(node.children[0], context);

    // Apply the hedge (use Value if present, otherwise just the Type)
    const hedgeValue = node.Value || node.Type;
    const rating = applyHedge(node.Type, childResult.rating, node.Value ? parseFloat(node.Value) : undefined) as number;

    if (debug) {
      console.log(`Hedge ${node.Type}: ${childResult.rating} => ${rating}`);
    }

    return {
      rating,
      propertyValues: childResult.propertyValues,
      evaluationResults: childResult.evaluationResults,
    };
  }

  // Handle nodes with children but no Type (container/rule nodes)
  if (node.children && node.children.length > 0) {
    // Recursively evaluate all children
    const childResults = node.children.map((child: any) => evaluateNode(child, context));

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
      console.log(`Container node (${node.name}): => ${rating}`);
    }

    return { rating, propertyValues, evaluationResults };
  }

  // Leaf node with no children and no RefId - might be a placeholder or metadata node
  if (debug) {
    console.warn(`Unknown/unhandled node:`, { name: node.name, Type: node.Type, RefId: node.RefId });
  }
  return { rating: NaN };
}

// Helper functions to identify node types
function isOperatorType(type: string | undefined): boolean {
  if (!type) return false;
  const operatorTypes = ['and', 'or', 'product', 'sum', 'times', 'add', 'multiply', 'divide', 
                         'subtract', 'minus', 'plus', 'average', 'limit', 'power', 'weight',
                         'not_null_and', 'alpha', 'Operator'];
  return operatorTypes.includes(type.toLowerCase()) || type === 'Operator';
}

function isHedgeType(type: string | undefined): boolean {
  if (!type) return false;
  const hedgeTypes = ['not', 'very', 'slightly', 'somewhat', 'extremely', 
                      'null_or', 'null_not_rated', 'Hedge'];
  return hedgeTypes.includes(type.toLowerCase()) || type === 'Hedge';
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
  console.log('[Evaluator] Tree object:', {
    hasTreeProperty: !!tree.tree,
    treeName: tree.name,
    treeType: typeof tree.tree,
    isArray: Array.isArray(tree.tree)
  });
  
  // Handle different tree structures:
  // 1. tree.tree is an object (single root node) - the new hierarchical format
  // 2. tree.tree is an array - old flat format
  // 3. tree itself is an array
  let rootNode: RuleNode;
  
  if (tree.tree) {
    if (Array.isArray(tree.tree)) {
      // Old format: array of nodes
      if (tree.tree.length === 0) {
        console.warn('[Evaluator] Tree array is empty!');
        return {
          rating: NaN,
          ratingClass: 'not rated',
          propertyValues: {},
          evaluationResults: {},
          timestamp: new Date(),
        };
      }
      rootNode = tree.tree[0];
      console.log('[Evaluator] Using tree array format with', tree.tree.length, 'nodes');
    } else if (typeof tree.tree === 'object') {
      // New format: tree.tree is the root node object
      rootNode = tree.tree as RuleNode;
      console.log('[Evaluator] Using hierarchical tree format with root node:', (rootNode as any).name);
    } else {
      console.warn('[Evaluator] tree.tree has unexpected type:', typeof tree.tree);
      return {
        rating: NaN,
        ratingClass: 'not rated',
        propertyValues: {},
        evaluationResults: {},
        timestamp: new Date(),
      };
    }
  } else if (Array.isArray(tree)) {
    console.warn('[Evaluator] tree parameter is an array, not an InterpretationTree object');
    rootNode = (tree as any)[0];
  } else if ((tree as any).treeStructure) {
    console.warn('[Evaluator] Found treeStructure property instead of tree');
    rootNode = (tree as any).treeStructure;
  } else {
    console.warn('[Evaluator] Tree is empty or invalid!');
    console.warn('[Evaluator] tree object keys:', Object.keys(tree));
    return {
      rating: NaN,
      ratingClass: 'not rated',
      propertyValues: {},
      evaluationResults: {},
      timestamp: new Date(),
    };
  }

  console.log('[Evaluator] Starting evaluation with root node');

  const context: EvaluationContext = {
    propertyData,
    evaluations,
    properties,
    debug,
  };

  // Evaluate the root node
  const result = evaluateNode(rootNode, context);

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

  function traverseNode(node: RuleNode | any) {
    // Check if this node references an evaluation
    if (node.RefId || node.rule_refid) {
      const refId = node.RefId || node.rule_refid;
      const evaluation = evaluations.get(String(refId));
      if (evaluation) {
        // Try to get property by name first (more reliable)
        if (evaluation.propname) {
          const property = properties.get(evaluation.propname);
          if (property) {
            propertyNames.add(property.propname);
          }
        }
      }
    }

    // Also check Type === 'Evaluation' pattern
    if (node.Type === 'Evaluation' && node.RefId) {
      const evaluation = evaluations.get(node.RefId);
      if (evaluation && evaluation.propname) {
        const property = properties.get(evaluation.propname);
        if (property) {
          propertyNames.add(property.propname);
        }
      }
    }

    if (node.children) {
      node.children.forEach((child: any) => traverseNode(child));
    }
  }

  // Handle different tree structures:
  // 1. tree.tree is an object (single root node with children)
  // 2. tree.tree is an array
  // 3. tree itself is an array
  if (tree.tree) {
    if (Array.isArray(tree.tree)) {
      tree.tree.forEach((node: RuleNode) => traverseNode(node));
    } else if (typeof tree.tree === 'object') {
      // tree.tree is the root node object
      traverseNode(tree.tree);
    }
  } else if (Array.isArray(tree)) {
    (tree as any[]).forEach((node: RuleNode) => traverseNode(node));
  }

  return Array.from(propertyNames);
}
