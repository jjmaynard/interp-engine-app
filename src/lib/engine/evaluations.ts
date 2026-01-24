/**
 * Evaluation Functions
 * 
 * Implementation of various evaluation curve types for soil interpretations.
 * Based on the R InterpretationEngine package's EvaluationCurves.R
 * 
 * Each evaluation type converts a property value to a fuzzy membership value [0, 1]
 */

import type { Evaluation, EvaluationPoint } from '@/types/interpretation';

/**
 * Linear interpolation between evaluation points
 * 
 * @param x - Input property value
 * @param points - Array of evaluation points (x, y) pairs
 * @param invert - Invert the result (1 - y)
 * @returns Fuzzy membership value [0, 1]
 */
export function linearInterpolation(
  x: number,
  points: EvaluationPoint[],
  invert: boolean = false
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) {
    const result = points[0].y;
    return invert ? 1 - result : result;
  }

  // Sort points by x value
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Handle out of bounds
  if (x <= sorted[0].x) {
    const result = sorted[0].y;
    return invert ? 1 - result : result;
  }
  if (x >= sorted[sorted.length - 1].x) {
    const result = sorted[sorted.length - 1].y;
    return invert ? 1 - result : result;
  }

  // Find the two points to interpolate between
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (x >= p1.x && x <= p2.x) {
      // Linear interpolation: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      const result = p1.y + (x - p1.x) * slope;
      return invert ? 1 - result : result;
    }
  }

  return 0;
}

/**
 * Step function evaluation (piecewise constant)
 * 
 * @param x - Input property value
 * @param points - Array of evaluation points (x, y) pairs
 * @param invert - Invert the result (1 - y)
 * @returns Fuzzy membership value [0, 1]
 */
export function stepFunction(
  x: number,
  points: EvaluationPoint[],
  invert: boolean = false
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) {
    const result = points[0].y;
    return invert ? 1 - result : result;
  }

  // Sort points by x value
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Handle out of bounds
  if (x < sorted[0].x) {
    const result = sorted[0].y;
    return invert ? 1 - result : result;
  }
  if (x >= sorted[sorted.length - 1].x) {
    const result = sorted[sorted.length - 1].y;
    return invert ? 1 - result : result;
  }

  // Find the appropriate step
  for (let i = 0; i < sorted.length - 1; i++) {
    if (x >= sorted[i].x && x < sorted[i + 1].x) {
      const result = sorted[i].y;
      return invert ? 1 - result : result;
    }
  }

  return 0;
}

/**
 * Cubic spline interpolation
 * 
 * Uses natural cubic spline interpolation for smooth curves
 * 
 * @param x - Input property value
 * @param points - Array of evaluation points (x, y) pairs
 * @param invert - Invert the result (1 - y)
 * @param bounded - Constrain results to [0, 1]
 * @returns Fuzzy membership value [0, 1]
 */
export function splineInterpolation(
  x: number,
  points: EvaluationPoint[],
  invert: boolean = false,
  bounded: boolean = true
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) {
    const result = points[0].y;
    return invert ? 1 - result : result;
  }
  if (points.length === 2) {
    // Fall back to linear for 2 points
    return linearInterpolation(x, points, invert);
  }

  // Sort points by x value
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Handle out of bounds
  if (x <= sorted[0].x) {
    const result = sorted[0].y;
    return invert ? 1 - result : result;
  }
  if (x >= sorted[sorted.length - 1].x) {
    const result = sorted[sorted.length - 1].y;
    return invert ? 1 - result : result;
  }

  // Build natural cubic spline
  const spline = buildNaturalCubicSpline(sorted);

  // Find the segment
  for (let i = 0; i < spline.length; i++) {
    const segment = spline[i];
    if (x >= segment.x0 && x <= segment.x1) {
      const dx = x - segment.x0;
      let result = 
        segment.a +
        segment.b * dx +
        segment.c * dx * dx +
        segment.d * dx * dx * dx;

      // Bound to [0, 1] if requested
      if (bounded) {
        result = Math.max(0, Math.min(1, result));
      }

      return invert ? 1 - result : result;
    }
  }

  return 0;
}

/**
 * Build natural cubic spline coefficients
 * Internal helper for splineInterpolation
 */
interface SplineSegment {
  x0: number;
  x1: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function buildNaturalCubicSpline(points: EvaluationPoint[]): SplineSegment[] {
  const n = points.length - 1;
  const h: number[] = [];
  const alpha: number[] = [];

  // Calculate intervals
  for (let i = 0; i < n; i++) {
    h[i] = points[i + 1].x - points[i].x;
  }

  // Calculate alpha coefficients
  for (let i = 1; i < n; i++) {
    alpha[i] =
      (3 / h[i]) * (points[i + 1].y - points[i].y) -
      (3 / h[i - 1]) * (points[i].y - points[i - 1].y);
  }

  // Solve tridiagonal system
  const l: number[] = new Array(n + 1);
  const mu: number[] = new Array(n + 1);
  const z: number[] = new Array(n + 1);

  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;

  for (let i = 1; i < n; i++) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[n] = 1;
  z[n] = 0;

  // Calculate coefficients
  const c: number[] = new Array(n + 1);
  const b: number[] = new Array(n);
  const d: number[] = new Array(n);

  c[n] = 0;

  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (points[j + 1].y - points[j].y) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Build segments
  const segments: SplineSegment[] = [];
  for (let i = 0; i < n; i++) {
    segments.push({
      x0: points[i].x,
      x1: points[i + 1].x,
      a: points[i].y,
      b: b[i],
      c: c[i],
      d: d[i],
    });
  }

  return segments;
}

/**
 * Categorical evaluation
 * 
 * @param x - Input property value (string or number)
 * @param categories - Map of category values to fuzzy membership
 * @param invert - Invert the result
 * @returns Fuzzy membership value [0, 1]
 */
export function categoricalEvaluation(
  x: string | number,
  categories: Map<string | number, number>,
  invert: boolean = false
): number {
  const result = categories.get(x) ?? 0;
  return invert ? 1 - result : result;
}

/**
 * Sigmoid curve evaluation
 * 
 * @param x - Input property value
 * @param center - Center point of sigmoid
 * @param width - Width of transition zone
 * @param invert - Invert the result
 * @returns Fuzzy membership value [0, 1]
 */
export function sigmoidEvaluation(
  x: number,
  center: number,
  width: number,
  invert: boolean = false
): number {
  // Sigmoid: 1 / (1 + exp(-k * (x - center)))
  // k is determined by width
  const k = 4 / width; // Transition occurs over width interval
  const result = 1 / (1 + Math.exp(-k * (x - center)));
  return invert ? 1 - result : result;
}

/**
 * Crisp (boolean) evaluation
 * 
 * @param condition - Boolean condition result
 * @param invert - Invert the result
 * @returns 0 or 1
 */
export function crispEvaluation(
  condition: boolean,
  invert: boolean = false
): number {
  const result = condition ? 1 : 0;
  return invert ? 1 - result : result;
}

/**
 * Evaluate using an Evaluation definition
 * 
 * @param x - Input property value
 * @param evaluation - Evaluation definition from NASIS
 * @returns Fuzzy membership value [0, 1]
 */
export function evaluateProperty(
  x: number | string | null | undefined,
  evaluation: Evaluation
): number {
  // Handle null/undefined values
  if (x === null || x === undefined) {
    console.warn('[evaluateProperty] Property value is null/undefined for:', evaluation.evalname);
    return NaN;
  }

  const { interpolation, points, invertevaluationresults } = evaluation;
  const invert = invertevaluationresults === true;

  console.log('[evaluateProperty] Evaluating:', {
    evalname: evaluation.evalname,
    propertyValue: x,
    interpolation,
    pointsCount: points?.length || 0,
    invert,
    hasPoints: !!points
  });

  // Handle numeric evaluations
  if (typeof x === 'number' && points && points.length > 0) {
    let result: number;
    switch (interpolation?.toLowerCase()) {
      case 'linear':
      case 'arbitrarylinear':
        result = linearInterpolation(x, points, invert);
        break;
      
      case 'step':
      case 'crisp':
        result = stepFunction(x, points, invert);
        break;
      
      case 'spline':
      case 'arbitrarycurve':
        result = splineInterpolation(x, points, invert);
        break;
      
      case 'sigmoid':
        if (points.length >= 2) {
          const center = (points[0].x + points[1].x) / 2;
          const width = Math.abs(points[1].x - points[0].x);
          result = sigmoidEvaluation(x, center, width, invert);
        } else {
          result = linearInterpolation(x, points, invert);
        }
        break;
      
      default:
        // Default to linear interpolation
        result = linearInterpolation(x, points, invert);
        break;
    }
    
    console.log('[evaluateProperty] Result:', result);
    return result;
  }

  // Handle categorical/crisp evaluations
  if (typeof x === 'string' && evaluation.crispExpression) {
    // Parse crisp expression like: ="moderately well" or = "excessively" or "somewhat excessively"
    const expr = evaluation.crispExpression.trim();
    
    // Handle simple equality: ="value"
    const simpleMatch = expr.match(/^=\s*"([^"]+)"$/);
    if (simpleMatch) {
      const result = x === simpleMatch[1] ? 1 : 0;
      console.log('[evaluateProperty] Crisp result:', {
        expression: expr,
        inputValue: x,
        targetValue: simpleMatch[1],
        result
      });
      return result;
    }
    
    // Handle OR expressions: = "value1" or "value2"
    const orMatch = expr.match(/^=\s*"([^"]+)"\s+or\s+"([^"]+)"$/);
    if (orMatch) {
      const result = (x === orMatch[1] || x === orMatch[2]) ? 1 : 0;
      console.log('[evaluateProperty] Crisp OR result:', {
        expression: expr,
        inputValue: x,
        matches: result === 1
      });
      return result;
    }
    
    console.warn('[evaluateProperty] Unsupported crisp expression format:', expr);
    return 0;
  }
  
  if (typeof x === 'string' && evaluation.evalname) {
    console.warn('[evaluateProperty] Categorical evaluation without crispExpression:', evaluation.evalname);
    // For now, return 0 for categorical - will need category mapping
    return 0;
  }

  console.warn('[evaluateProperty] No points or invalid input type for:', evaluation.evalname, 'x:', x, 'type:', typeof x);
  return 0;
}
