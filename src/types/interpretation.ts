/**
 * Core type definitions for NRCS Soil Interpretation Engine
 * Based on NASIS interpretation data structure
 */

/**
 * A point on an evaluation curve representing fuzzy membership
 * x = input value, y = fuzzy rating (0-1)
 */
export interface EvaluationPoint {
  x: number;
  y: number; // fuzzy rating 0-1
}

/**
 * Evaluation curve definition for converting property values to fuzzy ratings
 */
export interface Evaluation {
  propiid?: string;
  evaliid: number;
  evalname: string;
  evaldesc: string | null;
  eval: string; // XML string containing evaluation definition
  'dataafuse.x'?: boolean;
  evaluationtype: string; // 'Crisp', 'Fuzzy', 'Continuous'
  invertevaluationresults: boolean | null;
  propmod: string | null;
  propname: string;
  'dataafuse.y'?: boolean;
  // Parsed from eval XML
  points?: EvaluationPoint[];
  interpolation?: 'linear' | 'spline' | 'step';
  crispExpression?: string;
  domainPoints?: Record<string, number>; // For categorical evaluations
}

/**
 * Soil property definition
 */
export interface Property {
  propiid: string;
  propname: string;
  propuom?: string; // Unit of measure
  propmin?: number;
  propmax?: number;
  propmod: string;
  dataafuse: boolean;
}

/**
 * Node in the interpretation rule tree
 * Uses flat structure with indentation in levelName
 */
export interface RuleNode {
  levelName: string;
  Type?: string; // operator type: 'and', 'or', 'product', 'sum', 'times', etc.
  Value?: string; // hedge value
  RefId?: string; // reference to another rule or evaluation
  rule_refid?: string;
  children?: RuleNode[];
}

/**
 * Hierarchical rule node (after parsing flat tree)
 */
export interface HierarchicalRuleNode {
  name: string;
  type: 'rule' | 'operator' | 'hedge' | 'evaluation' | 'root';
  operator?: 'and' | 'or' | 'product' | 'sum' | 'times';
  hedge?: 'not' | 'limit' | 'multiply' | 'null_or' | 'not_null_and' | 'null_not_rated';
  value?: number;
  refId?: string;
  children: HierarchicalRuleNode[];
  depth: number;
}

/**
 * Complete interpretation tree with rules and properties
 */
export interface InterpretationTree {
  name: string[];
  tree: RuleNode[];
  properties?: Property[];
}

/**
 * Result from evaluating an interpretation
 */
export interface InterpretationResult {
  rating: number; // 0-1 fuzzy value
  ratingClass: 'not rated' | 'slight' | 'moderate' | 'severe' | 'very severe';
  propertyValues: Record<string, number | string | null>;
  evaluationResults: Record<string, number>;
  timestamp: Date;
}

/**
 * Summary information about an interpretation
 */
export interface InterpretationSummary {
  name: string;
  propertyCount: number;
  hasProperties: boolean;
}

/**
 * Operator type for fuzzy logic operations
 */
export type FuzzyOperator = 'and' | 'or' | 'product' | 'sum' | 'times';

/**
 * Hedge type for modifying fuzzy values
 */
export type FuzzyHedge = 'not' | 'limit' | 'multiply' | 'null_or' | 'not_null_and' | 'null_not_rated';

/**
 * Interpolation method for evaluation curves
 */
export type InterpolationType = 'linear' | 'spline' | 'step';

/**
 * Property value type (can be numeric, text, or null)
 */
export type PropertyValue = number | string | null;
