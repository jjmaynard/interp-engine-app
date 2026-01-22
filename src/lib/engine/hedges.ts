/**
 * Fuzzy Logic Hedge Functions
 * 
 * Implementation of hedge functions that modify fuzzy membership values.
 * Based on the R InterpretationEngine package's hedge.R
 * 
 * Hedges are modifiers that adjust the meaning of fuzzy sets
 */

/**
 * NOT hedge (fuzzy negation)
 * 
 * Returns 1 - x for each value
 * 
 * @param x - Input value or array of values
 * @returns Negated value(s) [0, 1]
 */
export function notHedge(x: number | number[]): number | number[] {
  if (Array.isArray(x)) {
    return x.map(v => (isNaN(v) ? NaN : 1 - v));
  }
  return isNaN(x) ? NaN : 1 - x;
}

/**
 * MULTIPLY hedge
 * 
 * Multiplies the input by a constant
 * 
 * @param x - Input value or array of values
 * @param multiplier - Multiplication factor
 * @returns Multiplied value(s)
 */
export function multiplyHedge(
  x: number | number[],
  multiplier: number
): number | number[] {
  if (Array.isArray(x)) {
    return x.map(v => (isNaN(v) ? NaN : v * multiplier));
  }
  return isNaN(x) ? NaN : x * multiplier;
}

/**
 * POWER hedge
 * 
 * Raises the input to a power
 * Used for concentration (power > 1) and dilation (power < 1)
 * 
 * @param x - Input value or array of values
 * @param power - Exponent
 * @returns Value(s) raised to power
 */
export function powerHedge(
  x: number | number[],
  power: number
): number | number[] {
  if (Array.isArray(x)) {
    return x.map(v => (isNaN(v) ? NaN : Math.pow(v, power)));
  }
  return isNaN(x) ? NaN : Math.pow(x, power);
}

/**
 * LIMIT hedge
 * 
 * Constrains values to [0, 1] range
 * 
 * @param x - Input value or array of values
 * @returns Bounded value(s) [0, 1]
 */
export function limitHedge(x: number | number[]): number | number[] {
  if (Array.isArray(x)) {
    return x.map(v => (isNaN(v) ? NaN : Math.max(0, Math.min(1, v))));
  }
  return isNaN(x) ? NaN : Math.max(0, Math.min(1, x));
}

/**
 * NULL OR hedge
 * 
 * If value is null/undefined/NaN, return 1, else return 0
 * Used for handling missing data in OR operations
 * 
 * @param x - Input value
 * @returns 1 if null, 0 otherwise
 */
export function nullOrHedge(x: number | null | undefined): number {
  if (x === null || x === undefined || isNaN(x)) {
    return 1;
  }
  return 0;
}

/**
 * NOT NULL AND hedge
 * 
 * If value is null/undefined/NaN, return 0, else return 1
 * Used for handling missing data in AND operations
 * 
 * @param x - Input value
 * @returns 0 if null, 1 otherwise
 */
export function notNullAndHedge(x: number | null | undefined): number {
  if (x === null || x === undefined || isNaN(x)) {
    return 0;
  }
  return 1;
}

/**
 * NULL NOT RATED hedge
 * 
 * If value is null/undefined, return NaN, else return 0
 * Used to propagate "not rated" status
 * 
 * @param x - Input value
 * @returns NaN if null, 0 otherwise
 */
export function nullNotRatedHedge(x: number | null | undefined): number {
  if (x === null || x === undefined || (typeof x === 'number' && isNaN(x))) {
    return NaN;
  }
  return 0;
}

/**
 * IS NULL check
 * 
 * Returns true if value is null/undefined/NaN
 * 
 * @param x - Input value
 * @returns true if null/undefined/NaN
 */
export function isNull(x: any): boolean {
  return x === null || x === undefined || (typeof x === 'number' && isNaN(x));
}

/**
 * Apply a hedge function based on hedge type string
 * 
 * @param hedge - Hedge type (NOT, MULTIPLY, POWER, LIMIT, etc.)
 * @param x - Input value or array
 * @param parameter - Optional parameter for hedges like MULTIPLY, POWER
 * @returns Result of applying hedge
 */
export function applyHedge(
  hedge: string,
  x: number | number[] | null | undefined,
  parameter?: number
): number | number[] {
  const h = hedge.toUpperCase();
  
  switch (h) {
    case 'NOT':
      if (x === null || x === undefined) return NaN;
      return notHedge(x);
    
    case 'MULTIPLY':
    case 'MULT':
      if (x === null || x === undefined) return NaN;
      if (parameter === undefined) {
        throw new Error('MULTIPLY hedge requires a parameter');
      }
      return multiplyHedge(x, parameter);
    
    case 'POWER':
      if (x === null || x === undefined) return NaN;
      if (parameter === undefined) {
        throw new Error('POWER hedge requires a parameter');
      }
      return powerHedge(x, parameter);
    
    case 'LIMIT':
      if (x === null || x === undefined) return NaN;
      return limitHedge(x);
    
    case 'NULL_OR':
    case 'NULLOR':
      return nullOrHedge(typeof x === 'number' ? x : undefined);
    
    case 'NOT_NULL_AND':
    case 'NOTNULLAND':
      return notNullAndHedge(typeof x === 'number' ? x : undefined);
    
    case 'NULL_NOT_RATED':
    case 'NULLNOTRATED':
      return nullNotRatedHedge(typeof x === 'number' ? x : undefined);
    
    default:
      console.warn(`Unknown hedge: ${hedge}, returning input unchanged`);
      return x ?? NaN;
  }
}

/**
 * Concentration hedge (VERY)
 * 
 * Squares the membership value to make it more restrictive
 * Equivalent to POWER hedge with parameter 2
 * 
 * @param x - Input value or array
 * @returns Concentrated value(s)
 */
export function veryHedge(x: number | number[]): number | number[] {
  return powerHedge(x, 2);
}

/**
 * Dilation hedge (SOMEWHAT)
 * 
 * Takes square root to make it less restrictive
 * Equivalent to POWER hedge with parameter 0.5
 * 
 * @param x - Input value or array
 * @returns Dilated value(s)
 */
export function somewhatHedge(x: number | number[]): number | number[] {
  return powerHedge(x, 0.5);
}

/**
 * Handle null values in array with specified strategy
 * 
 * @param values - Array of values that may contain null/NaN
 * @param strategy - How to handle nulls: 'remove', 'zero', 'one', 'propagate'
 * @returns Processed array
 */
export function handleNulls(
  values: (number | null | undefined)[],
  strategy: 'remove' | 'zero' | 'one' | 'propagate' = 'remove'
): number[] {
  switch (strategy) {
    case 'remove':
      return values.filter(
        v => v !== null && v !== undefined && !isNaN(v)
      ) as number[];
    
    case 'zero':
      return values.map(v =>
        v === null || v === undefined || isNaN(v) ? 0 : v
      );
    
    case 'one':
      return values.map(v =>
        v === null || v === undefined || isNaN(v) ? 1 : v
      );
    
    case 'propagate':
      // If any value is null/NaN, return array with single NaN
      const hasNull = values.some(v => v === null || v === undefined || isNaN(v));
      if (hasNull) {
        return [NaN];
      }
      return values as number[];
    
    default:
      return values.filter(
        v => v !== null && v !== undefined && !isNaN(v)
      ) as number[];
  }
}
