/**
 * Basic tests for Interpretation Engine core functions
 * 
 * Run with: npm test
 */

import {
  linearInterpolation,
  stepFunction,
  splineInterpolation,
} from '@/lib/engine/evaluations';
import {
  fuzzyAnd,
  fuzzyOr,
  fuzzyProduct,
  fuzzySum,
} from '@/lib/engine/operators';
import {
  notHedge,
  powerHedge,
  limitHedge,
} from '@/lib/engine/hedges';

describe('Evaluation Functions', () => {
  describe('linearInterpolation', () => {
    it('should interpolate between two points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 1 },
      ];
      
      expect(linearInterpolation(0, points)).toBe(0);
      expect(linearInterpolation(5, points)).toBe(0.5);
      expect(linearInterpolation(10, points)).toBe(1);
    });

    it('should handle out of bounds values', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 1 },
      ];
      
      expect(linearInterpolation(-5, points)).toBe(0);
      expect(linearInterpolation(15, points)).toBe(1);
    });

    it('should invert when requested', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 1 },
      ];
      
      expect(linearInterpolation(0, points, true)).toBe(1);
      expect(linearInterpolation(10, points, true)).toBe(0);
    });

    it('should handle unsorted points', () => {
      const points = [
        { x: 10, y: 1 },
        { x: 0, y: 0 },
        { x: 5, y: 0.5 },
      ];
      
      expect(linearInterpolation(5, points)).toBe(0.5);
    });
  });

  describe('stepFunction', () => {
    it('should return constant values in intervals', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 0.5 },
        { x: 10, y: 1 },
      ];
      
      expect(stepFunction(2, points)).toBe(0);
      expect(stepFunction(7, points)).toBe(0.5);
      expect(stepFunction(12, points)).toBe(1);
    });
  });

  describe('splineInterpolation', () => {
    it('should smoothly interpolate through points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 1 },
        { x: 10, y: 0 },
      ];
      
      const result = splineInterpolation(5, points);
      expect(result).toBeCloseTo(1, 1);
    });

    it('should be bounded to [0, 1] when requested', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 2 }, // Out of bounds value
        { x: 10, y: 0 },
      ];
      
      const result = splineInterpolation(5, points, false, true);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Fuzzy Operators', () => {
  describe('fuzzyAnd', () => {
    it('should return minimum value', () => {
      expect(fuzzyAnd([0.3, 0.7, 0.5])).toBe(0.3);
      expect(fuzzyAnd([1, 1, 1])).toBe(1);
      expect(fuzzyAnd([0, 0.5, 1])).toBe(0);
    });

    it('should handle NaN values', () => {
      expect(fuzzyAnd([0.5, NaN, 0.7])).toBe(0.5);
      expect(isNaN(fuzzyAnd([NaN, NaN]))).toBe(true);
    });
  });

  describe('fuzzyOr', () => {
    it('should return maximum value', () => {
      expect(fuzzyOr([0.3, 0.7, 0.5])).toBe(0.7);
      expect(fuzzyOr([1, 1, 1])).toBe(1);
      expect(fuzzyOr([0, 0.5, 1])).toBe(1);
    });
  });

  describe('fuzzyProduct', () => {
    it('should return product of values', () => {
      expect(fuzzyProduct([0.5, 0.5])).toBe(0.25);
      expect(fuzzyProduct([1, 1, 1])).toBe(1);
      expect(fuzzyProduct([0, 0.5])).toBe(0);
    });
  });

  describe('fuzzySum', () => {
    it('should return algebraic sum', () => {
      const result = fuzzySum([0.5, 0.5]);
      expect(result).toBeCloseTo(0.75, 2);
    });

    it('should be greater than or equal to fuzzyOr', () => {
      const values = [0.3, 0.4, 0.5];
      expect(fuzzySum(values)).toBeGreaterThanOrEqual(fuzzyOr(values));
    });
  });
});

describe('Hedge Functions', () => {
  describe('notHedge', () => {
    it('should negate values', () => {
      expect(notHedge(0)).toBe(1);
      expect(notHedge(1)).toBe(0);
      expect(notHedge(0.3)).toBeCloseTo(0.7, 2);
    });

    it('should work with arrays', () => {
      const result = notHedge([0, 0.5, 1]) as number[];
      expect(result).toEqual([1, 0.5, 0]);
    });
  });

  describe('powerHedge', () => {
    it('should raise values to power', () => {
      expect(powerHedge(0.5, 2)).toBe(0.25);
      expect(powerHedge(0.5, 0.5)).toBeCloseTo(0.707, 2);
    });
  });

  describe('limitHedge', () => {
    it('should constrain values to [0, 1]', () => {
      expect(limitHedge(1.5)).toBe(1);
      expect(limitHedge(-0.5)).toBe(0);
      expect(limitHedge(0.5)).toBe(0.5);
    });
  });
});
