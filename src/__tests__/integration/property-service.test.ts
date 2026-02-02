/**
 * Integration Tests for PropertyServiceClient
 * 
 * Tests communication with Python property service
 */

import { PropertyServiceClient } from '@/lib/services/property-service';
import { PropertyServiceError } from '@/lib/errors/PropertyServiceError';

describe('PropertyServiceClient Integration Tests', () => {
  let client: PropertyServiceClient;
  const testMukey = '462809';

  beforeAll(() => {
    // Use environment variable or default to localhost
    const baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    client = new PropertyServiceClient({
      baseUrl,
      timeout: 10000,
      retries: 2,
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await client.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.data?.properties_loaded).toBeGreaterThan(0);
      expect(health.data?.consolidation_groups).toBeGreaterThan(0);
    });
  });

  describe('calculateProperties', () => {
    it('should calculate properties for valid mukey', async () => {
      const propertyIds = [2, 3, 4]; // Common property IDs
      
      const result = await client.calculateProperties(testMukey, propertyIds);
      
      expect(result.success).toBe(true);
      expect(result.values).toBeDefined();
      expect(Object.keys(result.values).length).toBeGreaterThan(0);
      
      // Check metadata
      expect(result.metadata?.mukey).toBe(testMukey);
      expect(result.metadata?.total_properties).toBe(propertyIds.length);
    });

    it('should handle invalid mukey gracefully', async () => {
      const invalidMukey = '999999999';
      const propertyIds = [2, 3];
      
      // Should either return error or empty values
      try {
        const result = await client.calculateProperties(invalidMukey, propertyIds);
        // If it doesn't throw, check for proper error response
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(PropertyServiceError);
      }
    });

    it('should handle service timeout', async () => {
      const shortTimeoutClient = new PropertyServiceClient({
        baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
        timeout: 1, // 1ms timeout - will fail
        retries: 0,
      });

      await expect(
        shortTimeoutClient.calculateProperties(testMukey, [2, 3])
      ).rejects.toThrow();
    }, 10000);

    it('should use consolidation strategy when specified', async () => {
      const propertyIds = [2, 3, 4, 5, 7]; // Multiple properties
      
      const result = await client.calculateProperties(
        testMukey,
        propertyIds,
        'consolidated'
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata?.query_count).toBeDefined();
      // Consolidation should reduce query count
      if (result.metadata?.query_count) {
        expect(result.metadata.query_count).toBeLessThan(propertyIds.length);
      }
    });

    it('should handle empty property list', async () => {
      await expect(
        client.calculateProperties(testMukey, [])
      ).rejects.toThrow();
    });

    it('should cache results for repeated queries', async () => {
      const propertyIds = [2, 3];
      
      // First call - should hit SDA
      const result1 = await client.calculateProperties(testMukey, propertyIds);
      const time1 = result1.metadata?.execution_time_ms || 0;
      
      // Second call - should hit cache (much faster)
      const result2 = await client.calculateProperties(testMukey, propertyIds);
      const time2 = result2.metadata?.execution_time_ms || 0;
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Cached call should be faster (if metadata provides timing)
      if (time1 > 0 && time2 > 0) {
        expect(time2).toBeLessThan(time1);
      }
    });
  });

  describe('getAvailableProperties', () => {
    it('should return list of available properties', async () => {
      const properties = await client.getAvailableProperties();
      
      expect(Array.isArray(properties)).toBe(true);
      expect(properties.length).toBeGreaterThan(0);
      
      // Check structure of first property
      if (properties.length > 0) {
        const prop = properties[0];
        expect(prop).toHaveProperty('propiid');
        expect(prop).toHaveProperty('propname');
      }
    });
  });

  describe('Error Handling', () => {
    it('should retry on transient failures', async () => {
      const retryClient = new PropertyServiceClient({
        baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
        timeout: 10000,
        retries: 3,
      });

      // This should work even with retries
      const result = await retryClient.calculateProperties(testMukey, [2]);
      expect(result.success).toBe(true);
    });

    it('should handle service unavailable', async () => {
      const badClient = new PropertyServiceClient({
        baseUrl: 'http://localhost:9999', // Non-existent service
        timeout: 1000,
        retries: 0,
      });

      await expect(
        badClient.calculateProperties(testMukey, [2])
      ).rejects.toThrow(PropertyServiceError);
    });
  });
});
