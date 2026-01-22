/**
 * Fuzzy Logic Operators
 * 
 * Implementation of fuzzy logic operators for combining evaluation results.
 * Based on the R InterpretationEngine package's hedge.R
 * 
 * All operators work with fuzzy membership values [0, 1]
 */

/**
 * Fuzzy AND (minimum operator)
 * 
 * Returns the minimum value from all inputs
 * Represents the intersection of fuzzy sets
 * 
 * @param values - Array of fuzzy membership values
 * @returns Minimum value [0, 1]
 */
export function fuzzyAnd(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Filter out NaN values
  const validValues = values.filter(v => !isNaN(v));
  if (validValues.length === 0) return NaN;
  
  return Math.min(...validValues);
}

/**
 * Fuzzy OR (maximum operator)
 * 
 * Returns the maximum value from all inputs
 * Represents the union of fuzzy sets
 * 
 * @param values - Array of fuzzy membership values
 * @returns Maximum value [0, 1]
 */
export function fuzzyOr(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Filter out NaN values
  const validValues = values.filter(v => !isNaN(v));
  if (validValues.length === 0) return NaN;
  
  return Math.max(...validValues);
}

/**
 * Fuzzy PRODUCT (algebraic product)
 * 
 * Returns the product of all input values
 * More sensitive to low values than fuzzy AND
 * 
 * @param values - Array of fuzzy membership values
 * @returns Product [0, 1]
 */
export function fuzzyProduct(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Filter out NaN values
  const validValues = values.filter(v => !isNaN(v));
  if (validValues.length === 0) return NaN;
  
  return validValues.reduce((product, value) => product * value, 1);
}

/**
 * Fuzzy SUM (algebraic sum)
 * 
 * Returns the algebraic sum: 1 - product(1 - x_i)
 * More sensitive to high values than fuzzy OR
 * 
 * @param values - Array of fuzzy membership values
 * @returns Sum [0, 1]
 */
export function fuzzySum(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Filter out NaN values
  const validValues = values.filter(v => !isNaN(v));
  if (validValues.length === 0) return NaN;
  
  // 1 - product(1 - x_i)
  const product = validValues.reduce((prod, value) => prod * (1 - value), 1);
  return 1 - product;
}

/**
 * Fuzzy TIMES (bounded product)
 * 
 * Returns max(0, sum(x_i) - (n-1))
 * where n is the number of values
 * 
 * @param values - Array of fuzzy membership values
 * @returns Bounded product [0, 1]
 */
export function fuzzyTimes(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Filter out NaN values
  const validValues = values.filter(v => !isNaN(v));
  if (validValues.length === 0) return NaN;
  
  const sum = validValues.reduce((acc, value) => acc + value, 0);
  return Math.max(0, sum - (validValues.length - 1));
}

/**
 * Apply a fuzzy operator based on operator type string
 * 
 * @param operator - Operator type (AND, OR, PRODUCT, SUM, TIMES)
 * @param values - Array of fuzzy membership values
 * @returns Result of applying operator [0, 1]
 */
export function applyOperator(
  operator: string,
  values: number[]
): number {
  const op = operator.toUpperCase();
  
  switch (op) {
    case 'AND':
    case 'MIN':
      return fuzzyAnd(values);
    
    case 'OR':
    case 'MAX':
      return fuzzyOr(values);
    
    case 'PRODUCT':
    case 'PROD':
      return fuzzyProduct(values);
    
    case 'SUM':
      return fuzzySum(values);
    
    case 'TIMES':
      return fuzzyTimes(values);
    
    default:
      console.warn(`Unknown operator: ${operator}, defaulting to AND`);
      return fuzzyAnd(values);
  }
}

/**
 * Weighted average of fuzzy values
 * 
 * @param values - Array of fuzzy membership values
 * @param weights - Array of weights (same length as values)
 * @returns Weighted average [0, 1]
 */
export function weightedAverage(
  values: number[],
  weights: number[]
): number {
  if (values.length === 0 || weights.length === 0) return 0;
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }
  
  // Filter out NaN values and their corresponding weights
  const validPairs = values
    .map((v, i) => ({ value: v, weight: weights[i] }))
    .filter(pair => !isNaN(pair.value));
  
  if (validPairs.length === 0) return NaN;
  
  const sumWeightedValues = validPairs.reduce(
    (sum, pair) => sum + pair.value * pair.weight,
    0
  );
  const sumWeights = validPairs.reduce(
    (sum, pair) => sum + pair.weight,
    0
  );
  
  return sumWeights > 0 ? sumWeightedValues / sumWeights : 0;
}
