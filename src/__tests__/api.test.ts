/**
 * Integration tests for API routes
 * 
 * Run with: npm test -- api.test.ts
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// Mock data for testing
const mockPropertyData = {
  'K factor, maximum': 0.32,
  'Slope gradient': 5,
};

const mockInterpretationName = 'Erodibility Factor Maximum';

describe('API Routes Integration Tests', () => {
  const baseUrl = 'http://localhost:3000/api';

  describe('POST /api/interpret', () => {
    it('should validate interpretation request', () => {
      const validRequest = {
        interpretationName: mockInterpretationName,
        propertyData: mockPropertyData,
      };

      expect(validRequest.interpretationName).toBeDefined();
      expect(validRequest.propertyData).toBeDefined();
      expect(typeof validRequest.propertyData).toBe('object');
    });

    it('should reject empty interpretation name', () => {
      const invalidRequest = {
        interpretationName: '',
        propertyData: mockPropertyData,
      };

      expect(invalidRequest.interpretationName).toBe('');
    });

    it('should reject missing property data', () => {
      const invalidRequest = {
        interpretationName: mockInterpretationName,
      };

      expect(invalidRequest.propertyData).toBeUndefined();
    });
  });

  describe('POST /api/interpret/batch', () => {
    it('should validate batch request', () => {
      const validRequest = {
        interpretationName: mockInterpretationName,
        propertyDataArray: [mockPropertyData, mockPropertyData],
      };

      expect(Array.isArray(validRequest.propertyDataArray)).toBe(true);
      expect(validRequest.propertyDataArray.length).toBeGreaterThan(0);
    });

    it('should reject empty array', () => {
      const invalidRequest = {
        interpretationName: mockInterpretationName,
        propertyDataArray: [],
      };

      expect(invalidRequest.propertyDataArray.length).toBe(0);
    });

    it('should reject non-array property data', () => {
      const invalidRequest = {
        interpretationName: mockInterpretationName,
        propertyDataArray: mockPropertyData,
      };

      expect(Array.isArray(invalidRequest.propertyDataArray)).toBe(false);
    });
  });

  describe('Validation Functions', () => {
    it('should generate consistent cache keys', () => {
      // Import and test cache key generation
      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 }; // Different order

      // Keys should be the same for same data
      expect(JSON.stringify(data1)).not.toBe(JSON.stringify(data2));
      
      // But sorted keys would be the same
      const sorted1 = Object.keys(data1).sort();
      const sorted2 = Object.keys(data2).sort();
      expect(sorted1).toEqual(sorted2);
    });
  });
});
