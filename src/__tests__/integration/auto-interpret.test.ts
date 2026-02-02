/**
 * Integration Tests for Auto Interpretation Endpoint
 * 
 * Tests the complete workflow: MUKEY → Property Calculation → Interpretation Evaluation
 */

describe('Auto Interpretation API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000';
  const testMukey = '462809';
  const testInterpretation = 'AGR - Pesticide Loss Potential-Soil Surface Runoff';

  describe('POST /api/interpret/auto', () => {
    it('should auto-evaluate interpretation from mukey', async () => {
      const response = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Check success
      expect(result.success).toBe(true);
      
      // Check result structure
      expect(result.result).toBeDefined();
      expect(result.result.rating).toBeDefined();
      expect(result.result.rating).toBeGreaterThanOrEqual(0);
      expect(result.result.rating).toBeLessThanOrEqual(1);
      expect(result.result.ratingClass).toBeDefined();
      
      // Check metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.mukey).toBe(testMukey);
      expect(result.metadata.interpretationName).toBe(testInterpretation);
      expect(result.metadata.propertyCalculation).toBeDefined();
      expect(result.metadata.evaluatedAt).toBeDefined();
      
      // Check property calculation metadata
      const propMetadata = result.metadata.propertyCalculation;
      expect(propMetadata.total_properties).toBeGreaterThan(0);
      expect(propMetadata.execution_time_ms).toBeDefined();
    }, 15000); // Allow up to 15s for first uncached call

    it('should handle non-existent interpretation', async () => {
      const response = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: 'Non-Existent Interpretation',
          mukey: testMukey,
        }),
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle invalid mukey', async () => {
      const response = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: '999999999',
        }),
      });

      // Should either succeed with empty/null values or return error
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should validate request body', async () => {
      // Missing mukey
      const response1 = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
        }),
      });

      expect(response1.status).toBe(400);

      // Missing interpretation name
      const response2 = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mukey: testMukey,
        }),
      });

      expect(response2.status).toBe(400);

      // Invalid mukey format
      const response3 = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: 'abc123', // Should be numeric
        }),
      });

      expect(response3.status).toBe(400);
    });

    it('should be faster on cached requests', async () => {
      // First call - uncached
      const start1 = Date.now();
      const response1 = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });
      const time1 = Date.now() - start1;

      expect(response1.ok).toBe(true);

      // Second call - should hit cache
      const start2 = Date.now();
      const response2 = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });
      const time2 = Date.now() - start2;

      expect(response2.ok).toBe(true);

      // Cached request should be significantly faster
      expect(time2).toBeLessThan(time1);
      expect(time2).toBeLessThan(1000); // Should be < 1s cached
    }, 30000);

    it('should handle property calculation failures gracefully', async () => {
      // Use interpretation that requires many properties
      const complexInterpretation = 'AGR - Soil Quality Index';
      
      const response = await fetch(`${baseUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: complexInterpretation,
          mukey: testMukey,
        }),
      });

      // Should either succeed or provide meaningful error
      if (response.ok) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.result.rating).toBeDefined();
      } else {
        const error = await response.json();
        expect(error.error).toBeDefined();
        expect(error.details).toBeDefined();
      }
    }, 20000);
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const interpretations = [
        'AGR - Pesticide Loss Potential-Soil Surface Runoff',
        'FOR - Hand Planting Suitability',
        'URB - Dwellings Without Basements',
      ];

      for (const interp of interpretations) {
        const start = Date.now();
        const response = await fetch(`${baseUrl}/api/interpret/auto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interpretationName: interp,
            mukey: testMukey,
          }),
        });
        const duration = Date.now() - start;

        expect(response.ok).toBe(true);
        
        // First uncached call: should be < 6s
        // Cached calls: should be < 1s
        expect(duration).toBeLessThan(6000);
        
        console.log(`${interp}: ${duration}ms`);
      }
    }, 60000);
  });
});
